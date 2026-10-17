import { MEDIA_MAX_BYTES, MEDIA_MAX_INPUT_BYTES, MEDIA_RULES, type MediaKind, type OwnerBusiness, type SiteImage } from '@bookpage/shared';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { Icon } from '../../site/parts';
import { api, ApiError, uploadImage } from './api';

type Phase = { kind: 'idle' } | { kind: 'preparing' } | { kind: 'uploading'; progress: number } | { kind: 'error'; message: string };

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

/**
 * One image slot: logo, cover, a service or team photo, or "add to gallery".
 * The browser resizes and re-encodes the photo first (smaller uploads, no
 * camera metadata such as GPS), then uploads with progress. Replace and remove
 * are always one tap away; failures keep the photo so Retry works.
 */
export function ImageSlot(props: {
  kind: MediaKind;
  image: SiteImage | null;
  label: string;
  onBiz: (b: OwnerBusiness) => void;
  targetId?: string | undefined;
  /** Why the slot can't take a photo yet ("Saving the service…"). */
  blocked?: string | undefined;
  /** Gallery "add" tile: resets after each upload instead of showing the photo. */
  adder?: boolean;
  shape?: 'square' | 'wide' | 'portrait' | 'logo';
  hint?: boolean;
}) {
  const rule = MEDIA_RULES[props.kind];
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [local, setLocal] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const pending = useRef<{ blob: Blob; width: number; height: number } | null>(null);

  useEffect(() => () => { if (local) URL.revokeObjectURL(local); }, [local]);

  const send = async () => {
    const file = pending.current;
    if (!file) return;
    setPhase({ kind: 'uploading', progress: 0 });
    try {
      const biz = await uploadImage(file.blob, { kind: props.kind, targetId: props.targetId, width: file.width, height: file.height },
        (progress) => setPhase({ kind: 'uploading', progress }));
      pending.current = null;
      props.onBiz(biz);
      setPhase({ kind: 'idle' });
      if (props.adder) setLocal(null);
    } catch (error) {
      setPhase({ kind: 'error', message: error instanceof ApiError ? error.message : "Couldn't upload that image." });
    }
  };

  const choose = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MEDIA_MAX_INPUT_BYTES) return setPhase({ kind: 'error', message: 'That file is over 25 MB. Choose a smaller photo.' });
    if (file.type && !file.type.startsWith('image/')) return setPhase({ kind: 'error', message: 'Choose a photo: JPG, PNG or WebP.' });
    setPhase({ kind: 'preparing' });
    try {
      pending.current = await prepare(file, rule.maxEdge, props.kind === 'logo');
    } catch {
      const heic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
      return setPhase({ kind: 'error', message: heic ? "This browser can't read HEIC photos. Export it as JPG, or set your camera to 'Most compatible'." : "We couldn't read that file. Try a JPG or PNG." });
    }
    setLocal(URL.createObjectURL(pending.current.blob));
    await send();
  };

  const remove = async () => {
    if (!props.image) return;
    setPhase({ kind: 'preparing' });
    try {
      props.onBiz(await api('DELETE', `/business/media/${props.image.id}`));
      setLocal(null);
      setPhase({ kind: 'idle' });
    } catch (error) {
      setPhase({ kind: 'error', message: error instanceof ApiError ? error.message : "Couldn't remove it. Try again." });
    }
  };

  const busy = phase.kind === 'preparing' || phase.kind === 'uploading';
  const shown = props.adder ? (busy || phase.kind === 'error' ? local : null) : (local && (busy || phase.kind === 'error') ? local : props.image?.url ?? local);
  const blocked = props.blocked;
  const pick = () => !blocked && !busy && input.current?.click();

  return (
    <div class="ob-img" data-shape={props.shape ?? 'wide'} data-state={phase.kind} data-dragging={dragging || undefined}>
      <input ref={input} id={id} type="file" accept={ACCEPT} class="ob-sr" disabled={!!blocked || busy}
        aria-describedby={`${id}-hint`}
        onChange={(e) => { void choose(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} />
      <div class="ob-img-frame"
        onDragOver={(e) => { if (!blocked) { e.preventDefault(); setDragging(true); } }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void choose(e.dataTransfer?.files[0]); }}>
        {shown ? (
          <img key={shown} class="ob-img-photo" src={shown} alt={`${rule.label} preview`} />
        ) : (
          <label for={id} class="ob-img-empty" aria-disabled={!!blocked || undefined}>
            <Icon name="plus" size={22} />
            <span>{blocked ?? props.label}</span>
          </label>
        )}
        {phase.kind === 'uploading' && (
          <span class="ob-img-bar" role="progressbar" aria-label={`Uploading ${rule.label.toLowerCase()}`} aria-valuenow={Math.round(phase.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ transform: `scaleX(${Math.max(0.04, phase.progress)})` }} />
          </span>
        )}
        {phase.kind === 'preparing' && <span class="ob-img-note mono">Preparing…</span>}
        {phase.kind === 'uploading' && phase.progress >= 1 && <span class="ob-img-note mono">Saving…</span>}
      </div>
      <div class="ob-img-actions">
        {shown && !props.adder && !busy && (
          <>
            <button type="button" class="ob-link" onClick={pick}>Replace</button>
            {props.image && <button type="button" class="ob-link" onClick={() => void remove()}>Remove</button>}
          </>
        )}
        {phase.kind === 'error' && pending.current && <button type="button" class="ob-link" onClick={() => void send()}>Retry</button>}
      </div>
      {phase.kind === 'error'
        ? <p class="ob-error" role="alert">{phase.message}</p>
        : props.hint !== false && <p class="ob-hint" id={`${id}-hint`}>{rule.guidance}</p>}
    </div>
  );
}

/** Resize to `maxEdge`, re-encode (WebP, or JPEG/PNG where WebP encoding isn't supported), drop metadata. */
async function prepare(file: File, maxEdge: number, keepAlpha: boolean): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string, quality?: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  for (const quality of [0.86, 0.72, 0.6]) {
    let blob = await encode('image/webp', quality);
    if (!blob || blob.type !== 'image/webp') blob = await encode(keepAlpha ? 'image/png' : 'image/jpeg', quality);
    if (blob && blob.size <= MEDIA_MAX_BYTES) return { blob, width, height };
  }
  throw new Error('Too large after resizing');
}

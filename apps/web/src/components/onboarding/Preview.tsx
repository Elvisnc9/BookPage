import type { ComponentChildren } from 'preact';
import { memo } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { SiteModel } from '../../site/model';
import { Icon } from '../../site/parts';
import { rendererFor } from '../../site/registry';
import { Site } from '../../site/Site';

export type Device = 'desktop' | 'phone';
const WIDTH: Record<Device, number> = { desktop: 1280, phone: 390 };

/**
 * Draws children on a fixed-width canvas (a real desktop or phone width, so the
 * template's container queries pick the right layout) scaled to fit the space
 * it's given. Height follows the scaled content unless `aspect` clips it.
 */
export function Scaled(props: { width: number; aspect?: string; children: ComponentChildren; class?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 0, height: 0, left: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const available = outer.current.clientWidth;
      const scale = Math.min(1, available / props.width);
      setBox({ scale, height: inner.current.offsetHeight * scale, left: Math.max(0, (available - props.width * scale) / 2) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer.current!);
    ro.observe(inner.current!);
    return () => ro.disconnect();
  }, [props.width]);

  return (
    <div ref={outer} class={`ob-scaled ${props.class ?? ''}`} style={props.aspect ? { aspectRatio: props.aspect } : { height: `${box.height}px` }}>
      <div ref={inner} class="ob-scaled-in" style={{ width: `${props.width}px`, transform: `translateX(${box.left}px) scale(${box.scale})`, visibility: box.scale ? 'visible' : 'hidden' }}>
        {props.children}
      </div>
    </div>
  );
}

/** Same value, at most every `ms` (trailing), so typing doesn't re-render the page preview on every key. */
export function useThrottled<T>(value: T, ms: number): T {
  const [shown, setShown] = useState(value);
  const last = useRef(0);
  useEffect(() => {
    const wait = Math.max(0, last.current + ms - Date.now());
    const timer = setTimeout(() => { last.current = Date.now(); setShown(value); }, wait);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return shown;
}

/** The template itself, inert (a picture of the page, not a second copy to tab through). */
const Canvas = memo(function Canvas(props: { site: SiteModel; device: Device }) {
  return (
    <Scaled width={WIDTH[props.device]}>
      <div class="ob-canvas" key={`${props.site.template.slug}-${props.device}`} inert>
        <Site site={props.site} />
      </div>
    </Scaled>
  );
});

export function PreviewPanel(props: {
  site: SiteModel;
  host: string;
  device: Device;
  onDevice: (d: Device) => void;
  /** "Saving…" / "Saved" etc. from the wizard, so the preview says when it matches the server. */
  saving: boolean;
  onClose?: (() => void) | undefined;
  /** Shown when the preview isn't the owner's pick, e.g. a Pro template they're trying on. */
  badge?: string | undefined;
}) {
  const site = useThrottled(props.site, 120);
  const stale = site !== props.site;
  const fallback = rendererFor(site.template).notice;

  return (
    <section class="ob-pv" aria-labelledby="ob-pv-title">
      <div class="ob-pv-bar">
        <h2 id="ob-pv-title" class="ob-pv-title mono">Live preview</h2>
        {props.badge && <span class="ob-pv-badge mono"><Icon name="lock" size={12} /> {props.badge}</span>}
        <span class="ob-pv-sync mono" data-busy={stale || props.saving || undefined}>
          <i aria-hidden="true" />{stale ? 'Updating' : props.saving ? 'Saving' : 'Up to date'}
        </span>
        <div class="ob-seg" role="group" aria-label="Preview size">
          {(['desktop', 'phone'] as const).map((d) => (
            <button type="button" aria-pressed={props.device === d} onClick={() => props.onDevice(d)}>{d === 'desktop' ? 'Desktop' : 'Phone'}</button>
          ))}
        </div>
        {props.onClose && (
          <button type="button" class="ob-pv-close" onClick={props.onClose} aria-label="Close preview"><Icon name="plus" size={20} /></button>
        )}
      </div>
      {fallback && (
        <p class="ob-notice" role="status">This template can't be drawn here yet, so the preview shows Classic. Pick another template to change it.</p>
      )}
      <div class="ob-pv-frame" data-device={props.device}>
        <div class="ob-pv-url mono" aria-hidden="true"><span class="ob-pv-lock" />{props.host}</div>
        <div class="ob-pv-scroll" aria-label={`Preview of your page with the ${site.template.name} template`} role="img">
          <Canvas site={site} device={props.device} />
        </div>
      </div>
      <p class="ob-pv-legend"><span class="ob-pv-key" aria-hidden="true" />Dashed tags mark placeholders. They're never published.</p>
    </section>
  );
}

/**
 * On phones the preview opens as a full-height sheet (a modal dialog: focus is
 * trapped, Escape closes, the page behind can't scroll).
 */
export function PreviewSheet(props: { open: boolean; onClose: () => void; children: ComponentChildren }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (props.open && !d.open) d.showModal();
    if (!props.open && d.open) d.close();
  }, [props.open]);
  return (
    <dialog ref={dialog} class="ob-sheet" aria-label="Preview your page" onClose={props.onClose} onCancel={props.onClose}>
      {props.open && props.children}
    </dialog>
  );
}

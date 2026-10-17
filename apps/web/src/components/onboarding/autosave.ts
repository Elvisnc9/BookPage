import { useEffect, useRef, useState } from 'preact/hooks';
import { ApiError, type FieldIssue } from './api';

export type SaveState = 'idle' | 'saving' | 'saved' | 'invalid' | 'error';

/**
 * Debounced, serialised saving for one section of the form.
 * - Edits within `delay` ms collapse into one request.
 * - Only one request is in flight; edits made meanwhile are saved right after.
 * - Network failures retry with backoff; validation errors wait for the next edit.
 */
export function useAutosave<T>(save: (value: T) => Promise<void>, delay = 700) {
  const [state, setStateNow] = useState<SaveState>('idle');
  // Mirrors `state` for callers that await a save and must see its outcome, not the last render's.
  const latest = useRef<SaveState>('idle');
  const setState = (s: SaveState) => { latest.current = s; setStateNow(s); };
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const pending = useRef<{ value: T } | null>(null);
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retry = useRef(0);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = async (): Promise<void> => {
    clearTimeout(timer.current);
    if (running.current || !pending.current) return;
    const { value } = pending.current;
    pending.current = null;
    running.current = true;
    setState('saving');
    try {
      await saveRef.current(value);
      retry.current = 0;
      setIssues([]);
      setState(pending.current ? 'saving' : 'saved');
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setIssues(error.issues);
        setState('invalid');
      } else {
        // Keep the newest value queued and try again shortly.
        pending.current ??= { value };
        retry.current = Math.min(retry.current + 1, 5);
        setState('error');
        timer.current = setTimeout(() => void flush(), 1000 * 2 ** retry.current);
      }
    } finally {
      running.current = false;
    }
    if (pending.current && retry.current === 0) await flush();
  };

  const queue = (value: T) => {
    pending.current = { value };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), delay);
  };

  /** Save now (e.g. before moving to the next step). Resolves, once nothing is pending, with how it went. */
  const now = async (): Promise<SaveState> => {
    await flush();
    while (running.current) await new Promise((r) => setTimeout(r, 50));
    return latest.current;
  };

  // Don't lose the last edit when the tab closes.
  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, []);

  return { state, issues, queue, now };
}

/** The first issue for a field path ("phone", "0.name"…). */
export const issueFor = (issues: FieldIssue[], path: string) => issues.find((i) => i.path === path)?.message;

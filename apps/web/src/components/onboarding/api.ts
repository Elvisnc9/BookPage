import type { OwnerBusiness } from '@bookpage/shared';

export interface FieldIssue {
  path: string;
  message: string;
}

/** A request the API refused; `issues` maps to form fields when it was a validation error. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: FieldIssue[] = [],
  ) {
    super(message);
  }
}

/** Same-origin call through the owner app's /api proxy; the session cookie rides along. */
export async function api<T = OwnerBusiness>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin' };
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, init);
  if (res.status === 401) {
    window.location.href = '/sign-in';
    throw new ApiError(401, 'Signed out');
  }
  const json = (await res.json().catch(() => ({}))) as { message?: string; issues?: FieldIssue[] };
  if (!res.ok) throw new ApiError(res.status, json.message ?? 'Something went wrong', json.issues);
  return json as T;
}

/**
 * Uploads an image (already resized in the browser) to a slot. XHR rather than
 * fetch because only XHR reports upload progress.
 */
export function uploadImage(
  blob: Blob,
  query: { kind: string; targetId?: string | undefined; width: number; height: number },
  onProgress: (fraction: number) => void,
): Promise<OwnerBusiness> {
  const params = new URLSearchParams({ kind: query.kind, width: String(query.width), height: String(query.height) });
  if (query.targetId) params.set('targetId', query.targetId);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/business/media?${params}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('content-type', blob.type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onerror = () => reject(new ApiError(0, "Couldn't upload. Check your connection and try again."));
    xhr.onload = () => {
      if (xhr.status === 401) {
        window.location.href = '/sign-in';
        return reject(new ApiError(401, 'Signed out'));
      }
      let json: { message?: string; issues?: FieldIssue[] } = {};
      try { json = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(json as OwnerBusiness);
      else reject(new ApiError(xhr.status, xhr.status === 413 ? 'That image is too large.' : json.message ?? "Couldn't upload that image.", json.issues));
    };
    xhr.send(blob);
  });
}

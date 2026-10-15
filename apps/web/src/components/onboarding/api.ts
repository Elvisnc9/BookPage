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

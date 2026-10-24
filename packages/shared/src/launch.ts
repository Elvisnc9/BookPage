// The checks behind the launch sequence an owner watches after publishing. Each one
// looks at the real, live page (or booking calendar); none is decoration.
export const LAUNCH_CHECKS = ['layout', 'secure', 'search', 'calendar'] as const;
export type LaunchCheckStep = (typeof LAUNCH_CHECKS)[number];

/** ok: done. note: fine, with something to know. fail: needs attention (Try again). */
export type LaunchCheckStatus = 'ok' | 'note' | 'fail';

export interface LaunchCheck {
  step: LaunchCheckStep;
  status: LaunchCheckStatus;
  /** One plain sentence for the owner. */
  detail: string;
}

export const isLaunchCheckStep = (value: string): value is LaunchCheckStep => (LAUNCH_CHECKS as readonly string[]).includes(value);

/** SQLSTATE raised by the bookings_no_overlap exclusion constraint. */
const EXCLUSION_VIOLATION = '23P01';

/** True when a write failed because the slot was taken by another booking. */
export function isSlotTaken(error: unknown): boolean {
  return findCode(error, 0) === EXCLUSION_VIOLATION || /bookings_no_overlap/.test(String(error));
}

// Driver errors arrive wrapped (Prisma error → adapter cause → pg error).
function findCode(error: unknown, depth: number): string | undefined {
  if (!error || typeof error !== 'object' || depth > 5) return undefined;
  const e = error as { code?: unknown; cause?: unknown; meta?: { driverAdapterError?: unknown } };
  if (e.code === EXCLUSION_VIOLATION) return EXCLUSION_VIOLATION;
  return findCode(e.cause, depth + 1) ?? findCode(e.meta?.driverAdapterError, depth + 1);
}

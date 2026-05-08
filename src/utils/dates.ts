export const ONE_HOUR_MS = 60 * 60 * 1000;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export function nowEpochMs(): number {
  return Date.now();
}

export function addMs(epochMs: number, ms: number): number {
  return epochMs + ms;
}

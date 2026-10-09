/**
 * Healthy play (GDD §26.2): the parent-set Closing Time timer and Wind-Down
 * Mode. Closing Time waits for a natural stop (a fixed room, or the shop)
 * instead of cutting play off mid-puzzle; after a short grace it closes anyway.
 */
import { persistSoon, profile, settings } from './save';

const started = Date.now();
let lastTick = Date.now();
let closedThisSession = false;

/** Minutes played this session. */
export function sessionMinutes(now = Date.now()): number {
  return (now - started) / 60000;
}

/** Count play time into the profile (called every few seconds by the game loop). */
export function tickPlayTime(): void {
  const now = Date.now();
  const p = profile();
  p.stats.minutes += (now - lastTick) / 60000;
  lastTick = now;
  persistSoon();
}

/** True when it's time to close the shop, at a natural stopping point. */
export function closingDue(inRoom: boolean, now = Date.now()): boolean {
  const m = settings().closingMin;
  if (!m || closedThisSession) return false;
  const mins = sessionMinutes(now);
  return inRoom ? mins >= m + 3 : mins >= m;
}

export function markClosed(): void {
  closedThisSession = true;
}

/** A grown-up reopened the shop through the parental gate. */
export function reopen(): void {
  closedThisSession = false;
  settings().closingMin = 0;
}

export function windDownActive(now = new Date()): boolean {
  const s = settings();
  if (s.windDown) return true;
  if (s.windDownHour === null) return false;
  const h = now.getHours();
  return h >= s.windDownHour || h < 5;
}

import { describe, expect, it } from 'vitest';
import { nearestSocket } from './snap';

describe('forgiving socket placement', () => {
  const wrong = { x: 50, y: 0, fits: false }, right = { x: 85, y: 0, fits: true };
  it('snaps to a compatible socket when a slightly closer wrong socket overlaps it', () => {
    expect(nearestSocket([wrong, right], 50, 0, 80, t => t.fits)).toBe(right);
  });
  it('still lets the room wiggle away a wrong part, and never reaches beyond snap range', () => {
    expect(nearestSocket([wrong, right], 0, 0, 60, t => t.fits)).toBe(wrong);
    expect(nearestSocket([right], 0, 0, 60, t => t.fits)).toBeNull();
    expect(nearestSocket([wrong, right], 50, 0, 80)).toBe(wrong);
  });
});

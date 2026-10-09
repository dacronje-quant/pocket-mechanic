import Phaser from 'phaser';

/** True on phones/tablets (coarse pointer). */
export function isTouchDevice(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/**
 * Go fullscreen and lock landscape on Android. Must be called from inside a
 * pointer handler (browsers only allow it in response to a tap). Desktop is
 * left alone; the ⛶ button toggles it there.
 */
export function goFullscreen(scene: Phaser.Scene, force = false): void {
  if (!force && !isTouchDevice()) return;
  if (scene.scale.isFullscreen) return;
  try {
    scene.scale.startFullscreen();
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    o.lock?.('landscape').catch(() => undefined);
  } catch {
    /* fullscreen not allowed here (e.g. iOS Safari) — the game still works */
  }
}

export function toggleFullscreen(scene: Phaser.Scene): void {
  if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
  else goFullscreen(scene, true);
}

import Phaser from 'phaser';

/** True on phones/tablets (coarse pointer). */
export function isTouchDevice(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitFullscreenEnabled?: boolean };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };

function isFullscreenNow(): boolean {
  const d = document as FsDoc;
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
}

let lastTry = 0;

/**
 * Go fullscreen and lock landscape on Android. Browsers only allow this in
 * response to a finished tap, so it is called from `pointerup` (a `pointerdown`
 * coming from `touchstart` is refused, and Phaser's own request leaves that
 * refusal as an unhandled promise rejection). It is tried at most once every
 * few seconds rather than on every tap: retrying on every touch made the page
 * resize mid-tap on some devices, so the next tap landed in the wrong place.
 * Desktop is left alone; the ⛶ button toggles it there. iPhone has no
 * fullscreen API at all — the game simply runs in the page.
 */
export function goFullscreen(_scene: Phaser.Scene, force = false): void {
  if (!force && !isTouchDevice()) return;
  if (isFullscreenNow()) return;
  const now = Date.now();
  if (!force && now - lastTry < 8000) return;
  lastTry = now;
  try {
    const el = document.documentElement as FsEl;
    const lock = () => {
      try {
        const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        o?.lock?.('landscape')?.catch(() => undefined);
      } catch {
        /* no orientation lock here */
      }
    };
    if (el.requestFullscreen) {
      Promise.resolve(el.requestFullscreen({ navigationUI: 'hide' })).then(lock, () => undefined);
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  } catch {
    /* fullscreen not allowed here (e.g. iOS Safari) — the game still works */
  }
}

export function toggleFullscreen(scene: Phaser.Scene): void {
  if (isFullscreenNow()) {
    try {
      Promise.resolve(document.exitFullscreen?.()).catch(() => undefined);
    } catch {
      /* already out */
    }
  } else goFullscreen(scene, true);
}

/**
 * Re-measure the canvas after anything that moves it: rotation, entering or
 * leaving fullscreen, the mobile browser bar showing/hiding. Phaser polls for
 * size changes, but until it notices, taps are mapped with the old size.
 */
export function keepScaleFresh(game: Phaser.Game): void {
  const refresh = () => {
    try {
      game.scale.getParentBounds();
      game.scale.refresh();
    } catch {
      /* not booted yet */
    }
  };
  const soon = () => {
    refresh();
    setTimeout(refresh, 250);
    setTimeout(refresh, 700);
  };
  window.addEventListener('orientationchange', soon);
  window.addEventListener('resize', soon);
  document.addEventListener('fullscreenchange', soon);
  document.addEventListener('webkitfullscreenchange', soon);
  window.visualViewport?.addEventListener('resize', soon);
}

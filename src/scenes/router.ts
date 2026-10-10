/** Moving between scenes along the journey (src/core/journey.ts). */
import Phaser from 'phaser';
import { getRoom } from '../content/index';
import type { RoomKind } from '../content/types';
import type { Step } from '../core/journey';
import { stopVoice } from '../audio/voice';

export const roomSceneKey = (kind: RoomKind): string => `room-${kind}`;

export function sceneFor(step: Step): { key: string; data: object } {
  switch (step.scene) {
    case 'room': {
      const def = getRoom(step.launch.roomId);
      if (!def) return { key: 'shop', data: {} };
      return { key: roomSceneKey(def.kind), data: { launch: step.launch } };
    }
    case 'story':
      return { key: 'story', data: { id: step.id, next: step.next } };
    case 'reveal':
      return { key: 'reveal', data: { repair: step.repair, next: step.next } };
    case 'rewards':
      return { key: 'rewards', data: { repair: step.repair, next: step.next } };
    case 'festival':
      return { key: 'festival', data: { next: step.next } };
    case 'quick':
      return { key: 'quickfixes', data: {} };
    case 'attic':
      return { key: 'attic', data: {} };
    case 'shelf':
      return { key: 'shelf', data: {} };
    case 'shop':
      return { key: 'shop', data: {} };
    case 'bench':
      return { key: 'bench', data: {} };
  }
}

let leaving = false;

/** Scenes call this when they start, so a lost transition can never block navigation for good. */
export function resetLeaving(): void {
  leaving = false;
}

/**
 * Fade out, then start `key`. The fade is forced (a fade-in still running —
 * e.g. a tap in the first quarter-second of a scene — used to swallow the
 * fade-out, so its "complete" event never came), and a timer finishes the move
 * anyway if the fade never completes. `leaving` is always cleared, even if the
 * scene stopped in the meantime; before, it could stay set and every later
 * button that changes scene silently did nothing.
 */
function leave(scene: Phaser.Scene, key: string, data: object, ms: number, fast = false): void {
  if (leaving) return;
  leaving = true;
  stopVoice();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    leaving = false;
    try {
      scene.scene.start(key, data);
    } catch {
      scene.game.scene.start(key, data);
    }
  };
  if (fast) return finish();
  const cam = scene.cameras.main;
  try {
    cam.once('camerafadeoutcomplete', finish);
    cam.fade(ms, 26, 18, 12, true);
  } catch {
    return finish();
  }
  // safety: if the fade never completes (hidden tab, scene paused), move on anyway
  setTimeout(() => {
    if (done) return;
    const sys = scene.sys;
    // the scene was stopped some other way: just release the lock
    if (!sys || !(sys.isActive() || sys.isPaused() || sys.isSleeping())) {
      done = true;
      leaving = false;
      return;
    }
    finish();
  }, ms + 700);
}

/** Fade out and go to the next step. */
export function go(scene: Phaser.Scene, step: Step, fast = false): void {
  const { key, data } = sceneFor(step);
  leave(scene, key, data, 260, fast);
}

export function goScene(scene: Phaser.Scene, key: string, data: object = {}): void {
  leave(scene, key, data, 240);
}

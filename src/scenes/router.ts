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

/** Fade out and go to the next step. */
export function go(scene: Phaser.Scene, step: Step, fast = false): void {
  if (leaving) return;
  leaving = true;
  stopVoice();
  const { key, data } = sceneFor(step);
  const cam = scene.cameras.main;
  const finish = () => {
    leaving = false;
    scene.scene.start(key, data);
  };
  if (fast) return finish();
  cam.fadeOut(260, 26, 18, 12);
  cam.once('camerafadeoutcomplete', finish);
  // safety: if the fade never completes (hidden tab), move on anyway
  setTimeout(() => {
    if (leaving && scene.scene.isActive()) finish();
  }, 900);
}

export function goScene(scene: Phaser.Scene, key: string, data: object = {}): void {
  if (leaving) return;
  leaving = true;
  stopVoice();
  const cam = scene.cameras.main;
  const finish = () => {
    leaving = false;
    scene.scene.start(key, data);
  };
  cam.fadeOut(240, 26, 18, 12);
  cam.once('camerafadeoutcomplete', finish);
  setTimeout(() => {
    if (leaving && scene.scene.isActive()) finish();
  }, 900);
}

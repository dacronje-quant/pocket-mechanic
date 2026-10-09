/**
 * window.pm: handy in the browser console and used by the automated
 * playthrough (scripts/playthrough.mjs) to open rooms and apply their
 * authored solutions. It never changes how the game plays for children.
 */
import type Phaser from 'phaser';

export interface DebugRoom {
  roomId: string;
  kind: string;
  isFixed(): boolean;
  solve(): void;
  bannerShown(): boolean;
}

export const pm: {
  game?: Phaser.Game;
  room: DebugRoom | null;
  scene: string;
  errors: string[];
  ready: boolean;
} = { room: null, scene: '', errors: [], ready: false };

(window as unknown as { pm: typeof pm }).pm = pm;

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
  /** Story, Test Run, rewards and festival scenes: skip straight to the end. */
  next: (() => void) | null;
  /** Tappable things in hub scenes, by name (the playthrough taps them). */
  hot: Record<string, () => void>;
  /** The save and a few helpers, for the automated playthrough only. */
  dev?: { save: unknown; persist: () => void; go: (scene: string, data?: object) => void };
} = { room: null, scene: '', errors: [], ready: false, next: null, hot: {} };

(window as unknown as { pm: typeof pm }).pm = pm;

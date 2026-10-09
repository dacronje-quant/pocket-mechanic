/**
 * Boot: load the optional audio manifest, apply settings, then go to the
 * title screen. `?room=<id>&style=<style>&mode=<mode>` opens a room directly
 * (used by the automated playthrough and handy while building rooms).
 */
import Phaser from 'phaser';
import { loadManifest, setLevels } from '../audio/engine';
import { setSoft } from '../audio/sfx';
import { ensureBasics } from '../art/textures';
import { getRoom } from '../content/index';
import type { PlayStyleId } from '../content/types';
import type { RoomMode } from '../core/journey';
import { addProfile, profile, save, settings } from '../core/save';
import { pm } from '../debug';
import { go } from './router';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    ensureBasics(this);
    const s = settings();
    setLevels({ muted: s.muted, music: s.music, sfx: s.sfx, voice: s.voice });
    setSoft(s.soft);
    void loadManifest();
    pm.ready = true;
    const q = new URLSearchParams(location.search);
    const room = q.get('room');
    if (room && getRoom(room)) {
      if (!save.active) addProfile('QA', 0, 'fixer');
      const style = q.get('style') as PlayStyleId | null;
      if (style) profile().style = style;
      go(this, { scene: 'room', launch: { roomId: room, mode: (q.get('mode') as RoomMode) ?? 'story' } }, true);
      return;
    }
    const scene = q.get('scene');
    if (scene) {
      if (!save.active) addProfile('QA', 0, 'fixer');
      this.scene.start(scene, {});
      return;
    }
    this.scene.start('title');
  }
}

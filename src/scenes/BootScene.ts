/**
 * Boot: load the optional audio manifest, apply settings, then go to the
 * title screen. `?room=<id>&style=<style>&mode=<mode>` opens a room directly
 * (used by the automated playthrough and handy while building rooms).
 */
import Phaser from 'phaser';
import { loadManifest, setLevels } from '../audio/engine';
import { setSoft } from '../audio/sfx';
import { loadArtManifest } from '../art/generated';
import { ensureBasics } from '../art/textures';
import { getRoom } from '../content/index';
import type { PlayStyleId } from '../content/types';
import type { RoomMode } from '../core/journey';
import { addProfile, persist, profile, save, settings } from '../core/save';
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
    void loadArtManifest();
    pm.ready = true;
    pm.dev = {
      save,
      persist,
      go: (key, data = {}) => {
        const g = this.game;
        for (const sc of g.scene.getScenes(true)) g.scene.stop(sc.scene.key);
        g.scene.start(key, data);
      },
    };
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
      const data: Record<string, unknown> = Object.fromEntries(q.entries());
      if (data.repair) data.repair = Number(data.repair);
      this.scene.start(scene, data);
      return;
    }
    this.scene.start('title');
  }
}

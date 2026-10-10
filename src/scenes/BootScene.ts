/**
 * Boot: load the optional audio manifest, apply settings, then go to the
 * title screen. `?room=<id>&style=<style>&mode=<mode>` opens a room directly
 * (used by the automated playthrough and handy while building rooms).
 */
import Phaser from 'phaser';
import { loadManifest, setLevels } from '../audio/engine';
import { setSoft } from '../audio/sfx';
import { beginArtScene, preloadCoreArt } from '../art/generated';
import { ensureBasics, ensureGearTexture } from '../art/textures';
import { CM, CM_CSS, drawLeafSprig, drawPatina } from '../art/copperMoss';
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

  async create(): Promise<void> {
    beginArtScene(this);
    ensureBasics(this);
    const s = settings();
    this.loadingDisplay(s.calm);
    setLevels({ muted: s.muted, music: s.music, sfx: s.sfx, voice: s.voice });
    setSoft(s.soft);
    let alive = true;
    const stop = () => { alive = false; };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
    await Promise.all([
      Promise.race([loadManifest(), new Promise<void>(resolve => setTimeout(resolve, 1500))]),
      preloadCoreArt(this),
    ]);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, stop);
    if (!alive || !this.sys.isActive()) return;
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

  /** An illustrated, reading-free clockwork cue while the optional art warms up. */
  private loadingDisplay(calm: boolean): void {
    const g = this.add.graphics();
    g.fillStyle(CM.paper, 1);
    g.fillRect(0, 0, 1280, 720);
    drawPatina(g, 0, 0, 1280, 720, 1044, 0.7);
    g.fillStyle(CM.ink, 0.13);
    g.fillRoundedRect(305, 201, 680, 324, 16);
    g.fillStyle(CM.copperDark, 1);
    g.fillRoundedRect(300, 196, 680, 324, 16);
    g.fillStyle(CM.paper, 1);
    g.fillRoundedRect(307, 203, 666, 310, 11);
    g.lineStyle(1, CM.brass, 1);
    g.strokeRoundedRect(303, 199, 674, 318, 13);
    drawPatina(g, 314, 210, 652, 296, 1091, 1.1);
    for (const x of [320, 960]) for (const y of [217, 499]) {
      g.fillStyle(CM.brass, 1);
      g.fillCircle(x, y, 3.5);
      g.lineStyle(0.9, CM.ink, 0.8);
      g.lineBetween(x - 1.5, y + 1.5, x + 1.5, y - 1.5);
    }
    drawLeafSprig(g, 287, 195, 111, 1046, 0.9);
    drawLeafSprig(g, 992, 414, 104, 1047, 0.8);
    this.add.text(640, 282, 'Pocket Mechanic', {
      fontFamily: 'Georgia, serif', fontSize: '47px', color: CM_CSS.ink,
    }).setOrigin(0.5);
    this.add.text(640, 332, 'The Clockwork Repair Shop', {
      fontFamily: 'Georgia, serif', fontSize: '25px', color: CM_CSS.inkSoft, fontStyle: 'italic',
    }).setOrigin(0.5);
    const gear = this.add.image(600, 416, ensureGearTexture(this, 16, 'brass')).setScale(1.35);
    const small = this.add.image(688, 429, ensureGearTexture(this, 10, 'copper')).setScale(1.35);
    if (!calm) {
      this.tweens.add({ targets: gear, angle: 360, duration: 16000, repeat: -1 });
      this.tweens.add({ targets: small, angle: -360, duration: 10000, repeat: -1 });
    }
  }
}

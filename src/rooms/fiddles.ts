/**
 * Fiddle Toys (GDD §9.2): things that are fun to touch even though the puzzle
 * doesn't need them. At least five per room, chosen by the room's theme.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { ensureGearTexture } from '../art/textures';
import { star } from '../art/Kip';
import type { ThemeId } from '../content/types';

export type FiddleKind = 'bell' | 'owl' | 'spring' | 'switch' | 'cog' | 'gauge' | 'whistle' | 'humbug' | 'mouse' | 'valve' | 'twinkle' | 'moth' | 'pigeon' | 'horn' | 'lights' | 'note' | 'cup' | 'signal' | 'coo';

export const THEME_FIDDLES: Record<ThemeId, FiddleKind[]> = {
  clock: ['bell', 'owl', 'spring', 'switch', 'coo'],
  musicbox: ['bell', 'note', 'spring', 'twinkle', 'cog'],
  train: ['whistle', 'signal', 'mouse', 'spring', 'cog'],
  radio: ['humbug', 'gauge', 'switch', 'spring', 'cog'],
  tea: ['valve', 'gauge', 'whistle', 'cup', 'cog'],
  bertie: ['lights', 'horn', 'spring', 'gauge', 'cog'],
  orrery: ['twinkle', 'moth', 'gauge', 'bell', 'cog'],
  tower: ['bell', 'pigeon', 'gauge', 'spring', 'cog'],
  shop: ['bell', 'spring', 'switch', 'gauge', 'cog'],
  attic: ['owl', 'spring', 'gauge', 'twinkle', 'cog'],
  bench: ['bell', 'spring', 'switch', 'gauge', 'cog'],
  home: ['bell', 'spring', 'switch', 'gauge', 'cog'],
};

export const FIDDLE_SPOTS: Array<{ x: number; y: number }> = [
  { x: 78, y: 180 },
  { x: 78, y: 360 },
  { x: 1202, y: 180 },
  { x: 1202, y: 360 },
  { x: 1202, y: 520 },
];

/** Build one fiddle toy; `touched` is called on every tap. */
export function makeFiddle(scene: Phaser.Scene, kind: FiddleKind, x: number, y: number, touched: () => void): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  c.add(g);
  let on = false;
  let taps = 0;
  const hit = (w: number, h: number) => {
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
  };
  const wobble = (amt = 14) => scene.tweens.add({ targets: c, angle: { from: -amt, to: amt }, duration: 120, yoyo: true, repeat: 2, onComplete: () => c.setAngle(0) });
  const bounce = () => scene.tweens.add({ targets: c, y: y - 22, duration: 150, yoyo: true, ease: 'Quad.easeOut' });
  let tap: () => void = () => undefined;
  switch (kind) {
    case 'bell':
      g.lineStyle(3, 0xd9c7a0, 1);
      g.lineBetween(0, -60, 0, -20);
      g.fillStyle(0xb88a2c, 1);
      g.fillTriangle(-24, 24, 24, 24, 0, -20);
      g.fillCircle(0, -4, 18);
      g.fillRect(-26, 18, 52, 8);
      g.fillStyle(0xf6d27a, 0.6);
      g.fillCircle(-6, -8, 6);
      hit(70, 90);
      tap = () => {
        sfx.ding(1320 - taps * 40);
        wobble(22);
      };
      break;
    case 'owl': {
      const pupils = scene.add.graphics();
      g.fillStyle(0x7a4b26, 1);
      g.fillEllipse(0, 10, 66, 70);
      g.fillTriangle(-28, -16, -18, -36, -10, -18);
      g.fillTriangle(28, -16, 18, -36, 10, -18);
      g.fillStyle(0x9a6a3a, 1);
      g.fillEllipse(0, 22, 40, 42);
      g.fillStyle(0xe7bb55, 1);
      g.fillTriangle(-5, 4, 5, 4, 0, 14);
      g.fillStyle(0xf3e2bd, 1);
      g.fillCircle(-13, -6, 11);
      g.fillCircle(13, -6, 11);
      const spin = { a: 0 };
      const draw = () => {
        pupils.clear();
        pupils.fillStyle(0x2b1d14, 1);
        pupils.fillCircle(-13 + Math.cos(spin.a) * 4, -6 + Math.sin(spin.a) * 4, 4.5);
        pupils.fillCircle(13 + Math.cos(spin.a) * 4, -6 + Math.sin(spin.a) * 4, 4.5);
      };
      draw();
      c.add(pupils);
      hit(80, 90);
      tap = () => {
        sfx.click();
        scene.tweens.add({ targets: spin, a: spin.a + Math.PI * 2, duration: 450, onUpdate: draw });
        if (taps % 3 === 2) {
          sfx.boing();
          bounce();
        }
      };
      break;
    }
    case 'spring':
      g.lineStyle(5, 0xc0c8d0, 1);
      for (let i = 0; i < 6; i++) g.strokeEllipse(0, 30 - i * 11, 32, 10);
      g.fillStyle(0xd9a441, 1);
      g.fillCircle(0, -40, 12);
      hit(60, 100);
      tap = () => {
        sfx.boing(0.9 + (taps % 4) * 0.15);
        scene.tweens.add({ targets: c, scaleY: { from: 0.45, to: 1 }, duration: 600, ease: 'Elastic.easeOut' });
      };
      break;
    case 'switch': {
      const bulb = scene.add.graphics();
      const lever = scene.add.graphics();
      const draw = () => {
        bulb.clear();
        if (on) {
          bulb.fillStyle(0xffe98a, 0.25);
          bulb.fillCircle(0, -58, 34);
        }
        bulb.fillStyle(on ? 0xfff3b0 : 0x8f8a7a, 1);
        bulb.fillCircle(0, -58, 14);
        bulb.fillStyle(0x7a5413, 1);
        bulb.fillRect(-7, -44, 14, 8);
        lever.clear();
        lever.fillStyle(0xf3e2bd, 1);
        lever.fillRoundedRect(-6, on ? -20 : 0, 12, 20, 5);
      };
      g.fillStyle(0xb88a2c, 1);
      g.fillRoundedRect(-20, -28, 40, 56, 8);
      g.fillStyle(0x3d2412, 1);
      g.fillRoundedRect(-8, -16, 16, 32, 6);
      draw();
      c.add([bulb, lever]);
      hit(60, 120);
      tap = () => {
        on = !on;
        sfx.toggle(on);
        draw();
      };
      break;
    }
    case 'cog': {
      const img = scene.add.image(0, 0, ensureGearTexture(scene, 10, 'steel'));
      c.add(img);
      hit(70, 70);
      tap = () => {
        sfx.whirr();
        scene.tweens.add({ targets: img, angle: img.angle + 720, duration: 1400, ease: 'Cubic.easeOut' });
        bounce();
      };
      break;
    }
    case 'gauge': {
      const needle = scene.add.graphics();
      g.fillStyle(0x7a5413, 1);
      g.fillCircle(0, 0, 34);
      g.fillStyle(0xf6ead0, 1);
      g.fillCircle(0, 0, 28);
      g.fillStyle(0x2e9b5f, 0.6);
      g.slice(0, 0, 26, -Math.PI * 0.6, -Math.PI * 0.4, false);
      g.fillPath();
      needle.lineStyle(3, 0xd64541, 1);
      needle.lineBetween(0, 0, 0, -22);
      needle.rotation = -0.9;
      c.add(needle);
      hit(76, 76);
      tap = () => {
        sfx.tick(1.2);
        scene.tweens.add({ targets: needle, rotation: { from: 1.2, to: -0.9 + Math.random() * 0.4 }, duration: 900, ease: 'Elastic.easeOut' });
      };
      break;
    }
    case 'whistle':
      g.fillStyle(0xc0c8d0, 1);
      g.fillRoundedRect(-14, -30, 28, 60, 10);
      g.fillStyle(0x9aa6b4, 1);
      g.fillRect(-10, -20, 20, 6);
      hit(60, 80);
      tap = () => {
        sfx.whistle(880 + (taps % 3) * 110, 0.5);
        puffAt(scene, x, y - 40);
      };
      break;
    case 'humbug': {
      const glow = scene.add.graphics();
      const draw = (a: number) => {
        glow.clear();
        glow.fillStyle(0xffe066, a);
        glow.fillCircle(0, 0, 34);
      };
      draw(0.15);
      g.fillStyle(0x2e9b5f, 1);
      g.fillEllipse(0, 0, 34, 42);
      g.fillStyle(0xffe066, 1);
      g.fillCircle(0, 10, 9);
      g.fillStyle(0x111111, 1);
      g.fillCircle(-6, -10, 3);
      g.fillCircle(6, -10, 3);
      c.addAt(glow, 0);
      hit(70, 70);
      tap = () => {
        sfx.hum(220 + (taps % 4) * 55, 0.6);
        draw(0.6);
        scene.time.delayedCall(500, () => draw(0.15));
        bounce();
      };
      break;
    }
    case 'mouse':
      g.fillStyle(0xb0a8a0, 1);
      g.fillEllipse(0, 14, 40, 36);
      g.fillCircle(0, -14, 16);
      g.fillCircle(-12, -26, 8);
      g.fillCircle(12, -26, 8);
      g.fillStyle(0x1c3d6e, 1);
      g.fillRoundedRect(-12, -38, 24, 10, 3);
      g.fillStyle(0x111111, 1);
      g.fillCircle(-5, -15, 2);
      g.fillCircle(5, -15, 2);
      hit(60, 80);
      tap = () => {
        sfx.chirp();
        scene.tweens.add({ targets: c, angle: 360, duration: 500, onComplete: () => c.setAngle(0) });
        bounce();
      };
      break;
    case 'valve':
      g.fillStyle(0xc8703f, 1);
      g.fillRect(-30, 0, 60, 14);
      g.fillStyle(0xd64541, 1);
      g.fillCircle(0, -10, 18);
      g.fillStyle(0x5e3f10, 1);
      g.fillCircle(0, -10, 5);
      hit(70, 70);
      tap = () => {
        sfx.pfft();
        puffAt(scene, x + 30, y - 10);
        wobble(30);
      };
      break;
    case 'twinkle':
      g.fillStyle(0xfff3b0, 1);
      star(g, 0, 0, 22);
      hit(60, 60);
      tap = () => {
        sfx.note(1046 + (taps % 5) * 131, 'chime');
        scene.tweens.add({ targets: c, scale: 1.4, angle: 72, duration: 200, yoyo: true, onComplete: () => c.setAngle(0) });
      };
      break;
    case 'moth':
      g.fillStyle(0xd9c7a0, 1);
      g.fillEllipse(-16, 0, 30, 24);
      g.fillEllipse(16, 0, 30, 24);
      g.fillStyle(0xb8a07a, 1);
      g.fillEllipse(0, 0, 10, 30);
      hit(70, 50);
      tap = () => {
        sfx.swish();
        scene.tweens.add({ targets: c, x: x + 30, y: y - 30, duration: 300, yoyo: true, ease: 'Sine.easeInOut' });
        scene.tweens.add({ targets: c, scaleX: 0.3, duration: 80, yoyo: true, repeat: 3 });
      };
      break;
    case 'pigeon':
      g.fillStyle(0x8e9aaf, 1);
      g.fillEllipse(0, 10, 50, 40);
      g.fillCircle(16, -12, 14);
      g.fillStyle(0xff9e57, 1);
      g.fillTriangle(28, -14, 28, -8, 38, -11);
      g.fillStyle(0x111111, 1);
      g.fillCircle(18, -14, 2.5);
      hit(70, 70);
      tap = () => {
        sfx.flap();
        bounce();
      };
      break;
    case 'horn':
      g.fillStyle(0xffd43b, 1);
      g.fillTriangle(-30, 0, 20, -24, 20, 24);
      g.fillStyle(0xd64541, 1);
      g.fillCircle(-30, 0, 12);
      hit(70, 60);
      tap = () => {
        sfx.tone(330, 'square', 0.12, 0.01, 0.25);
        sfx.tone(262, 'square', 0.12, 0.01, 0.3, 0.2);
        wobble(10);
      };
      break;
    case 'lights': {
      const bulbs = scene.add.graphics();
      let phase = 0;
      const draw = () => {
        bulbs.clear();
        for (let i = 0; i < 4; i++) {
          bulbs.fillStyle([0xffd43b, 0x74c0fc, 0x8ce99a, 0xff8787][i], (i + phase) % 2 ? 1 : 0.3);
          bulbs.fillCircle(-24 + i * 16, 0, 7);
        }
      };
      g.fillStyle(0x3d2b25, 1);
      g.fillRoundedRect(-36, -14, 72, 28, 8);
      draw();
      c.add(bulbs);
      hit(80, 50);
      tap = () => {
        sfx.click();
        let n = 0;
        scene.time.addEvent({ delay: 120, repeat: 7, callback: () => {
          phase++;
          n++;
          draw();
          if (n === 8) sfx.sparkle();
        } });
      };
      break;
    }
    case 'note':
      g.fillStyle(0x5f3dc4, 1);
      g.fillEllipse(-6, 14, 22, 16);
      g.fillRect(3, -24, 5, 38);
      g.fillTriangle(8, -24, 8, -12, 22, -14);
      hit(60, 70);
      tap = () => {
        sfx.note([523, 587, 659, 784, 880][taps % 5], 'pluck');
        bounce();
      };
      break;
    case 'cup':
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(-18, -14, 36, 30, 8);
      g.lineStyle(4, 0xffffff, 1);
      g.strokeCircle(22, 0, 8);
      g.fillStyle(0x8a4a20, 1);
      g.fillRect(-14, -12, 28, 6);
      hit(70, 60);
      tap = () => {
        sfx.ding(2400);
        wobble(8);
      };
      break;
    case 'signal': {
      const lamp = scene.add.graphics();
      const draw = () => {
        lamp.clear();
        lamp.fillStyle(on ? 0x51cf66 : 0xff6b6b, 1);
        lamp.fillCircle(0, -30, 9);
      };
      g.fillStyle(0x333333, 1);
      g.fillRect(-4, -20, 8, 60);
      g.fillRoundedRect(-14, -44, 28, 30, 6);
      draw();
      c.add(lamp);
      hit(50, 100);
      tap = () => {
        on = !on;
        sfx.toggle(on);
        draw();
      };
      break;
    }
    case 'coo':
      g.fillStyle(0x3d2412, 1);
      g.fillRoundedRect(-26, -26, 52, 52, 6);
      g.fillStyle(0x8a5a33, 1);
      g.fillCircle(0, 4, 14);
      g.fillStyle(0xe8a33d, 1);
      g.fillTriangle(10, 0, 10, 8, 22, 4);
      hit(70, 70);
      tap = () => {
        sfx.cuckoo(1);
        scene.tweens.add({ targets: c, x: x + 14, duration: 140, yoyo: true, repeat: 1 });
      };
      break;
  }
  c.on('pointerup', () => {
    taps++;
    tap();
    touched();
  });
  return c;
}

export function puffAt(scene: Phaser.Scene, x: number, y: number): void {
  if (!scene.textures.exists('puff')) return;
  const p = scene.add.particles(x, y, 'puff', {
    speed: { min: 20, max: 70 },
    angle: { min: 230, max: 310 },
    lifespan: 900,
    scale: { start: 0.6, end: 1.6 },
    alpha: { start: 0.7, end: 0 },
    emitting: false,
  }).setDepth(95);
  p.explode(6);
  scene.time.delayedCall(1200, () => p.destroy());
}

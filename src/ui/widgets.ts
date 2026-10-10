import Phaser from 'phaser';
import { click } from '../audio/sfx';
import { speak, stopVoice } from '../audio/voice';
import { badge } from '../art/portraits';
import type { CharId } from '../content/types';
import { uiLineId } from '../content/voicelines';
import { profile, settings } from '../core/save';

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const SERIF = 'Georgia, "Times New Roman", serif';

export interface ButtonOpts {
  r?: number;
  fontSize?: number;
  label?: string;
  color?: number;
  /** Speak this when tapped (read-aloud for menus). */
  say?: string;
  disabled?: boolean;
}

/** Round brass button with a big touch area (GDD §12.2: generous targets, ≥15 mm). */
export function roundButton(scene: Phaser.Scene, x: number, y: number, icon: string, onTap: () => void, opts: ButtonOpts = {}): Phaser.GameObjects.Container {
  const r = opts.r ?? 38;
  const face = opts.color ?? 0xe0ab48;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (pressed: boolean) => {
    g.clear();
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(2, pressed ? 2 : 5, r);
    g.fillStyle(Phaser.Display.Color.ValueToColor(face).darken(40).color, 1);
    g.fillCircle(0, pressed ? 2 : 0, r);
    g.fillStyle(pressed ? Phaser.Display.Color.ValueToColor(face).darken(12).color : face, opts.disabled ? 0.5 : 1);
    g.fillCircle(0, pressed ? 2 : 0, r - 4);
    g.fillStyle(0xfff0b8, 0.35);
    g.fillCircle(-r * 0.25, -r * 0.3 + (pressed ? 2 : 0), r * 0.5);
  };
  draw(false);
  const t = scene.add
    .text(0, opts.label ? -6 : 0, icon, { fontFamily: FONT, fontSize: `${opts.fontSize ?? 34}px`, color: '#3b260b' })
    .setOrigin(0.5);
  c.add([g, t]);
  if (opts.label) {
    c.add(scene.add.text(0, r * 0.48, opts.label, { fontFamily: FONT, fontSize: '13px', color: '#3b260b', fontStyle: 'bold' }).setOrigin(0.5));
  }
  c.setSize(r * 2 + 16, r * 2 + 16);
  c.setInteractive(new Phaser.Geom.Circle(r + 8, r + 8, r + 8), Phaser.Geom.Circle.Contains);
  let down = false;
  c.on('pointerdown', () => {
    down = true;
    draw(true);
    t.y += 2;
  });
  const release = () => {
    if (!down) return;
    down = false;
    draw(false);
    t.y = opts.label ? -6 : 0;
  };
  c.on('pointerout', release);
  c.on('pointerup', () => {
    const was = down;
    release();
    if (!was || opts.disabled) return;
    click();
    if (opts.say && settings().readAloud) void speak('nana', opts.say, uiLineId(opts.say));
    onTap();
  });
  c.setData('icon', t);
  c.setData('draw', draw);
  return c;
}

export function setButtonIcon(btn: Phaser.GameObjects.Container, icon: string): void {
  (btn.getData('icon') as Phaser.GameObjects.Text).setText(icon);
}

/** A rounded brass-edged card. */
export function card(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = 0xf3e2bd, edge = 0x7a5413): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(x - w / 2 + 4, y - h / 2 + 8, w, h, 22);
  g.fillStyle(edge, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 22);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x - w / 2 + 7, y - h / 2 + 7, w - 14, h - 14, 17);
  return g;
}

/** A tappable rounded card with an icon drawing and an optional caption. */
export function tile(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  onTap: () => void,
  opts: { caption?: string; fill?: number; locked?: boolean; selected?: boolean; captionSize?: number } = {},
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (pressed: boolean) => {
    g.clear();
    g.fillStyle(0x000000, 0.28);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, 16);
    g.fillStyle(opts.selected ? 0xffc928 : 0x7a5413, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 3 : 0), w, h, 16);
    g.fillStyle(opts.locked ? 0x9a8a72 : opts.fill ?? 0xf3e2bd, 1);
    g.fillRoundedRect(-w / 2 + 5, -h / 2 + 5 + (pressed ? 3 : 0), w - 10, h - 10, 12);
  };
  draw(false);
  c.add(g);
  if (opts.caption) {
    c.add(
      scene.add
        .text(0, h / 2 - 20, opts.caption, { fontFamily: FONT, fontSize: `${opts.captionSize ?? 15}px`, color: '#3b260b', align: 'center', fontStyle: 'bold', wordWrap: { width: w - 16 } })
        .setOrigin(0.5),
    );
  }
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  let down = false;
  let sx = 0;
  let sy = 0;
  c.on('pointerdown', (p: Phaser.Input.Pointer) => {
    down = true;
    sx = p.x;
    sy = p.y;
    draw(true);
  });
  c.on('pointerout', () => {
    down = false;
    draw(false);
  });
  c.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (!down) return;
    down = false;
    draw(false);
    if (Math.hypot(p.x - sx, p.y - sy) > 14) return; // it was a scroll
    click();
    onTap();
  });
  return c;
}

export function title(scene: Phaser.Scene, x: number, y: number, text: string, size = 46, color = '#ffd76a'): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: SERIF, fontSize: `${size}px`, color, fontStyle: 'bold', stroke: '#2b1d14', strokeThickness: Math.round(size / 6) })
    .setOrigin(0.5)
    .setShadow(0, 4, '#000000', 6, true, true);
}

export function body(scene: Phaser.Scene, x: number, y: number, text: string, size = 20, color = '#3b260b', width = 600): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, wordWrap: { width }, lineSpacing: 4 });
}

/** Are words shown on screen? Little Tinker is reading-free unless a grown-up turns subtitles on. */
export function showWords(): boolean {
  const s = settings().subtitles;
  if (s === 'on') return true;
  if (s === 'off') return false;
  return profile().style !== 'tinker';
}

/**
 * Speech bubble with the speaker's portrait. It always speaks the line; in
 * Little Tinker (reading-free) it shows a little sound wave instead of words.
 */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private text: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Graphics;
  private wave: Phaser.GameObjects.Graphics;
  private face?: Phaser.GameObjects.Container;
  private hideTimer?: Phaser.Time.TimerEvent;
  private who: CharId = 'nana';
  private bw: number;
  private t = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number) {
    super(scene, x, y);
    this.bw = width;
    this.bg = scene.add.graphics();
    this.wave = scene.add.graphics();
    this.text = scene.add
      .text(-width / 2 + 82, 0, '', { fontFamily: FONT, fontSize: '22px', color: '#2b1d14', wordWrap: { width: width - 100 } })
      .setOrigin(0, 0.5);
    this.add([this.bg, this.wave, this.text]);
    this.setAlpha(0);
    scene.add.existing(this);
  }

  say(msg: string, opts: { who?: CharId; id?: string; ms?: number; silent?: boolean } = {}): void {
    const who = opts.who ?? 'nana';
    if (!this.face || this.who !== who) {
      this.face?.destroy();
      this.face = badge(this.scene, -this.bw / 2 + 44, 0, who, 30);
      this.add(this.face);
      this.who = who;
    }
    const words = showWords();
    this.text.setText(words ? msg : '');
    const h = words ? Math.max(76, this.text.height + 28) : 76;
    const w = words ? this.bw : 220;
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.25);
    this.bg.fillRoundedRect(-this.bw / 2 + 3, -h / 2 + 4, w, h, 22);
    this.bg.fillStyle(0xfff6e2, 1);
    this.bg.fillRoundedRect(-this.bw / 2, -h / 2, w, h, 22);
    this.bg.lineStyle(3, 0xb88a2c, 1);
    this.bg.strokeRoundedRect(-this.bw / 2, -h / 2, w, h, 22);
    this.wave.setVisible(!words);
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(0).setScale(0.9);
    this.scene.tweens.add({ targets: this, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.hideTimer?.remove();
    const ms = opts.ms ?? Math.max(4500, msg.length * 75);
    this.hideTimer = this.scene.time.delayedCall(ms, () => this.hide());
    if (!opts.silent) void speak(who, msg, opts.id);
  }

  preUpdate(_t: number, dt: number): void {
    if (!this.wave.visible || this.alpha === 0) return;
    this.t += dt / 1000;
    const g = this.wave;
    g.clear();
    g.lineStyle(4, 0xb88a2c, 1);
    const x0 = -this.bw / 2 + 90;
    for (let i = 0; i < 7; i++) {
      const hgt = 8 + Math.abs(Math.sin(this.t * 7 + i)) * 22;
      g.lineBetween(x0 + i * 16, -hgt / 2, x0 + i * 16, hgt / 2);
    }
  }

  hide(): void {
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 250 });
  }

  preDestroy(): void {
    stopVoice();
  }
}

/** A small card that slides down from the top: stamps, finds, unlocks. */
export function toast(scene: Phaser.Scene, label: string, draw?: (g: Phaser.GameObjects.Graphics) => void, glyph?: string): void {
  const w = 460;
  const c = scene.add.container(scene.scale.width / 2, -70).setDepth(9000);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(-w / 2 + 3, -38, w, 80, 20);
  g.fillStyle(0x7a5413, 1);
  g.fillRoundedRect(-w / 2, -42, w, 80, 20);
  g.fillStyle(0xfff6e2, 1);
  g.fillRoundedRect(-w / 2 + 5, -37, w - 10, 70, 16);
  c.add(g);
  const icon = scene.add.graphics();
  if (draw) {
    icon.setPosition(-w / 2 + 46, -2);
    draw(icon);
    c.add(icon);
  } else if (glyph) {
    c.add(scene.add.text(-w / 2 + 46, -2, glyph, { fontFamily: FONT, fontSize: '40px' }).setOrigin(0.5));
  }
  c.add(scene.add.text(-w / 2 + 92, -2, showWords() ? label : '', { fontFamily: FONT, fontSize: '22px', color: '#3b260b', fontStyle: 'bold', wordWrap: { width: w - 110 } }).setOrigin(0, 0.5));
  scene.tweens.chain({
    targets: c,
    tweens: [
      { y: 60, duration: 380, ease: 'Back.easeOut' },
      { y: 60, duration: 2200 },
      { y: -70, duration: 300, ease: 'Quad.easeIn' },
    ],
    onComplete: () => c.destroy(),
  });
}

/**
 * A vertically scrolling grid of tiles inside a window (drag to scroll).
 * `make(i, x, y)` returns the item at a local position.
 */
export function scrollGrid(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  cell: { w: number; h: number; cols: number },
  make: (i: number, cx: number, cy: number) => Phaser.GameObjects.GameObject,
): Phaser.GameObjects.Container {
  const view = scene.add.container(x, y);
  const content = scene.add.container(0, 0);
  view.add(content);
  for (let i = 0; i < count; i++) {
    const col = i % cell.cols;
    const row = Math.floor(i / cell.cols);
    content.add(make(i, cell.w / 2 + col * cell.w, cell.h / 2 + row * cell.h));
  }
  const rows = Math.ceil(count / cell.cols);
  const maxScroll = Math.max(0, rows * cell.h - h);
  const maskG = scene.make.graphics({}, false);
  maskG.fillStyle(0xffffff);
  maskG.fillRect(x, y, w, h);
  content.setMask(maskG.createGeometryMask());
  const zone = scene.add.zone(x, y, w, h).setOrigin(0).setInteractive();
  zone.setDepth(-1);
  let drag: { y0: number; c0: number } | null = null;
  const onDown = (p: Phaser.Input.Pointer) => {
    if (p.x < x || p.x > x + w || p.y < y || p.y > y + h) return;
    drag = { y0: p.y, c0: content.y };
  };
  const onMove = (p: Phaser.Input.Pointer) => {
    if (!drag || !p.isDown) return;
    content.y = Phaser.Math.Clamp(drag.c0 + (p.y - drag.y0), -maxScroll, 0);
  };
  const onUp = () => (drag = null);
  const onWheel = (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
    content.y = Phaser.Math.Clamp(content.y - dy, -maxScroll, 0);
  };
  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);
  scene.input.on('wheel', onWheel);
  view.once('destroy', () => {
    scene.input.off('pointerdown', onDown);
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerup', onUp);
    scene.input.off('wheel', onWheel);
    maskG.destroy();
    zone.destroy();
  });
  view.setData('content', content);
  return view;
}

/** A dim backdrop that blocks taps to what's behind it. */
export function blocker(scene: Phaser.Scene, depth: number, alpha = 0.6, onTap?: () => void): Phaser.GameObjects.Rectangle {
  const r = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x0b0805, alpha).setOrigin(0).setDepth(depth).setInteractive();
  if (onTap) r.on('pointerup', onTap);
  return r;
}

/**
 * Parental gate (GDD §28): press and hold for two seconds, then pick the
 * answer to a sum. Calls `onPass` only if both are done.
 */
export function parentalGate(scene: Phaser.Scene, onPass: () => void, onCancel?: () => void): void {
  const depth = 8000;
  const items: Phaser.GameObjects.GameObject[] = [];
  const close = () => items.forEach((o) => o.destroy());
  items.push(blocker(scene, depth, 0.75));
  const W = scene.scale.width;
  const H = scene.scale.height;
  items.push(card(scene, W / 2, H / 2, 640, 420).setDepth(depth));
  items.push(scene.add.text(W / 2, H / 2 - 160, 'For grown-ups', { fontFamily: SERIF, fontSize: '38px', color: '#3b260b', fontStyle: 'bold' }).setOrigin(0.5).setDepth(depth));
  const msg = scene.add.text(W / 2, H / 2 - 105, 'Press and hold the key for 2 seconds.', { fontFamily: FONT, fontSize: '22px', color: '#5e3f10' }).setOrigin(0.5).setDepth(depth);
  items.push(msg);
  const ring = scene.add.graphics().setDepth(depth);
  items.push(ring);
  let held = 0;
  let holding = false;
  const key = roundButton(scene, W / 2, H / 2 + 10, '🔑', () => undefined, { r: 54, fontSize: 46 }).setDepth(depth);
  items.push(key);
  key.on('pointerdown', () => (holding = true));
  key.on('pointerup', () => (holding = false));
  key.on('pointerout', () => (holding = false));
  const tick = (_t: number, dt: number) => {
    if (!holding) {
      held = Math.max(0, held - dt);
    } else held += dt;
    ring.clear();
    ring.lineStyle(8, 0xffc928, 1);
    ring.beginPath();
    ring.arc(W / 2, H / 2 + 10, 66, -Math.PI / 2, -Math.PI / 2 + (Math.min(held, 2000) / 2000) * Math.PI * 2);
    ring.strokePath();
    if (held >= 2000) {
      scene.events.off('update', tick);
      key.destroy();
      ring.clear();
      askSum();
    }
  };
  scene.events.on('update', tick);
  const askSum = () => {
    const a = Phaser.Math.Between(4, 9);
    const b = Phaser.Math.Between(3, 8);
    msg.setText(`What is ${a} + ${b}?`);
    const answers = Phaser.Utils.Array.Shuffle([a + b, a + b + 2, a + b - 3]);
    answers.forEach((n, i) => {
      const btn = roundButton(scene, W / 2 + (i - 1) * 140, H / 2 + 40, String(n), () => {
        close();
        if (n === a + b) onPass();
        else onCancel?.();
      }, { r: 50, fontSize: 36 }).setDepth(depth);
      items.push(btn);
    });
  };
  const x = roundButton(scene, W / 2 + 290, H / 2 - 180, '✕', () => {
    scene.events.off('update', tick);
    close();
    onCancel?.();
  }, { r: 28, fontSize: 26 }).setDepth(depth);
  items.push(x);
}

/**
 * A keypad of letter stamps (initials) or code symbols. A physical keyboard
 * works too (matching keys, Backspace, and Enter → `onEnter`), so a child at
 * a computer who types isn't left wondering why nothing happens.
 */
export function keypad(
  scene: Phaser.Scene,
  x: number,
  y: number,
  keys: string,
  max: number,
  onChange: (value: string) => void,
  depth = 100,
  onEnter?: () => void,
): { destroy: () => void; value: () => string } {
  let value = '';
  const objs: Phaser.GameObjects.GameObject[] = [];
  const buttons = new Map<string, Phaser.GameObjects.Container>();
  const cols = keys.length > 16 ? 8 : 6;
  const shown = scene.add.text(x, y - 40, '', { fontFamily: SERIF, fontSize: '40px', color: '#3b260b', fontStyle: 'bold', backgroundColor: '#fff6e2', padding: { x: 16, y: 6 } }).setOrigin(0.5).setDepth(depth);
  objs.push(shown);
  const refresh = () => {
    shown.setText(value || '·');
    onChange(value);
  };
  const press = (k: string) => {
    if (value.length < max) value += k;
    refresh();
  };
  const erase = () => {
    value = value.slice(0, -1);
    refresh();
  };
  [...keys].forEach((k, i) => {
    const bx = x + ((i % cols) - (cols - 1) / 2) * 62;
    const by = y + 30 + Math.floor(i / cols) * 62;
    const b = roundButton(scene, bx, by, k, () => press(k), { r: 27, fontSize: 24 }).setDepth(depth);
    buttons.set(k.toUpperCase(), b);
    objs.push(b);
  });
  const rows = Math.ceil(keys.length / cols);
  const back = roundButton(scene, x + ((cols - 1) / 2) * 62 + 70, y + 30 + (rows - 1) * 62, '⌫', erase, { r: 27, fontSize: 24 }).setDepth(depth);
  objs.push(back);

  // Physical keyboard: flash the matching stamp so it feels the same as a tap.
  const flash = (b?: Phaser.GameObjects.Container) => {
    const draw = b?.getData('draw') as ((pressed: boolean) => void) | undefined;
    if (!b || !draw) return;
    draw(true);
    scene.time.delayedCall(110, () => b.active && draw(false));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.key === 'Backspace') {
      erase();
      flash(back);
    } else if (e.key === 'Enter') {
      onEnter?.();
    } else if (e.key.length === 1 && buttons.has(e.key.toUpperCase())) {
      const k = e.key.toUpperCase();
      click();
      press(k);
      flash(buttons.get(k));
    }
  };
  scene.input.keyboard?.on('keydown', onKey);
  let gone = false;
  const destroy = () => {
    if (gone) return;
    gone = true;
    scene.input.keyboard?.off('keydown', onKey);
    objs.forEach((o) => o.destroy());
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroy);
  refresh();
  return { destroy, value: () => value };
}

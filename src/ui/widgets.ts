import Phaser from 'phaser';
import { click } from '../audio/sfx';
import { speak, stopVoice } from '../audio/voice';
import { badge } from '../art/portraits';
import type { CharId } from '../content/types';
import { uiLineId } from '../content/voicelines';
import { profile, settings } from '../core/save';
import { CM, CM_CSS, drawPatina } from '../art/copperMoss';
import { withArt } from '../art/generated';
import { atlasFrame, followGraphic } from '../art/sprites';

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const SERIF = 'Georgia, "Times New Roman", serif';

/** Old semantic UI colours keep their meaning in the softer workshop palette. */
function materialColor(color: number): number {
  if (color === 0x8ce99a || color === 0xe8f7d8) return 0xb8c2a3;
  if (color === 0xffc928) return CM.tealLight;
  if (color === 0xe0ab48) return CM.brass;
  if (color === 0xf3e2bd || color === 0xfff6e2) return CM.cream;
  if (color === 0xe6e0ff) return 0xd1d3bc;
  return color;
}

function rivet(g: Phaser.GameObjects.Graphics, x: number, y: number, r = 3.6): void {
  g.fillStyle(CM.ink, 0.85);
  g.fillCircle(x, y + 0.8, r + 1);
  g.fillStyle(CM.brass, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(0.8, CM.cream, 0.75);
  g.strokeCircle(x - 0.4, y - 0.5, r - 0.8);
  g.lineStyle(1, CM.copperDark, 0.9);
  g.lineBetween(x - r * 0.48, y + r * 0.3, x + r * 0.48, y - r * 0.3);
}

/** A timber-backed parchment plate. Age marks stay on the rim, away from words. */
function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number, edge: number, selected = false): void {
  const radius = Math.min(20, h / 4);
  g.fillStyle(CM.ink, 0.28);
  g.fillRoundedRect(x + 3, y + 6, w, h, radius);
  g.fillStyle(edge, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(1.5, CM.ink, 0.95);
  g.strokeRoundedRect(x, y, w, h, radius);
  g.lineStyle(1, CM.copperLight, 0.75);
  g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, Math.max(2, radius - 3));
  g.fillStyle(selected ? CM.teal : CM.copperDark, 1);
  g.fillRoundedRect(x + 6, y + 6, w - 12, h - 12, Math.max(2, radius - 5));
  g.fillStyle(materialColor(fill), 1);
  g.fillRoundedRect(x + 10, y + 10, w - 20, h - 20, Math.max(2, radius - 8));
  g.lineStyle(1, CM.inkSoft, 0.65);
  g.strokeRoundedRect(x + 10, y + 10, w - 20, h - 20, Math.max(2, radius - 8));
  g.lineStyle(0.8, CM.cream, 0.5);
  g.lineBetween(x + 18, y + 12, x + w - 18, y + 12.5);
  const seed = Math.round(w * 11 + h * 23);
  drawPatina(g, x + 9, y + 8, w - 18, 9, seed, 0.25);
  drawPatina(g, x + 9, y + h - 17, w - 18, 9, seed + 7, 0.25);
  if (h >= 74 && w >= 80) {
    [[x + 17, y + 17], [x + w - 17, y + 17], [x + 17, y + h - 17], [x + w - 17, y + h - 17]].forEach(([rx, ry]) => rivet(g, rx, ry));
  } else {
    rivet(g, x + 13, y + h / 2, 2.7);
    rivet(g, x + w - 13, y + h / 2, 2.7);
  }
  if (selected) {
    g.lineStyle(2, CM.tealLight, 0.9);
    g.strokeRoundedRect(x + 7.5, y + 7.5, w - 15, h - 15, Math.max(2, radius - 6));
  }
}

/** Etched, monochrome alternatives to the platform-coloured emoji controls. */
function etchedIcon(g: Phaser.GameObjects.Graphics, icon: string, y: number, size: number): boolean {
  const k = size / 34;
  const line = (x1: number, y1: number, x2: number, y2: number) => g.lineBetween(x1 * k, y + y1 * k, x2 * k, y + y2 * k);
  g.lineStyle(2.6 * k, CM.ink, 1);
  if (icon === '🔍') {
    g.strokeCircle(-3 * k, y - 3 * k, 10 * k);
    line(5, 5, 15, 15);
    g.lineStyle(1 * k, CM.inkSoft, 0.6);
    g.strokeCircle(-3 * k, y - 3 * k, 7 * k);
  } else if (icon === '🔑') {
    g.strokeCircle(-7 * k, y - 5 * k, 8 * k);
    line(-1, 0, 13, 14);
    line(7, 8, 12, 3);
    line(11, 12, 16, 7);
  } else if (icon === '🔊' || icon === '🔇') {
    const points = [[-14, -5], [-8, -5], [0, -12], [0, 12], [-8, 5], [-14, 5]].map(([x, yy]) => new Phaser.Math.Vector2(x * k, y + yy * k));
    g.strokePoints(points, true);
    if (icon === '🔇') {
      line(6, -6, 16, 6);
      line(6, 6, 16, -6);
    } else {
      g.beginPath();
      g.arc(0, y, 8 * k, -0.9, 0.9);
      g.strokePath();
      g.beginPath();
      g.arc(0, y, 15 * k, -0.8, 0.8);
      g.strokePath();
    }
  } else if (icon === '💬') {
    g.strokeRoundedRect(-15 * k, y - 11 * k, 30 * k, 21 * k, 5 * k);
    line(-7, 10, -11, 16);
    line(-11, 16, 1, 10);
    [-7, 0, 7].forEach((x) => {
      g.fillStyle(CM.ink, 1);
      g.fillCircle(x * k, y, 1.3 * k);
    });
  } else if (icon === '👥') {
    [-7, 7].forEach((x) => {
      g.strokeCircle(x * k, y - 8 * k, 5 * k);
      g.strokeRoundedRect((x - 7) * k, y + 1 * k, 14 * k, 12 * k, 5 * k);
    });
  } else if (icon === '👁') {
    const points = [[-16, 0], [-8, -8], [0, -10], [8, -8], [16, 0], [8, 8], [0, 10], [-8, 8]].map(([x, yy]) => new Phaser.Math.Vector2(x * k, y + yy * k));
    g.strokePoints(points, true);
    g.strokeCircle(0, y, 6 * k);
    g.fillStyle(CM.ink, 1);
    g.fillCircle(0, y, 2.2 * k);
  } else if (icon === '👀') {
    [-8, 8].forEach((x) => {
      g.strokeEllipse(x * k, y, 14 * k, 20 * k);
      g.fillStyle(CM.ink, 1);
      g.fillCircle((x + 2) * k, y, 3 * k);
    });
  } else if (icon === '💾') {
    g.strokeRoundedRect(-13 * k, y - 14 * k, 26 * k, 28 * k, 2 * k);
    g.strokeRect(-6 * k, y - 12 * k, 13 * k, 9 * k);
    g.strokeRect(-7 * k, y + 3 * k, 14 * k, 10 * k);
    line(3, -11, 3, -5);
  } else if (icon === '📖') {
    const page = (side: number) => {
      const pts = [[0, -9], [side * 13, -12], [side * 13, 10], [0, 13]].map(([x, yy]) => new Phaser.Math.Vector2(x * k, y + yy * k));
      g.strokePoints(pts, true);
      [-5, 0, 5].forEach((yy) => line(side * 4, yy, side * 10, yy - 2));
    };
    page(-1);
    page(1);
  } else if (icon === '⏱') {
    g.strokeCircle(0, y + 2 * k, 12 * k);
    line(-4, -16, 4, -16);
    line(0, -16, 0, -11);
    line(0, 2, 0, -5);
    line(0, 2, 6, 6);
    line(9, -9, 12, -12);
  } else if (icon === '👂') {
    g.beginPath();
    g.arc(0, y - 3 * k, 12 * k, -2.8, 1.2);
    g.strokePath();
    line(4, 8, -1, 14);
    line(-1, 14, -6, 12);
    g.beginPath();
    g.arc(0, y - 3 * k, 6 * k, -2.6, 1.8);
    g.strokePath();
    line(-2, 4, -6, 4);
  } else if (icon === '🛠') {
    line(-12, 12, 10, -10);
    g.strokeCircle(-12 * k, y + 12 * k, 2.2 * k);
    line(4, -14, 4, -6);
    line(4, -6, 12, -6);
    line(12, -6, 16, -10);
    line(-11, -11, 13, 13);
    g.strokeRect(-15 * k, y - 15 * k, 12 * k, 7 * k);
  } else if (icon === '🧹') {
    line(12, -14, -2, 2);
    const pts = [[-2, 0], [4, 5], [-6, 15], [-15, 7]].map(([x, yy]) => new Phaser.Math.Vector2(x * k, y + yy * k));
    g.strokePoints(pts, true);
    line(-1, 5, -9, 12);
    line(-4, 3, -12, 9);
  } else return false;
  return true;
}

export interface ButtonOpts {
  r?: number;
  fontSize?: number;
  label?: string;
  color?: number;
  /** Speak this when tapped (read-aloud for menus). */
  say?: string;
  disabled?: boolean;
}

/** Copper-rimmed workshop button with a generous touch area (GDD §12.2). */
export function roundButton(scene: Phaser.Scene, x: number, y: number, icon: string, onTap: () => void, opts: ButtonOpts = {}): Phaser.GameObjects.Container {
  const r = opts.r ?? 38;
  const face = materialColor(opts.color ?? CM.brass);
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  let currentIcon = icon;
  let painted: Phaser.GameObjects.Image | undefined;
  const draw = (pressed: boolean) => {
    const py = pressed ? 2 : 0;
    g.clear();
    if (!painted) {
    g.fillStyle(CM.ink, 0.35);
    g.fillCircle(2, pressed ? 3 : 5, r);
    g.fillStyle(CM.copperDark, 1);
    g.fillCircle(0, py, r);
    g.lineStyle(1.5, CM.ink, 1);
    g.strokeCircle(0, py, r);
    g.fillStyle(CM.copperLight, 1);
    g.fillCircle(-0.5, py - 0.5, r - 2.5);
    g.fillStyle(CM.copperDark, 1);
    g.fillCircle(0, py, r - 5);
    g.fillStyle(pressed ? Phaser.Display.Color.ValueToColor(face).darken(7).color : face, opts.disabled ? 0.55 : 1);
    g.fillCircle(0, py, r - 7);
    g.lineStyle(1, CM.inkSoft, 0.9);
    g.strokeCircle(0, py, r - 7);
    g.lineStyle(1, CM.cream, 0.75);
    g.beginPath();
    g.arc(-0.5, py - 0.5, r - 3.5, -2.9, -0.3);
    g.strokePath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.25;
      g.lineStyle(0.8, CM.ink, 0.3);
      g.lineBetween(Math.cos(angle) * (r - 5), py + Math.sin(angle) * (r - 5), Math.cos(angle + 0.03) * (r - 1), py + Math.sin(angle + 0.03) * (r - 1));
    }
    if (r >= 32) [-1, 1].forEach((side) => rivet(g, side * r * 0.78, py, 2));
    }
    const isEtched = etchedIcon(g, currentIcon, py + (opts.label ? -6 : 0), opts.fontSize ?? 34);
    // Preserve the semantic icon for input helpers while drawing the etched mark.
    t.setText(currentIcon).setVisible(!isEtched);
    if (painted) painted.setFrame(atlasFrame(scene, painted.texture.key, pressed ? 3 : 2, 2, 2, true)).setPosition(0, py);
  };
  const t = scene.add
    .text(0, opts.label ? -6 : 0, icon, { fontFamily: FONT, fontSize: `${opts.fontSize ?? 34}px`, color: CM_CSS.ink })
    .setOrigin(0.5);
  draw(false);
  c.add([g, t]);
  withArt(scene, 'ui-surfaces', (key) => {
    if (!c.active || !c.scene) return;
    painted = scene.add.image(0, 0, key, atlasFrame(scene, key, 2, 2, 2, true)).setDisplaySize(r * 2 + 4, r * 2 + 4).setAlpha(opts.disabled ? 0.55 : 1);
    c.addAt(painted, 0);
    // Etched glyphs remain live and readable above the painted bezel.
    g.clear();
    const originalDraw = c.getData('draw') as ((pressed: boolean) => void) | undefined;
    c.setData('paintedFace', painted);
    if (originalDraw) originalDraw(false);
  });
  if (opts.label) {
    c.add(scene.add.text(0, r * 0.48, opts.label, { fontFamily: FONT, fontSize: '13px', color: CM_CSS.ink, fontStyle: 'bold' }).setOrigin(0.5));
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
  c.setData('setIcon', (next: string) => {
    currentIcon = next;
    draw(down);
  });
  return c;
}

export function setButtonIcon(btn: Phaser.GameObjects.Container, icon: string): void {
  const update = btn.getData('setIcon') as ((value: string) => void) | undefined;
  if (update) update(icon);
  else (btn.getData('icon') as Phaser.GameObjects.Text).setText(icon);
}

/** A parchment card held by a worn copper frame. */
export function card(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill: number = CM.cream, edge: number = CM.copperDark): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  drawPanel(g, x - w / 2, y - h / 2, w, h, fill, edge);
  if (w / h > 0.7 && w / h < 1.7) withArt(scene, 'ui-surfaces', (key) => {
    if (!g.active || !g.scene) return;
    const image = scene.add.image(0, 0, key, atlasFrame(scene, key, 0, 2, 2, true));
    g.clear(); followGraphic(g, image, x, y, w, h);
  });
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
  let painted: Phaser.GameObjects.Image | undefined;
  const draw = (pressed: boolean) => {
    g.clear();
    drawPanel(g, -w / 2, -h / 2 + (pressed ? 3 : 0), w, h, opts.locked ? 0xb8ac92 : opts.fill ?? CM.cream, CM.copperDark, opts.selected);
    if (painted) { g.clear(); painted.setY(pressed ? 3 : 0); }
  };
  draw(false);
  c.add(g);
  withArt(scene, 'ui-surfaces', (key) => {
    if (!c.active || !c.scene) return;
    painted = scene.add.image(0, 0, key, atlasFrame(scene, key, opts.selected ? 1 : 0, 2, 2, true)).setDisplaySize(w, h).setName('ui:painted-tile');
    if (opts.locked) painted.setTint(0xb7ad96);
    c.addAt(painted, 1); g.clear();
  });
  if (opts.caption) {
    const caption = scene.add.text(0, 0, opts.caption, { fontFamily: FONT, fontSize: `${Math.max(14, opts.captionSize ?? 15)}px`, color: CM_CSS.ink, align: 'center', fontStyle: 'bold', wordWrap: { width: w - 40 } }).setOrigin(0.5);
    // Keep both lines on the parchment, above the thicker copper frame.
    caption.y = h * 0.33 - caption.height / 2;
    c.add(caption);
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

export function title(scene: Phaser.Scene, x: number, y: number, text: string, size = 46, color = CM_CSS.copperDark): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: SERIF, fontSize: `${size}px`, color, fontStyle: 'bold', stroke: CM_CSS.cream, strokeThickness: Math.max(1, Math.round(size / 26)) })
    .setOrigin(0.5)
    .setShadow(1, 2, CM_CSS.ink, 1, false, true);
}

export function body(scene: Phaser.Scene, x: number, y: number, text: string, size = 20, color = CM_CSS.ink, width = 600): Phaser.GameObjects.Text {
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
      .text(-width / 2 + 82, 0, '', { fontFamily: FONT, fontSize: '22px', color: CM_CSS.ink, wordWrap: { width: width - 100 }, lineSpacing: 3 })
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
    drawPanel(this.bg, -this.bw / 2, -h / 2, w, h, CM.cream, CM.copperDark);
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
    g.lineStyle(4, CM.teal, 1);
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
  drawPanel(g, -w / 2, -42, w, 80, CM.cream, CM.copperDark, true);
  c.add(g);
  const icon = scene.add.graphics();
  if (draw) {
    icon.setPosition(-w / 2 + 46, -2);
    draw(icon);
    c.add(icon);
  } else if (glyph) {
    c.add(scene.add.text(-w / 2 + 46, -2, glyph, { fontFamily: FONT, fontSize: '40px', color: CM_CSS.tealDark }).setOrigin(0.5));
  }
  c.add(scene.add.text(-w / 2 + 92, -2, showWords() ? label : '', { fontFamily: FONT, fontSize: '22px', color: CM_CSS.ink, fontStyle: 'bold', wordWrap: { width: w - 115 } }).setOrigin(0, 0.5));
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
  const r = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, CM.ink, alpha).setOrigin(0).setDepth(depth).setInteractive();
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
  items.push(scene.add.text(W / 2, H / 2 - 160, 'For grown-ups', { fontFamily: SERIF, fontSize: '38px', color: CM_CSS.ink, fontStyle: 'bold' }).setOrigin(0.5).setDepth(depth));
  const msg = scene.add.text(W / 2, H / 2 - 105, 'Press and hold the key for 2 seconds.', { fontFamily: FONT, fontSize: '22px', color: CM_CSS.inkSoft }).setOrigin(0.5).setDepth(depth);
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
    ring.lineStyle(7, CM.teal, 1);
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
  const stampWidth = max > 10 ? 740 : Math.max(140, max * 32 + 42);
  const stampPlate = card(scene, x, y - 40, stampWidth, 64).setDepth(depth);
  objs.push(stampPlate);
  const shown = scene.add.text(x, y - 40, '', { fontFamily: SERIF, fontSize: '40px', color: CM_CSS.ink, fontStyle: 'bold' }).setOrigin(0.5).setDepth(depth).setName('keypad-value');
  objs.push(shown);
  const refresh = () => {
    shown.setFontSize(40).setText(value || '·');
    if (shown.width > stampWidth - 48) shown.setFontSize(Math.floor(40 * (stampWidth - 48) / shown.width));
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

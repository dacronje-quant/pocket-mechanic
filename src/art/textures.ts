import Phaser from 'phaser';
import { MODULE, pitchRadius } from '../mechanism/graph';
import { CM } from './copperMoss';

/** Etched metal textures are drawn once and shared by every room. */
export type GearVariant = 'brass' | 'copper' | 'gold' | 'ghost' | 'steel';

const PALETTES: Record<Exclude<GearVariant, 'ghost'>, { rim: number; face: number; light: number; dark: number }> = {
  brass: { rim: CM.woodDark, face: CM.brass, light: CM.paper, dark: CM.ink },
  copper: { rim: CM.copperDark, face: CM.copper, light: CM.copperLight, dark: CM.ink },
  gold: { rim: 0x9a763e, face: 0xd5b86d, light: 0xf3dfaa, dark: 0x54442d },
  steel: { rim: 0x606b67, face: 0x91a19a, light: 0xcbd3bd, dark: 0x37423d },
};

export function gearKey(teeth: number, variant: GearVariant): string {
  return `gear-${teeth}-${variant}`;
}

function gearOutline(cx: number, cy: number, teeth: number, rPitch: number, module: number): Phaser.Math.Vector2[] {
  const ro = rPitch + module * 0.95;
  const rr = rPitch - module * 1.05;
  const p = (Math.PI * 2) / teeth;
  const pts: Phaser.Math.Vector2[] = [];
  const add = (r: number, a: number) => pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  for (let i = 0; i < teeth; i++) {
    const a = i * p;
    add(rr, a - 0.5 * p);
    add(rr, a - 0.27 * p);
    add(ro, a - 0.14 * p);
    add(ro, a + 0.14 * p);
    add(rr, a + 0.27 * p);
  }
  return pts;
}

/** A stable hash gives each stamped gear its own scratches without frame noise. */
const grain = (n: number, salt: number) => {
  const q = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return q - Math.floor(q);
};

/** Make (once) and return the texture key for a gear. */
export function ensureGearTexture(scene: Phaser.Scene, teeth: number, variant: GearVariant, module = MODULE): string {
  const key = gearKey(teeth, variant);
  if (scene.textures.exists(key)) return key;
  // Supersampled native geometry keeps every tooth and pitch radius exact.
  // Lighting is baked once, so rotating and dragging remain ordinary sprites.
  const r = pitchRadius(teeth, module), ro = r + module * 0.95;
  const size = Math.ceil((ro + 6) * 2), c = size / 2;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size * 2;
  const ctx = canvas.getContext('2d')!; ctx.scale(2, 2);
  const outline = gearOutline(c, c, teeth, r, module);
  const path = new Path2D();
  outline.forEach((p, i) => i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y)); path.closePath();
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
  const circle = (x: number, y: number, radius: number, fill: string | CanvasGradient) => {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, radius), 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  };
  if (variant === 'ghost') {
    ctx.fillStyle = 'rgba(246,230,183,.22)'; ctx.fill(path);
    ctx.strokeStyle = 'rgba(255,240,188,.95)'; ctx.lineWidth = 3; ctx.stroke(path);
    ctx.beginPath(); ctx.arc(c, c, Math.max(8, r * 0.22), 0, Math.PI * 2); ctx.lineWidth = 2; ctx.stroke();
  } else {
    const pal = PALETTES[variant], inner = Math.max(2, r - module * 2.2);
    ctx.save(); ctx.translate(1.5, 3); ctx.fillStyle = '#29251f'; ctx.fill(path); ctx.restore();
    const metal = ctx.createLinearGradient(c - ro, c - ro, c + ro, c + ro);
    metal.addColorStop(0, hex(pal.light)); metal.addColorStop(.22, hex(pal.face));
    metal.addColorStop(.44, hex(pal.light)); metal.addColorStop(.59, hex(pal.face)); metal.addColorStop(1, hex(pal.rim));
    ctx.fillStyle = metal; ctx.fill(path);
    ctx.lineWidth = 1.2; ctx.strokeStyle = hex(pal.dark); ctx.stroke(path);
    ctx.save(); ctx.clip(path);
    // Shallow tooth facets catch light independently, without changing the outline.
    const bevel = Math.min(2.7, module * .6);
    for (let i = 0; i < outline.length; i++) {
      const p = outline[i], next = outline[(i + 1) % outline.length];
      const angle = Math.atan2(next.y - p.y, next.x - p.x);
      const lit = Math.cos(angle + Math.PI * .25) > 0;
      ctx.strokeStyle = lit ? 'rgba(255,242,204,.66)' : 'rgba(49,32,20,.43)'; ctx.lineWidth = bevel;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(next.x, next.y); ctx.stroke();
    }
    const face = ctx.createRadialGradient(c - inner * .3, c - inner * .45, inner * .08, c, c, inner);
    face.addColorStop(0, hex(pal.light)); face.addColorStop(.38, hex(pal.face));
    face.addColorStop(.84, hex(pal.face)); face.addColorStop(1, hex(pal.rim));
    circle(c, c, inner, face);
    ctx.lineWidth = 1.1; ctx.strokeStyle = hex(pal.dark); ctx.stroke();
    ctx.beginPath(); ctx.arc(c - .4, c - .6, Math.max(1, inner - 1.2), Math.PI * .95, Math.PI * 1.85);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,241,202,.7)'; ctx.stroke();
    // Stable scuffs retain the hand-made copper-and-moss finish.
    for (let i = 0; i < Math.min(85, Math.max(14, teeth * 2)); i++) {
      const a = grain(i, teeth + 1) * Math.PI * 2, rr = Math.sqrt(grain(i, teeth + 2)) * inner * .91;
      const x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
      const len = Math.min(2 + grain(i, 5) * 4, Math.max(1, inner - rr));
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,244,213,.35)' : 'rgba(55,36,22,.19)'; ctx.lineWidth = .55;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y - len * .37); ctx.stroke();
      if (variant === 'copper' && i % 7 === 0) { ctx.fillStyle = 'rgba(65,109,89,.28)'; ctx.fillRect(x, y, 2 + grain(i, 6) * 3, 1.5); }
    }
    if (teeth >= 16) {
      const holes = teeth >= 30 ? 6 : teeth >= 22 ? 5 : 4, hr = inner * .23;
      for (let i = 0; i < holes; i++) {
        const a = i / holes * Math.PI * 2 + Math.PI / holes;
        const x = c + Math.cos(a) * inner * .57, y = c + Math.sin(a) * inner * .57;
        const recess = ctx.createLinearGradient(x, y - hr, x, y + hr);
        recess.addColorStop(0, '#211b16'); recess.addColorStop(.55, hex(pal.dark)); recess.addColorStop(1, hex(pal.rim));
        circle(x, y, hr + .9, hex(pal.rim)); circle(x, y, hr, recess);
        ctx.beginPath(); ctx.arc(x, y + .5, hr, .1, Math.PI - .1);
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,237,193,.66)'; ctx.stroke();
      }
    }
    const hub = Math.max(8, r * .24);
    circle(c + .5, c + 1, hub + 1, hex(pal.dark));
    const hubMetal = ctx.createRadialGradient(c - hub * .4, c - hub * .45, .5, c, c, hub);
    hubMetal.addColorStop(0, hex(pal.light)); hubMetal.addColorStop(.5, hex(pal.face)); hubMetal.addColorStop(1, hex(pal.rim));
    circle(c, c, hub, hubMetal); circle(c, c, Math.max(3, hub * .38), '#2c261d');
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2, x = c + Math.cos(a) * hub * .72, y = c + Math.sin(a) * hub * .72;
      circle(x, y, 1.7, hex(pal.dark)); circle(x - .45, y - .5, .8, hex(pal.light));
    }
    circle(c + inner * .82, c, Math.max(2.5, module * .55), hex(pal.light));
    ctx.restore();
  }
  // Keep the logical texture dimensions identical to the previous gear sprite.
  const finalCanvas = document.createElement('canvas'); finalCanvas.width = finalCanvas.height = size;
  finalCanvas.getContext('2d')!.drawImage(canvas, 0, 0, size, size);
  scene.textures.addCanvas(key, finalCanvas);
  return key;
}

/** Shared effects keep their light cores so tinting and power indicators stay readable. */
export function ensureBasics(scene: Phaser.Scene): void {
  const make = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  make('spark', 16, 16, (g) => {
    g.fillStyle(0xffffff, 0.4); g.fillCircle(8, 8, 6);
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 3);
  });
  make('star', 24, 24, (g) => {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 11 : 3.5;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      pts.push(new Phaser.Math.Vector2(12 + Math.cos(a) * r, 12 + Math.sin(a) * r));
    }
    g.fillStyle(0xf4dfac, 1); g.fillPoints(pts, true);
    g.lineStyle(0.7, 0x9b794d, 0.65); g.strokePoints(pts, true, true);
  });
  make('mote', 6, 6, (g) => { g.fillStyle(0xfff1c9, 1); g.fillCircle(3, 3, 2); });
  make('note', 20, 24, (g) => {
    g.fillStyle(0xffffff, 1); g.fillEllipse(7, 18, 11, 8);
    g.fillRect(11, 2, 3, 16); g.fillTriangle(13, 2, 13, 8, 19, 7);
  });
  make('minigear', 20, 20, (g) => {
    g.fillStyle(0xbda269, 1);
    for (let i = 0; i < 8; i++) g.fillCircle(10 + Math.cos(i * Math.PI / 4) * 7, 10 + Math.sin(i * Math.PI / 4) * 7, 2.2);
    g.fillCircle(10, 10, 6.5);
    g.lineStyle(0.7, 0x57442e, 1); g.strokeCircle(10, 10, 6);
    g.fillStyle(0x57442e, 1); g.fillCircle(10, 10, 2.2);
    g.fillStyle(0xe9d6a9, 0.9); g.fillCircle(7, 6, 1);
  });
  make('puff', 32, 32, (g) => {
    g.fillStyle(0xffffff, 0.65); g.fillCircle(16, 16, 12);
    g.fillStyle(0xffffff, 0.45); g.fillCircle(10, 12, 8); g.fillCircle(22, 12, 8);
  });
  make('drop', 12, 16, (g) => {
    g.fillStyle(0xffffff, 1); g.fillCircle(6, 10, 5); g.fillTriangle(1.5, 8, 10.5, 8, 6, 0);
  });
  make('confetti', 10, 6, (g) => { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 10, 6); });
  make('bit', 16, 16, (g) => {
    g.fillStyle(0xb99a62, 1); g.fillCircle(8, 8, 7);
    g.lineStyle(0.7, 0x53432d, 1); g.strokeCircle(8, 8, 7);
    g.fillStyle(0x57442e, 1); g.fillCircle(8, 8, 3);
    g.fillStyle(0xefe0b4, 0.85); g.fillCircle(6, 5, 1.5);
  });
  make('ring', 64, 64, (g) => { g.lineStyle(4, 0xffffff, 1); g.strokeCircle(32, 32, 28); });
  make('beamdot', 12, 12, (g) => {
    g.fillStyle(0xffffff, 0.4); g.fillCircle(6, 6, 6);
    g.fillStyle(0xffffff, 1); g.fillCircle(6, 6, 4);
  });
  make('glow', 64, 64, (g) => {
    for (let i = 20; i > 0; i--) { g.fillStyle(0xffd76a, 0.05); g.fillCircle(32, 32, i * 1.6); }
  });
}

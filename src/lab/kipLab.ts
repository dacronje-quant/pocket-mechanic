/** Dev-only comparison page for the Kip redraw prototype (kip-lab.html). */
import Phaser from 'phaser';
import { Kip } from '../art/Kip';
import { beginArtScene } from '../art/generated';
import { DEFAULT_LOOK, type KipLook } from '../content/cosmetics';
import { drawKip, POSES, type KipPose } from '../art/kipVector';
import { CM_CSS } from '../art/copperMoss';

const L = (o: Partial<KipLook>): KipLook => ({ ...DEFAULT_LOOK, ...o });
export const CASES: Array<{ name: string; look: KipLook; pose: keyof typeof POSES }> = [
  { name: 'Default', look: DEFAULT_LOOK, pose: 'idle' },
  { name: 'Party hat, cheering', look: L({ hat: 'hat-party' }), pose: 'cheer' },
  { name: 'Top hat + monocle, silver', look: L({ hat: 'hat-tophat', eyes: 'eyes-monocle', finish: 'finish-silver' }), pose: 'idle' },
  { name: 'Captain, walking, wheels', look: L({ hat: 'hat-captain', feet: 'feet-wheels' }), pose: 'walk' },
  { name: 'Flower crown, heart eyes, verdigris', look: L({ hat: 'hat-flowers', eyes: 'eyes-heart', finish: 'finish-verdigris' }), pose: 'idle' },
  { name: "Baker's toque, sleepy", look: L({ hat: 'hat-toque', feet: 'feet-clogs' }), pose: 'sleepy' },
  { name: 'Graduation, star eyes, rocket boots', look: L({ hat: 'hat-grad', eyes: 'eyes-star', feet: 'feet-rocket', finish: 'finish-gunmetal' }), pose: 'cheer' },
  { name: 'Feathered hat, telescope eyes', look: L({ hat: 'hat-feather', eyes: 'eyes-telescope', finish: 'finish-pearl' }), pose: 'idle' },
];

const CELL_W = 300, CELL_H = 260, KIP_H = 210;
const COLS = 4;
const rows = Math.ceil(CASES.length / COLS);
const W = CELL_W * COLS, H = CELL_H * rows;

// Prototype sheet (2x for crispness).
const proto = document.getElementById('proto') as HTMLCanvasElement;
proto.width = W * 2; proto.height = H * 2;
proto.style.width = `${W}px`;
const ctx = proto.getContext('2d')!;
ctx.scale(2, 2);
CASES.forEach((c, i) => {
  const x = (i % COLS) * CELL_W, y = Math.floor(i / COLS) * CELL_H;
  ctx.fillStyle = i % 2 ? '#d9c9a6' : CM_CSS.paper;
  ctx.fillRect(x, y, CELL_W, CELL_H);
  drawKip(ctx, x + CELL_W / 2, y + CELL_H - 30, KIP_H, c.look, POSES[c.pose] as KipPose);
  ctx.fillStyle = CM_CSS.ink;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Prototype · ${c.name}`, x + 10, y + 18);
});

// The current Kip at the same on-screen height, through the real game class.
class Current extends Phaser.Scene {
  create(): void {
    beginArtScene(this);
    CASES.forEach((c, i) => {
      const x = (i % COLS) * CELL_W, y = Math.floor(i / COLS) * CELL_H;
      this.add.rectangle(x, y, CELL_W, CELL_H, i % 2 ? 0xd9c9a6 : 0xe9dcc0).setOrigin(0);
      // Kip is ~94px tall in game; scale to match the prototype's height.
      const k = new Kip(this, x + CELL_W / 2, y + CELL_H - 30, c.look);
      k.setScale(KIP_H / 100);
      this.add.text(x + 10, y + 8, `Current · ${c.name}`, { fontFamily: 'system-ui', fontSize: '13px', color: CM_CSS.ink });
    });
    (window as unknown as { labReady: boolean }).labReady = true;
  }
}
new Phaser.Game({ type: Phaser.CANVAS, parent: 'current', width: W, height: H, backgroundColor: '#2b2722', scene: Current, resolution: 1 } as Phaser.Types.Core.GameConfig);

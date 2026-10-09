/**
 * The Pin Garden (GDD §8.5): a pinned cylinder turns under the steel comb;
 * every pin plucks a note. Push pins into the holes to bring the melody back.
 * Little Tinkers see the missing holes glow; Engineers recreate it by ear.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { playMelody } from '../audio/music';
import { NOTE_FREQS, pinKey, pinProgress, pinSet } from '../mechanism/pins';
import { D, RoomBase, type HintTarget } from './RoomBase';
import { roundButton, toast } from '../ui/widgets';
import { checkStamps, setFlag } from '../core/progress';
import { persist, profile } from '../core/save';

export class MusicRoom extends RoomBase<'music'> {
  private x0 = 230;
  private y0 = 150;
  private cw = 52;
  private ch = 42;
  private gridG!: Phaser.GameObjects.Graphics;
  private headG!: Phaser.GameObjects.Graphics;
  private comb!: Phaser.GameObjects.Graphics;
  private head = 0;
  private lastStep = -1;
  private ring: number[] = [];
  private melody = new Set<string>();

  constructor() {
    super('room-music');
  }

  protected build(): void {
    const steps = this.def.steps;
    const notes = this.def.notes;
    this.cw = Math.min(54, Math.floor(820 / steps));
    this.ch = Math.min(44, Math.floor(360 / notes));
    this.x0 = 640 - (steps * this.cw) / 2 - 40;
    this.y0 = 130 + (380 - notes * this.ch) / 2;
    this.melody = pinSet(this.def.melody);
    this.ring = new Array(notes).fill(0);
    this.head = 0;
    this.lastStep = -1;
    const back = this.add.graphics().setDepth(D.back + 1);
    back.fillStyle(0x000000, 0.3);
    back.fillRoundedRect(this.x0 - 24, this.y0 - 18, steps * this.cw + 48, notes * this.ch + 36, 30);
    back.fillStyle(0xc0c8d0, 1);
    back.fillRoundedRect(this.x0 - 20, this.y0 - 20, steps * this.cw + 40, notes * this.ch + 36, 28);
    back.fillStyle(0xe9ecef, 1);
    back.fillRoundedRect(this.x0 - 14, this.y0 - 14, steps * this.cw + 28, notes * this.ch * 0.45, 20);
    this.gridG = this.add.graphics().setDepth(D.mech);
    this.headG = this.add.graphics().setDepth(D.mech + 1);
    this.comb = this.add.graphics().setDepth(D.mech + 2);
    const zone = this.add.zone(this.x0, this.y0, steps * this.cw, notes * this.ch).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(D.mech + 3);
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      const s = Math.floor((p.worldX - this.x0) / this.cw);
      const n = notes - 1 - Math.floor((p.worldY - this.y0) / this.ch);
      if (s >= 0 && s < steps && n >= 0 && n < notes) this.togglePin(s, n);
    });
    roundButton(this, 1180, 600, '👂', () => this.listen(), { r: 46, fontSize: 38, color: 0x8ce99a, say: 'Listen to the song' }).setDepth(D.hud);
    if (this.launch.mode === 'playground') {
      // Compose Your Own (GDD §14, Repair 2): clear the cylinder and write a tune to keep
      roundButton(this, 100, 600, '🧹', () => {
        this.state.clear();
        this.drawGrid();
      }, { r: 40, fontSize: 32, say: 'Clear the pins' }).setDepth(D.hud);
      roundButton(this, 200, 640, '💾', () => this.saveSong(), { r: 40, fontSize: 32, say: 'Keep my song' }).setDepth(D.hud);
    }
  }

  private saveSong(): void {
    const p = profile();
    if (!this.state.size) return;
    if (p.composed.length >= 12) p.composed.shift();
    p.composed.push({ name: `Song ${p.composed.length + 1}`, pins: [...this.state] });
    setFlag(p, 'compose');
    const st = checkStamps(p);
    persist();
    sfx.sparkle();
    toast(this, 'Song saved! Play it in your Nook.', undefined, '🎼');
    for (const x of st) toast(this, `Stamp: ${x.name}`, undefined, x.glyph);
  }

  private listen(): void {
    const notes: number[] = new Array(this.def.steps).fill(-1);
    for (const [s, n] of this.def.melody) notes[s] = n;
    playMelody(notes, this.def.tempo, 'sine');
  }

  private togglePin(s: number, n: number): void {
    if (this.fixed) return;
    const k = pinKey(s, n);
    const set = this.state;
    const had = set.has(k);
    if (had) set.delete(k);
    else set.add(k);
    sfx.note(NOTE_FREQS[n], 'pluck', 0.5);
    if (!had) sfx.clunk();
    else sfx.pickUp();
    this.sparkleAt(this.x0 + s * this.cw + this.cw / 2, this.y0 + (this.def.notes - 1 - n) * this.ch + this.ch / 2, had ? 3 : 8);
    this.drawGrid();
    this.act(() => {
      if (had) set.add(k);
      else set.delete(k);
    });
  }

  protected refresh(): void {
    this.drawGrid();
  }

  private drawGrid(): void {
    const g = this.gridG;
    g.clear();
    const { steps, notes } = this.def;
    const glow = this.style.id === 'tinker' && !this.fixed;
    for (let s = 0; s < steps; s++) {
      for (let n = 0; n < notes; n++) {
        const x = this.x0 + s * this.cw + this.cw / 2;
        const y = this.y0 + (notes - 1 - n) * this.ch + this.ch / 2;
        const k = pinKey(s, n);
        const pinned = this.state.has(k);
        if (pinned) {
          g.fillStyle(0x000000, 0.3);
          g.fillCircle(x + 2, y + 3, this.ch * 0.26);
          g.fillStyle(0xf8f9fa, 1);
          g.fillCircle(x, y, this.ch * 0.26);
          g.fillStyle(0x9aa6b4, 1);
          g.fillCircle(x + 2, y + 2, this.ch * 0.12);
        } else {
          const wanted = glow && this.melody.has(k);
          g.fillStyle(wanted ? 0xffd76a : 0x6c757d, wanted ? 0.5 + Math.sin(this.time.now / 200) * 0.3 : 0.55);
          g.fillCircle(x, y, this.ch * (wanted ? 0.2 : 0.09));
        }
      }
    }
  }

  protected tick(dt: number): void {
    const { steps, notes, tempo } = this.def;
    this.head = (this.head + dt * tempo) % steps;
    const s = Math.floor(this.head);
    if (s !== this.lastStep) {
      this.lastStep = s;
      for (let n = 0; n < notes; n++) {
        if (this.state.has(pinKey(s, n))) {
          sfx.note(NOTE_FREQS[n], 'chime', 0.45);
          this.ring[n] = 1;
        }
      }
      if (this.style.id === 'tinker') this.drawGrid();
    }
    const hg = this.headG;
    hg.clear();
    const x = this.x0 + this.head * this.cw;
    hg.fillStyle(0xfff3b0, 0.18);
    hg.fillRect(x - this.cw / 2 + this.cw / 2 - 6, this.y0 - 10, 12, notes * this.ch + 20);
    hg.lineStyle(2, 0xfff3b0, 0.8);
    hg.lineBetween(x + 0, this.y0 - 10, x, this.y0 + notes * this.ch + 10);
    // the steel comb: one tooth per note, ringing when plucked
    const cg = this.comb;
    cg.clear();
    const cx = this.x0 + steps * this.cw + 40;
    cg.fillStyle(0x6c757d, 1);
    cg.fillRect(cx + 70, this.y0 - 20, 22, notes * this.ch + 40);
    for (let n = 0; n < notes; n++) {
      const y = this.y0 + (notes - 1 - n) * this.ch + this.ch / 2;
      const wob = Math.sin(this.time.now / 30 + n) * this.ring[n] * 4;
      this.ring[n] *= Math.pow(0.05, dt);
      cg.fillStyle(0xdee2e6, 1);
      cg.fillRect(cx - 10 + (notes - n) * 4, y - 6 + wob, 82 - (notes - n) * 4, 12);
      cg.fillStyle(0xffffff, 0.6 * this.ring[n]);
      cg.fillCircle(cx, y + wob, 10);
    }
  }

  protected hintTarget(): HintTarget | null {
    const prog = pinProgress(this.state, this.def.melody);
    void prog;
    for (const [s, n] of this.def.melody) {
      if (!this.state.has(pinKey(s, n))) return { to: { x: this.x0 + s * this.cw + this.cw / 2, y: this.y0 + (this.def.notes - 1 - n) * this.ch + this.ch / 2 } };
    }
    for (const k of this.state) {
      if (!this.melody.has(k)) {
        const [s, n] = k.split(':').map(Number);
        return { to: { x: this.x0 + s * this.cw + this.cw / 2, y: this.y0 + (this.def.notes - 1 - n) * this.ch + this.ch / 2 } };
      }
    }
    return null;
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    if (this.style.id === 'tinker') return;
    for (const [s, n] of this.def.melody) {
      if (this.state.has(pinKey(s, n))) continue;
      g.lineStyle(3, 0xfff4c8, alpha);
      g.strokeCircle(this.x0 + s * this.cw + this.cw / 2, this.y0 + (this.def.notes - 1 - n) * this.ch + this.ch / 2, this.ch * 0.26);
    }
  }

  protected solutionSteps(): number {
    return this.def.missing.length + (this.def.extra?.length ?? 0);
  }
}

/**
 * Punch-card rooms for Big Bertie (GDD §8.9, Appendix C): punch move cards
 * into the rack (sequence), use Repeat cards (loops) and Sensor cards
 * (conditionals), press Play and Bertie dances. Little Tinkers get the
 * "Dance Party": big move buttons, Bertie copies the glowing move.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { CM, drawPatina } from '../art/copperMoss';
import { etchedPlate } from '../art/finish';
import { cardKey, runCards, type Card, type Move } from '../mechanism/cards';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';
import { FONT, roundButton } from '../ui/widgets';
import { cardsSolved } from '../rules';

const MOVE_ICON: Record<Move, string> = { stepL: '⬅', stepR: '➡', spin: '🔄', clap: '👏', wave: '👋', jump: '⬆' };
const MOVE_COLOR: Record<Move, number> = { stepL: 0x648995, stepR: 0x8a9b69, spin: 0x917d96, clap: 0xc2a168, wave: 0xbb785b, jump: 0x669891 };

interface CardView {
  card: Card;
  obj: Phaser.GameObjects.Container;
  home: { x: number; y: number };
  slot: number | null;
}

export class CardsRoom extends RoomBase<'cards'> {
  private views: CardView[] = [];
  private slotPos: Array<{ x: number; y: number }> = [];
  private bertie!: Phaser.GameObjects.Graphics;
  private sprites!: Phaser.GameObjects.Graphics;
  private stageX = 880;
  private stageY = 380;
  private pose: Move | null = null;
  private poseT = 0;
  private bx = 0;
  private queue: Move[] = [];
  private queueT = 0;
  private onQueueDone: (() => void) | null = null;
  private demo: Move[] = [];
  private demoT = 0;
  private playing = false;
  private sensorText?: Phaser.GameObjects.Text;
  private fast = false;
  private partyBtns: Array<{ move: Move; btn: Phaser.GameObjects.Container }> = [];
  private t = 0;

  constructor() {
    super('room-cards');
  }

  protected build(): void {
    this.views = [];
    this.slotPos = [];
    this.demo = [];
    this.pose = null;
    this.partyBtns = [];
    this.queue = [];
    this.playing = false;
    this.liveCheck = false;
    const tinker = this.style.id === 'tinker';
    // stage
    const st = this.add.graphics().setDepth(D.back + 1);
    st.fillStyle(0x000000, 0.3);
    st.fillEllipse(this.stageX + 6, this.stageY + 150, 380, 70);
    st.fillStyle(0x856c50, 1);
    st.fillEllipse(this.stageX, this.stageY + 140, 380, 70);
    st.fillStyle(0xad6b51, 1);
    st.fillRect(this.stageX - 200, 100, 30, 420);
    st.fillRect(this.stageX + 170, 100, 30, 420);
    if (this.def.show) {
      for (let i = 0; i < 9; i++) {
        st.fillStyle([0xe8c39e, 0xc68a5c, 0x8d5a3b, 0xf2c9a5][i % 4], 1);
        st.fillCircle(this.stageX - 180 + i * 45, 560, 18);
      }
    }
    this.bertie = this.add.graphics().setDepth(D.mech + 2);
    this.sprites = this.add.graphics().setDepth(D.mech + 3).setBlendMode(Phaser.BlendModes.ADD);
    if (this.def.scenarios.some((s) => s.sensors)) {
      this.sensorText = this.add
        .text(this.stageX, 120, '', { fontFamily: FONT, fontSize: '34px', color: '#f4ebd5', backgroundColor: '#342f29cc', padding: { x: 12, y: 4 } })
        .setOrigin(0.5)
        .setDepth(D.hud - 1);
    }
    roundButton(this, this.stageX + 150, 470, '👀', () => this.showDemo(), { r: 34, fontSize: 28, say: 'Watch the dance' }).setDepth(D.hud);
    if (tinker) {
      this.buildParty();
    } else {
      this.buildRack();
      roundButton(this, 1180, 600, '▶', () => this.play(), { r: 48, fontSize: 44, color: 0xa0a477, say: 'Play!' }).setDepth(D.hud);
    }
    this.time.delayedCall(900, () => this.showDemo());
  }

  // ───────────── Dance Party (Little Tinker) ─────────────

  private buildParty(): void {
    const moves: Move[] = ['stepL', 'stepR', 'spin', 'clap', 'wave', 'jump'];
    moves.forEach((m, i) => {
      const btn = roundButton(this, 280 + (i % 3) * 140, 250 + Math.floor(i / 3) * 170, MOVE_ICON[m], () => this.partyPress(m), { r: 58, fontSize: 52, color: MOVE_COLOR[m] }).setDepth(D.parts);
      this.partyBtns.push({ move: m, btn });
    });
  }

  private partyPress(m: Move): void {
    if (this.fixed) return;
    this.perform(m);
    const target = this.def.scenarios[0].moves;
    if (target[this.state.copied] === m) {
      this.state.copied++;
      sfx.sparkle();
      this.sparkleAt(this.stageX, this.stageY - 60, 12);
      this.act();
      if (this.state.copied >= target.length) this.time.delayedCall(700, () => this.checkSolved());
    } else {
      this.moves++;
      this.idle = 0;
    }
  }

  // ───────────── punch-card rack ─────────────

  private buildRack(): void {
    const n = this.def.slots;
    const twoCols = n > 5;
    const perCol = twoCols ? Math.ceil(n / 2) : n;
    const g = this.add.graphics().setDepth(D.back + 2);
    etchedPlate(g, twoCols ? 150 : 230, 118, twoCols ? 420 : 240, perCol * 62 + 24, CM.tealDark, 1, 382);
    for (let i = 0; i < n; i++) {
      const col = twoCols ? Math.floor(i / perCol) : 0;
      const row = twoCols ? i % perCol : i;
      const x = (twoCols ? 255 : 350) + col * 210;
      const y = 160 + row * 62;
      this.slotPos.push({ x, y });
      g.lineStyle(3, 0xf4ebd5, 0.45);
      g.strokeRoundedRect(x - 90, y - 26, 180, 52, 10);
      g.fillStyle(0xf4ebd5, 0.6);
      g.fillCircle(x - 104, y, 4);
      this.add.text(x - 104, y - 22, String(i + 1), { fontFamily: FONT, fontSize: '13px', color: '#f4ebd5' }).setOrigin(0.5).setDepth(D.back + 3);
    }
    const spots = this.trayCardSpots(this.def.tray.length);
    this.def.tray.forEach((card, i) => {
      const obj = this.makeCard(card, spots[i].x, spots[i].y);
      const v: CardView = { card, obj, home: spots[i], slot: null };
      this.views.push(v);
      this.enableDrag({
        obj,
        restScale: 0.62,
        targets: () => this.slotPos.map((p, k) => ({ id: String(k), x: p.x, y: p.y })),
        pick: () => this.liftCard(v),
        drop: (t) => this.dropCard(v, t),
      });
    });
  }

  private trayCardSpots(n: number): Array<{ x: number; y: number }> {
    const perRow = Math.min(n, 7);
    const rows = Math.ceil(n / perRow);
    const out: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / perRow);
      const inRow = Math.min(perRow, n - r * perRow);
      const k = i % perRow;
      out.push({ x: 640 + (k - (inRow - 1) / 2) * 112, y: rows === 1 ? 592 : 576 + r * 36 });
    }
    return out;
  }

  private makeCard(card: Card, x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(D.trayPart).setScale(0.62);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(-86, -22, 176, 50, 8);
    g.fillStyle(card.type === 'move' ? CM.paper : card.type === 'repeat' ? 0xc1d3c6 : 0xd1c5ce, 1);
    g.fillRoundedRect(-88, -25, 176, 50, 8);
    g.lineStyle(1.3, CM.copperDark, 0.8);
    g.strokeRoundedRect(-88, -25, 176, 50, 8);
    drawPatina(g, -84, -22, 168, 44, 651, 1.1);
    // punched holes: a row pattern that differs per card
    const key = cardKey(card);
    for (let k = 0; k < 8; k++) {
      const punched = (key.charCodeAt(k % key.length) + k) % 3 === 0;
      g.fillStyle(punched ? 0x342f29 : 0xd9c7a0, 1);
      g.fillCircle(-76 + k * 7, 18, 2.5);
    }
    c.add(g);
    if (card.type === 'move') {
      g.fillStyle(MOVE_COLOR[card.move], 1);
      g.fillRoundedRect(-30, -20, 60, 34, 8);
      c.add(this.add.text(0, -3, MOVE_ICON[card.move], { fontFamily: FONT, fontSize: '26px' }).setOrigin(0.5));
    } else if (card.type === 'repeat') {
      c.add(this.add.text(-40, -3, '🔁', { fontFamily: FONT, fontSize: '24px' }).setOrigin(0.5));
      c.add(this.add.text(14, -3, `×${card.times}${card.span && card.span > 1 ? `  ⇣${card.span}` : ''}`, { fontFamily: FONT, fontSize: '24px', color: '#1c3d6e', fontStyle: 'bold' }).setOrigin(0.5));
    } else {
      c.add(this.add.text(-56, -3, '🎵', { fontFamily: FONT, fontSize: '22px' }).setOrigin(0.5));
      c.add(this.add.text(-24, -3, '?', { fontFamily: FONT, fontSize: '22px', color: '#537a72', fontStyle: 'bold' }).setOrigin(0.5));
      g.fillStyle(MOVE_COLOR[card.then], 1);
      g.fillRoundedRect(-8, -20, 40, 34, 6);
      c.add(this.add.text(12, -3, MOVE_ICON[card.then], { fontFamily: FONT, fontSize: '20px' }).setOrigin(0.5));
      if (card.else) {
        g.fillStyle(MOVE_COLOR[card.else], 0.6);
        g.fillRoundedRect(38, -20, 40, 34, 6);
        c.add(this.add.text(58, -3, MOVE_ICON[card.else], { fontFamily: FONT, fontSize: '20px' }).setOrigin(0.5));
      }
    }
    c.setSize(176, 50);
    return c;
  }

  private sync(): void {
    const rack: Array<Card | null> = new Array(this.def.slots).fill(null);
    for (const v of this.views) if (v.slot !== null) rack[v.slot] = v.card;
    this.state.rack = rack;
  }

  private liftCard(v: CardView): void {
    if (v.slot === null) return;
    const was = v.slot;
    v.slot = null;
    this.sync();
    this.undoStack.push(() => {
      v.slot = was;
      this.sync();
    });
  }

  private dropCard(v: CardView, t: SnapTarget | null): void {
    if (!t) return this.floatHome(v.obj, v.home, 0.62);
    const slot = Number(t.id);
    const prev = this.views.find((q) => q !== v && q.slot === slot);
    if (prev) {
      prev.slot = null;
      this.floatHome(prev.obj, prev.home, 0.62);
    }
    v.slot = slot;
    this.tweens.killTweensOf(v.obj);
    this.tweens.add({ targets: v.obj, x: t.x, y: t.y, scale: 1, duration: 110, ease: 'Back.easeOut' });
    v.obj.setDepth(D.parts);
    sfx.punch();
    this.sparkleAt(t.x, t.y, 6);
    this.sync();
    this.act(() => {
      v.slot = null;
      if (prev) prev.slot = slot;
      this.sync();
    });
  }

  protected refresh(): void {
    if (this.style.id === 'tinker') return;
    for (const v of this.views) v.slot = null;
    this.state.rack.forEach((c, i) => {
      if (!c) return;
      const v = this.views.find((q) => q.slot === null && cardKey(q.card) === cardKey(c));
      if (v) v.slot = i;
    });
    for (const v of this.views) {
      this.tweens.killTweensOf(v.obj);
      if (v.slot !== null) v.obj.setPosition(this.slotPos[v.slot].x, this.slotPos[v.slot].y).setScale(1).setDepth(D.parts);
      else v.obj.setPosition(v.home.x, v.home.y).setScale(0.62).setDepth(D.trayPart);
    }
    this.sync();
  }

  // ───────────── playing the program ─────────────

  private play(): void {
    if (this.playing || this.fixed) return;
    this.playing = true;
    this.moves++;
    this.idle = 0;
    const scen = this.def.scenarios;
    const runScenario = (k: number) => {
      if (k >= scen.length) {
        this.playing = false;
        if (cardsSolved(this.def, this.state, this.style.id)) this.onFixed();
        return;
      }
      const s = scen[k];
      this.fast = !!(s.sensors && Object.values(s.sensors).some((v) => v === true));
      if (this.sensorText) this.sensorText.setText(this.fast ? '🎵🎵🎵 fast' : '🎵 slow');
      const performed = runCards(this.state.rack, s.sensors);
      let ok = performed.length === s.moves.length;
      let n = performed.length;
      for (let i = 0; i < performed.length; i++) {
        if (performed[i] !== s.moves[i]) {
          ok = false;
          n = i + 1;
          break;
        }
      }
      this.enqueue(performed.slice(0, Math.max(n, 1)), () => {
        if (!ok || performed.length === 0) {
          this.playing = false;
          sfx.boing();
          this.kip.shrug();
          this.cameras.main.shake(100, 0.003);
          return;
        }
        this.time.delayedCall(400, () => runScenario(k + 1));
      });
    };
    runScenario(0);
  }

  protected afterSolutionApplied(): void {
    if (this.style.id === 'tinker') this.checkSolved();
    else this.play();
  }

  private enqueue(moves: Move[], done: () => void): void {
    this.queue = [...moves];
    this.queueT = 0;
    this.onQueueDone = done;
    if (!moves.length) {
      this.onQueueDone = null;
      done();
    }
  }

  private showDemo(): void {
    const s = this.def.scenarios[0];
    this.demo = [...s.moves];
    this.demoT = 0;
    if (this.sensorText && s.sensors) {
      this.fast = Object.values(s.sensors).some((v) => v === true);
      this.sensorText.setText(this.fast ? '🎵🎵🎵 fast' : '🎵 slow');
    }
  }

  private perform(m: Move): void {
    this.pose = m;
    this.poseT = 0;
    if (m === 'clap') sfx.click();
    else if (m === 'jump') sfx.boing(1.2);
    else if (m === 'spin') sfx.whirr();
    else sfx.tick(1.4);
    sfx.note([523, 587, 659, 698, 784, 880][['stepL', 'stepR', 'spin', 'clap', 'wave', 'jump'].indexOf(m)], 'piano', 0.3);
  }

  // ───────────── drawing Bertie ─────────────

  private drawBertie(): void {
    const g = this.bertie;
    g.clear();
    const p = Math.min(1, this.poseT / 0.45);
    const e = Math.sin(p * Math.PI);
    let x = this.stageX + this.bx;
    let y = this.stageY;
    let sx = 1;
    let armL = -0.6;
    let armR = 0.6;
    switch (this.pose) {
      case 'stepL':
        x -= e * 50;
        break;
      case 'stepR':
        x += e * 50;
        break;
      case 'spin':
        sx = Math.cos(p * Math.PI * 2);
        break;
      case 'clap':
        armL = -0.1 * e - 0.6 * (1 - e);
        armR = 0.1 * e + 0.6 * (1 - e);
        break;
      case 'wave':
        armR = 2.4 + Math.sin(this.poseT * 20) * 0.4;
        break;
      case 'jump':
        y -= e * 60;
        break;
    }
    const s = Math.abs(sx) < 0.15 ? 0.15 * Math.sign(sx || 1) : sx;
    const X = (dx: number) => x + dx * s;
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x, this.stageY + 130, 140, 24);
    g.fillStyle(0x3d2b25, 1);
    g.fillRect(X(-34), y + 40, 22 * Math.abs(s), 80);
    g.fillRect(X(12), y + 40, 22 * Math.abs(s), 80);
    g.fillStyle(0xad6b51, 1);
    g.fillRoundedRect(x - 70 * Math.abs(s), y - 80, 140 * Math.abs(s), 130, 20);
    g.fillStyle(0xf2e6c8, 1);
    g.fillRoundedRect(x - 44 * Math.abs(s), y - 56, 88 * Math.abs(s), 60, 10);
    for (let i = 0; i < 4; i++) {
      g.fillStyle([0xffd43b, 0x74c0fc, 0x8ce99a, 0xff8787][i], this.pose && Math.floor(this.t * 6 + i) % 2 ? 1 : 0.35);
      g.fillCircle(X(-27 + i * 18), y - 26, 6);
    }
    g.fillStyle(0xad6b51, 1);
    g.fillRoundedRect(x - 50 * Math.abs(s), y - 170, 100 * Math.abs(s), 86, 18);
    g.fillStyle(0xf2e6c8, 1);
    g.fillCircle(X(-22), y - 132, 14 * Math.abs(s));
    g.fillCircle(X(22), y - 132, 14 * Math.abs(s));
    g.fillStyle(0x222222, 1);
    g.fillCircle(X(-22), y - 132, 6 * Math.abs(s));
    g.fillCircle(X(22), y - 132, 6 * Math.abs(s));
    g.lineStyle(16, 0xad6b51, 1);
    g.lineBetween(X(-70), y - 66, X(-70) + Math.sin(armL) * 70 * s, y - 66 + Math.cos(armL) * 70);
    g.lineBetween(X(70), y - 66, X(70) + Math.sin(armR) * 70 * s, y - 66 + Math.cos(armR) * 70);
  }

  private drawSprites(): void {
    const g = this.sprites;
    g.clear();
    if (!this.demo.length) return;
    const m = this.demo[0];
    const p = this.demoT / 0.9;
    const x = this.stageX - 150 + Math.sin(this.t * 3) * 10;
    const y = 220 + Math.cos(this.t * 2.5) * 8 - (m === 'jump' ? Math.sin(p * Math.PI) * 30 : 0);
    const dx = m === 'stepL' ? -Math.sin(p * Math.PI) * 30 : m === 'stepR' ? Math.sin(p * Math.PI) * 30 : 0;
    g.fillStyle(MOVE_COLOR[m], 0.35);
    g.fillCircle(x + dx, y, 34);
    g.fillStyle(0xfff3b0, 0.9);
    g.fillCircle(x + dx, y, 14);
    for (let i = 0; i < 5; i++) {
      const a = this.t * 4 + i;
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(x + dx + Math.cos(a) * 24, y + Math.sin(a) * 24, 2.5);
    }
    // in the Dance Party, the matching button glows too
    for (const b of this.partyBtns) b.btn.setScale(b.move === this.nextPartyMove() ? 1 + Math.sin(this.t * 6) * 0.06 : 1);
  }

  private nextPartyMove(): Move | undefined {
    return this.style.id === 'tinker' ? this.def.scenarios[0].moves[this.state.copied] : undefined;
  }

  protected tick(dt: number): void {
    this.t += dt;
    this.poseT += dt;
    if (this.poseT > 0.5) this.pose = null;
    if (this.queue.length) {
      this.queueT += dt;
      const beat = this.fast ? 0.45 : 0.62;
      if (this.queueT >= beat) {
        this.queueT = 0;
        this.perform(this.queue.shift()!);
        if (!this.queue.length && this.onQueueDone) {
          const done = this.onQueueDone;
          this.onQueueDone = null;
          this.time.delayedCall(beat * 1000, done);
        }
      }
    }
    if (this.demo.length) {
      this.demoT += dt;
      if (this.demoT > 0.9) {
        this.demoT = 0;
        this.demo.shift();
        if (this.demo.length) sfx.note(1046, 'chime', 0.2);
      }
    }
    this.drawBertie();
    this.drawSprites();
  }

  protected hintTarget(): HintTarget | null {
    if (this.style.id === 'tinker') {
      const m = this.nextPartyMove();
      const b = this.partyBtns.find((q) => q.move === m);
      return b ? { to: { x: b.btn.x, y: b.btn.y } } : null;
    }
    for (let i = 0; i < this.def.solution.length; i++) {
      const want = this.def.solution[i];
      const have = this.state.rack[i];
      if (have && cardKey(have) === cardKey(want)) continue;
      const v = this.views.find((q) => cardKey(q.card) === cardKey(want) && q.slot !== i);
      return { from: v ? { x: v.obj.x, y: v.obj.y } : undefined, to: this.slotPos[i] };
    }
    return { to: { x: 1180, y: 600 } };
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    if (this.style.id === 'tinker') return;
    this.def.solution.forEach((c, i) => {
      if (this.state.rack[i] || !this.slotPos[i]) return;
      const p = this.slotPos[i];
      g.fillStyle(c.type === 'move' ? MOVE_COLOR[c.move] : 0x74c0fc, alpha * 0.6);
      g.fillRoundedRect(p.x - 30, p.y - 18, 60, 36, 8);
    });
  }

  protected solutionSteps(): number {
    return this.style.id === 'tinker' ? this.def.scenarios[0].moves.length : this.def.solution.length + 1;
  }
}

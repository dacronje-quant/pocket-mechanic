/**
 * Punch-card rooms for Big Bertie (GDD §8.9, Appendix C): punch move cards
 * into the rack (sequence), use Repeat cards (loops) and Sensor cards
 * (conditionals), press Play and Bertie dances. Little Tinkers get the
 * "Dance Party": big move buttons, Bertie copies the glowing move.
 *
 * Readability rules: every move has one picture (a little dancer stepping,
 * spinning, clapping, waving or jumping) used on the cards, the buttons and
 * the dance score above the stage. The score shows the dance to make; Bertie
 * demonstrates it with the picture popping over his head, and when the
 * program plays each step gets a tick, or a cross where it goes wrong.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { CM, drawPatina } from '../art/copperMoss';
import { etchedPlate } from '../art/finish';
import { withArt } from '../art/generated';
import { atlasFrame } from '../art/sprites';
import { cardKey, runCards, type Card, type Move } from '../mechanism/cards';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';
import { FONT, roundButton } from '../ui/widgets';
import { cardsSolved } from '../rules';

/** Repeat cards: teal repeats one card, gold repeats two (or more), so they never look alike. */
function repeatColor(span: number): number {
  return span > 1 ? 0xe9c97e : 0xc1d3c6;
}

/** `span` little cards side by side: how many cards a repeat card loops over. */
function drawSpanBoxes(g: Phaser.GameObjects.Graphics, cx: number, cy: number, span: number, s: number): void {
  const w = 13 * s, h = 20 * s, gap = 5 * s;
  const x0 = cx - (span * w + (span - 1) * gap) / 2;
  for (let k = 0; k < span; k++) {
    g.fillStyle(0xf4ebd5, 1);
    g.fillRoundedRect(x0 + k * (w + gap), cy - h / 2, w, h, 3 * s);
    g.lineStyle(2, 0x1c3d6e, 1);
    g.strokeRoundedRect(x0 + k * (w + gap), cy - h / 2, w, h, 3 * s);
  }
}

const MOVE_COLOR: Record<Move, number> = { stepL: 0x648995, stepR: 0x8a9b69, spin: 0x917d96, clap: 0xc2a168, wave: 0xbb785b, jump: 0x669891 };
/** The dance score's first row (room is left above it for the repeat brackets). */
const SCORE_Y = 196;
const MOVES: Move[] = ['stepL', 'stepR', 'spin', 'clap', 'wave', 'jump'];

/**
 * A move as a picture: a little dancer doing it, centred on (x, y), about 44·s pixels square.
 * Step: leaning with a big arrow under the feet. Spin: a circling arrow round the dancer. Clap:
 * hands together over the head with a burst. Wave: one hand up with motion lines. Jump: lifted
 * off a ground line.
 */
export function drawMove(g: Phaser.GameObjects.Graphics, m: Move, x: number, y: number, s = 1, ink = 0x342f29): void {
  const L = (x1: number, y1: number, x2: number, y2: number) => g.lineBetween(x + x1 * s, y + y1 * s, x + x2 * s, y + y2 * s);
  const head = (hx: number, hy: number) => {
    g.fillStyle(ink, 1);
    g.fillCircle(x + hx * s, y + hy * s, 5 * s);
  };
  const arrow = (x1: number, x2: number, ay: number) => {
    L(x1, ay, x2, ay);
    const d = Math.sign(x2 - x1);
    g.fillStyle(ink, 1);
    g.fillTriangle(x + (x2 + d * 6) * s, y + ay * s, x + x2 * s, y + (ay - 6) * s, x + x2 * s, y + (ay + 6) * s);
  };
  g.lineStyle(Math.max(2, 3.2 * s), ink, 1);
  switch (m) {
    case 'stepL':
    case 'stepR': {
      const d = m === 'stepL' ? -1 : 1;
      head(3 * d, -15);
      L(2 * d, -10, -1 * d, 4);
      L(-1 * d, 4, 9 * d, 12);
      L(-1 * d, 4, -6 * d, 12);
      L(1 * d, -6, -8 * d, 0);
      L(1 * d, -6, 10 * d, -2);
      arrow(-6 * d, 14 * d, 19);
      break;
    }
    case 'spin': {
      head(0, -12);
      L(0, -7, 0, 6);
      L(0, 6, -5, 14);
      L(0, 6, 5, 14);
      L(0, -3, -8, 2);
      L(0, -3, 8, 2);
      g.beginPath();
      g.arc(x, y + 1 * s, 19 * s, Phaser.Math.DegToRad(-200), Phaser.Math.DegToRad(40), false);
      g.strokePath();
      const ax = x + Math.cos(Phaser.Math.DegToRad(40)) * 19 * s;
      const ay = y + 1 * s + Math.sin(Phaser.Math.DegToRad(40)) * 19 * s;
      g.fillStyle(ink, 1);
      g.fillTriangle(ax - 7 * s, ay - 1 * s, ax + 4 * s, ay - 6 * s, ax + 2 * s, ay + 6 * s);
      break;
    }
    case 'clap':
      head(0, -6);
      L(0, -1, 0, 10);
      L(0, 10, -5, 18);
      L(0, 10, 5, 18);
      L(0, 2, -8, -10);
      L(-8, -10, -1, -19);
      L(0, 2, 8, -10);
      L(8, -10, 1, -19);
      // the clap: a little burst over the hands
      for (const a of [-150, -110, -70, -30]) {
        const r = Phaser.Math.DegToRad(a);
        L(Math.cos(r) * 8, -21 + Math.sin(r) * 8, Math.cos(r) * 14, -21 + Math.sin(r) * 14);
      }
      break;
    case 'wave':
      head(-3, -8);
      L(-3, -3, -3, 9);
      L(-3, 9, -8, 18);
      L(-3, 9, 2, 18);
      L(-3, 0, -11, 7);
      L(-3, 0, 7, -8);
      L(7, -8, 9, -19);
      g.fillStyle(ink, 1);
      g.fillCircle(x + 9 * s, y - 21 * s, 3.5 * s);
      g.beginPath();
      g.arc(x + 9 * s, y - 20 * s, 8 * s, Phaser.Math.DegToRad(-40), Phaser.Math.DegToRad(40), false);
      g.strokePath();
      g.beginPath();
      g.arc(x + 9 * s, y - 20 * s, 13 * s, Phaser.Math.DegToRad(-40), Phaser.Math.DegToRad(40), false);
      g.strokePath();
      break;
    case 'jump':
      head(0, -18);
      L(0, -13, 0, -1);
      L(0, -10, -9, -17);
      L(0, -10, 9, -17);
      L(0, -1, -6, 5);
      L(-6, 5, -2, 9);
      L(0, -1, 6, 5);
      L(6, 5, 2, 9);
      // the floor left behind, with lift lines
      L(-14, 20, 14, 20);
      L(-6, 15, -6, 12);
      L(6, 15, 6, 12);
      break;
  }
}

interface CardView {
  card: Card;
  obj: Phaser.GameObjects.Container;
  home: { x: number; y: number };
  slot: number | null;
}

type StepMark = 'ok' | 'bad' | undefined;

export class CardsRoom extends RoomBase<'cards'> {
  private views: CardView[] = [];
  private slotPos: Array<{ x: number; y: number }> = [];
  private bertie!: Phaser.GameObjects.Graphics;
  private bertieArt?: Phaser.GameObjects.Image;
  private bubbleG!: Phaser.GameObjects.Graphics;
  private spritesG!: Phaser.GameObjects.Graphics;
  private foldLabels = new Map<string, Phaser.GameObjects.Text>();
  private scoreG!: Phaser.GameObjects.Graphics;
  private stageX = 880;
  private stageY = 390;
  private pose: Move | null = null;
  private poseT = 0;
  private bx = 0;
  private queue: Move[] = [];
  private queueT = 0;
  private onQueueDone: (() => void) | null = null;
  /** which score row and step is being danced right now (-1: none) */
  private row = 0;
  private step = -1;
  private demoing = false;
  private marks: StepMark[][] = [];
  private playing = false;
  private playbackVersion = 0;
  private fast = false;
  private partyBtns: Array<{ move: Move; btn: Phaser.GameObjects.Container }> = [];
  private t = 0;

  /** Cards in the drawer: bigger when there are few of them, so their pictures read easily. */
  private get cardScale(): number {
    return this.def.tray.length <= 6 ? 0.8 : 0.62;
  }

  constructor() {
    super('room-cards');
  }

  protected build(): void {
    this.views = [];
    this.slotPos = [];
    this.pose = null;
    this.partyBtns = [];
    this.queue = [];
    this.onQueueDone = null;
    this.onStep = null;
    this.playbackVersion++;
    this.playing = false;
    this.demoing = false;
    this.step = -1;
    this.row = 0;
    this.bertieArt = undefined;
    this.foldLabels = new Map();
    this.marks = this.def.scenarios.map((s) => new Array(s.moves.length).fill(undefined));
    this.liveCheck = false;
    const tinker = this.style.id === 'tinker';
    // stage
    const st = this.add.graphics().setDepth(D.back + 1);
    st.fillStyle(0x000000, 0.3);
    st.fillEllipse(this.stageX + 6, this.stageY + 140, 380, 70);
    st.fillStyle(0x856c50, 1);
    st.fillEllipse(this.stageX, this.stageY + 130, 380, 70);
    st.fillStyle(0xad6b51, 1);
    st.fillRect(this.stageX - 200, 230, 30, 300);
    st.fillRect(this.stageX + 170, 230, 30, 300);
    if (this.def.show) {
      for (let i = 0; i < 9; i++) {
        st.fillStyle([0xe8c39e, 0xc68a5c, 0x8d5a3b, 0xf2c9a5][i % 4], 1);
        st.fillCircle(this.stageX - 180 + i * 45, 560, 18);
      }
    }
    this.scoreG = this.add.graphics().setDepth(D.mech + 1);
    this.bertie = this.add.graphics().setDepth(D.mech + 2);
    this.bubbleG = this.add.graphics().setDepth(D.mech + 4);
    this.spritesG = this.add.graphics().setDepth(D.mech + 3).setBlendMode(Phaser.BlendModes.ADD);
    // the painted Big Bertie (the drawn robot stays as a stand-in until it loads)
    withArt(this, 'portrait-clementine', (key) => {
      if (!this.bertie.active) return;
      const img = this.add.image(this.stageX, this.stageY + 128, key, atlasFrame(this, key, 6, 4, 3, true)).setOrigin(0.5, 1).setDepth(D.mech + 2);
      img.setScale(225 / img.height).setData('base', img.scaleX);
      this.bertieArt = img;
    });
    roundButton(this, this.stageX + 160, 480, '👀', () => this.showDemo(), { r: 34, fontSize: 28, say: 'Watch the dance' }).setDepth(D.hud);
    if (tinker) {
      this.buildParty();
    } else {
      this.buildRack();
      roundButton(this, 1180, 600, '▶', () => this.play(), { r: 48, fontSize: 44, color: 0xa0a477, say: 'Play!' }).setDepth(D.hud);
    }
    this.time.delayedCall(900, () => this.showDemo());
  }

  // ───────────── the dance score ─────────────

  /** The dance to make, one row per kind of music, above the stage. */
  private drawScore(): void {
    const g = this.scoreG;
    g.clear();
    const rows = this.def.scenarios;
    const cell = 58;
    rows.forEach((s, r) => {
      const n = s.moves.length;
      const music = rows.length > 1 || !!s.sensors;
      const w = n * cell + (music ? 56 : 0);
      const x0 = this.stageX - w / 2 + (music ? 56 : 0);
      const y = SCORE_Y + r * 66;
      // Little Tinkers always see which step to copy next
      const active = (this.demoing || this.playing || (this.style.id === 'tinker' && !this.fixed)) && this.row === r;
      g.fillStyle(0x342f29, active ? 0.92 : 0.75);
      g.fillRoundedRect(x0 - (music ? 60 : 6), y - 31, w + 12, 62, 12);
      if (active) {
        g.lineStyle(3, 0xf1d391, 1);
        g.strokeRoundedRect(x0 - (music ? 60 : 6), y - 31, w + 12, 62, 12);
      }
      if (music) this.drawMusic(g, x0 - 30, y, !!s.sensors && Object.values(s.sensors).some((v) => v === true));
      s.moves.forEach((m, i) => {
        const cx = x0 + i * cell + cell / 2;
        const now = active && this.step === i;
        g.fillStyle(MOVE_COLOR[m], now ? 1 : 0.85);
        g.fillRoundedRect(cx - 25, y - 25, 50, 50, 9);
        if (now) {
          g.lineStyle(4, 0xfff3b0, 1);
          g.strokeRoundedRect(cx - 27, y - 27, 54, 54, 10);
        }
        drawMove(g, m, cx, y, 0.95);
        const mark = this.marks[r]?.[i];
        if (mark) {
          g.fillStyle(mark === 'ok' ? 0x485541 : 0xb04a3a, 1);
          g.fillCircle(cx + 18, y + 18, 10);
          g.lineStyle(3, 0xf4ebd5, 1);
          if (mark === 'ok') {
            g.lineBetween(cx + 13, y + 18, cx + 17, y + 22);
            g.lineBetween(cx + 17, y + 22, cx + 23, y + 13);
          } else {
            g.lineBetween(cx + 13, y + 13, cx + 23, y + 23);
            g.lineBetween(cx + 23, y + 13, cx + 13, y + 23);
          }
        }
      });
    });
    this.drawFoldMarks(g);
  }

  /**
   * How the dance folds into fewer cards, read from the authored solution: which steps a
   * repeat card covers (and how many times) and which step the music card decides.
   */
  private foldMarks(): { repeats: Array<{ start: number; len: number; times: number; span: number }>; music: number[] } {
    const repeats: Array<{ start: number; len: number; times: number; span: number }> = [];
    const music: number[] = [];
    const sol = this.def.solution;
    let at = 0;
    for (let i = 0; i < sol.length; i++) {
      const c = sol[i];
      if (c.type === 'repeat') {
        const span = c.span ?? 1;
        const inner = sol.slice(i + 1, i + 1 + span);
        inner.forEach((q, k) => {
          if (q.type === 'if') for (let t = 0; t < c.times; t++) music.push(at + t * span + k);
        });
        repeats.push({ start: at, len: span * c.times, times: c.times, span });
        at += span * c.times;
        i += span;
      } else {
        if (c.type === 'if') music.push(at);
        at++;
      }
    }
    return { repeats, music };
  }

  /** Brackets over the repeated parts, and a dashed link on steps the music card decides. */
  private drawFoldMarks(g: Phaser.GameObjects.Graphics): void {
    if (this.style.id === 'tinker' || !this.def.solution.some((c) => c.type !== 'move')) return;
    const rows = this.def.scenarios;
    const n = rows[0].moves.length;
    const cell = 58;
    const music = rows.length > 1 || !!rows[0].sensors;
    const w = n * cell + (music ? 56 : 0);
    const x0 = this.stageX - w / 2 + (music ? 56 : 0);
    const { repeats, music: musicSteps } = this.foldMarks();
    for (const r of repeats) {
      const xa = x0 + r.start * cell + 6;
      const xb = x0 + (r.start + r.len) * cell - 6;
      const y = SCORE_Y - 46;
      g.lineStyle(4, 0x1c3d6e, 1);
      g.lineBetween(xa, y + 8, xa, y);
      g.lineBetween(xa, y, xb, y);
      g.lineBetween(xb, y, xb, y + 8);
      // the repeat badge looks like the repeat card itself: 🔁×N
      const cx = (xa + xb) / 2;
      // same colour and same card-boxes as the repeat card, so the right one is easy to spot
      g.fillStyle(repeatColor(r.span), 1);
      g.fillRoundedRect(cx - 56, y - 17, 112, 34, 9);
      g.lineStyle(2, 0x1c3d6e, 1);
      g.strokeRoundedRect(cx - 56, y - 17, 112, 34, 9);
      drawSpanBoxes(g, cx + 32, y, r.span, 0.8);
      const key = `${r.start}`;
      if (!this.foldLabels.has(key)) {
        this.foldLabels.set(key, this.add.text(cx - 14, y, `🔁×${r.times}`, { fontFamily: FONT, fontSize: '22px', color: '#1c3d6e', fontStyle: 'bold' }).setOrigin(0.5).setDepth(D.mech + 1.5));
      }
    }
    if (rows.length > 1) {
      for (const s of musicSteps) {
        const cx = x0 + s * cell + cell / 2;
        // this step is the music card's: a glowing frame round it in both rows
        g.lineStyle(4, 0xf1d391, 0.6 + Math.sin(this.t * 4) * 0.3);
        g.strokeRoundedRect(cx - 29, SCORE_Y - 29, 58, 66 + 58, 10);
      }
    }
  }

  /** Fast music: three bouncing notes; slow music: one note. */
  private drawMusic(g: Phaser.GameObjects.Graphics, x: number, y: number, fast: boolean): void {
    const notes = fast ? [-14, 0, 14] : [0];
    notes.forEach((dx, k) => {
      const bob = fast ? Math.sin(this.t * 10 + k) * 3 : Math.sin(this.t * 3) * 2;
      g.fillStyle(0xf1d391, 1);
      g.fillEllipse(x + dx - 3, y + 8 + bob, 9, 7);
      g.lineStyle(2, 0xf1d391, 1);
      g.lineBetween(x + dx + 1, y + 8 + bob, x + dx + 1, y - 10 + bob);
    });
  }

  // ───────────── Dance Party (Little Tinker) ─────────────

  private buildParty(): void {
    MOVES.forEach((m, i) => {
      const btn = roundButton(this, 280 + (i % 3) * 140, 270 + Math.floor(i / 3) * 170, '', () => this.partyPress(m), { r: 58, fontSize: 52, color: MOVE_COLOR[m] }).setDepth(D.parts);
      const pic = this.add.graphics();
      drawMove(pic, m, 0, 0, 1.6, 0x241c16);
      btn.add(pic);
      this.partyBtns.push({ move: m, btn });
    });
  }

  private partyPress(m: Move): void {
    if (this.fixed) return;
    this.stopPlayback();
    this.perform(m);
    const target = this.def.scenarios[0].moves;
    if (target[this.state.copied] === m) {
      this.marks[0][this.state.copied] = 'ok';
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
      obj.setName(`cards-part:${i}:${cardKey(card)}`);
      const v: CardView = { card, obj, home: spots[i], slot: null };
      this.views.push(v);
      this.enableDrag({
        obj,
        restScale: this.cardScale,
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
      out.push({ x: 640 + (k - (inRow - 1) / 2) * (rows === 1 && n <= 6 ? 150 : 112), y: rows === 1 ? 592 : 576 + r * 36 });
    }
    return out;
  }

  private makeCard(card: Card, x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(D.trayPart).setScale(this.cardScale);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(-86, -22, 176, 50, 8);
    g.fillStyle(card.type === 'move' ? CM.paper : card.type === 'repeat' ? repeatColor(card.span ?? 1) : 0xd1c5ce, 1);
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
      g.fillRoundedRect(-34, -24, 68, 46, 8);
      drawMove(g, card.move, 0, -1, 1);
    } else if (card.type === 'repeat') {
      // how many cards it repeats is drawn as that many little cards: ▭ or ▭▭
      c.add(this.add.text(-52, -3, '🔁', { fontFamily: FONT, fontSize: '26px' }).setOrigin(0.5));
      c.add(this.add.text(-8, -3, `×${card.times}`, { fontFamily: FONT, fontSize: '28px', color: '#1c3d6e', fontStyle: 'bold' }).setOrigin(0.5));
      drawSpanBoxes(g, 50, -3, Math.max(1, card.span ?? 1), 1.15);
    } else {
      // the music card: fast music → first move, slow music → second move
      this.drawMusic(g, -66, -2, true);
      g.fillStyle(MOVE_COLOR[card.then], 1);
      g.fillRoundedRect(-48, -23, 40, 42, 6);
      drawMove(g, card.then, -28, -2, 0.62);
      if (card.else) {
        g.fillStyle(0x342f29, 1);
        g.fillEllipse(8, 6, 7, 5);
        g.lineStyle(2, 0x342f29, 1);
        g.lineBetween(11, 6, 11, -10);
        g.fillStyle(MOVE_COLOR[card.else], 1);
        g.fillRoundedRect(22, -23, 40, 42, 6);
        drawMove(g, card.else, 42, -2, 0.62);
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
    this.stopPlayback();
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
    if (!t) return this.floatHome(v.obj, v.home, this.cardScale);
    const slot = Number(t.id);
    const prev = this.views.find((q) => q !== v && q.slot === slot);
    if (prev) {
      prev.slot = null;
      this.floatHome(prev.obj, prev.home, this.cardScale);
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
      else v.obj.setPosition(v.home.x, v.home.y).setScale(this.cardScale).setDepth(D.trayPart);
    }
    this.sync();
  }

  // ───────────── playing the program ─────────────

  private play(): void {
    if (this.playing || this.fixed) return;
    this.playing = true;
    this.demoing = false;
    const version = ++this.playbackVersion;
    this.moves++;
    this.idle = 0;
    this.marks = this.def.scenarios.map((s) => new Array(s.moves.length).fill(undefined));
    const scen = this.def.scenarios;
    const runScenario = (k: number) => {
      if (version !== this.playbackVersion) return;
      if (k >= scen.length) {
        this.playing = false;
        this.step = -1;
        if (cardsSolved(this.def, this.state, this.style.id)) this.onFixed();
        return;
      }
      const s = scen[k];
      this.row = k;
      this.fast = !!(s.sensors && Object.values(s.sensors).some((v) => v === true));
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
      // a program that stops short: the first missing step gets the cross
      const short = performed.length < s.moves.length && n === performed.length;
      this.enqueue(performed.slice(0, Math.max(n, 1)), (i, m) => {
        this.marks[k][i] = m === s.moves[i] ? 'ok' : 'bad';
      }, () => {
        if (!ok || performed.length === 0) {
          if (short) this.marks[k][Math.min(performed.length, s.moves.length - 1)] = 'bad';
          // too many moves: the dance should have stopped after the last step
          if (performed.length > s.moves.length && n === s.moves.length + 1) this.marks[k][s.moves.length - 1] = 'bad';
          this.playing = false;
          this.step = -1;
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

  private onStep: ((i: number, m: Move) => void) | null = null;
  private queueIndex = 0;

  private enqueue(moves: Move[], onStep: ((i: number, m: Move) => void) | null, done: () => void): void {
    this.queue = [...moves];
    this.queueT = 0;
    this.queueIndex = 0;
    this.onStep = onStep;
    const version = this.playbackVersion;
    this.onQueueDone = () => { if (version === this.playbackVersion) done(); };
    if (!moves.length) {
      this.onQueueDone = null;
      done();
    }
  }

  /** Bertie shows the dance, step by step, lighting each step of the score. */
  private showDemo(): void {
    if (this.playing) return;
    this.stopPlayback();
    const version = this.playbackVersion;
    this.demoing = true;
    const demonstrate = (row: number) => {
      if (version !== this.playbackVersion) return;
      const s = this.def.scenarios[row];
      this.row = row;
      this.fast = !!(s.sensors && Object.values(s.sensors).some((v) => v === true));
      this.enqueue(s.moves, null, () => {
        if (version !== this.playbackVersion) return;
        if (this.style.id !== 'tinker' && row + 1 < this.def.scenarios.length) {
          this.time.delayedCall(500, () => demonstrate(row + 1));
        } else {
          this.demoing = false;
          this.step = -1;
        }
      });
    };
    demonstrate(0);
  }

  private stopPlayback(): void {
    this.playbackVersion++;
    this.queue = [];
    this.onQueueDone = null;
    this.onStep = null;
    this.playing = false;
    this.demoing = false;
    this.step = -1;
  }

  private perform(m: Move): void {
    this.pose = m;
    this.poseT = 0;
    if (m === 'clap') sfx.click();
    else if (m === 'jump') sfx.boing(1.2);
    else if (m === 'spin') sfx.whirr();
    else sfx.tick(1.4);
    sfx.note([523, 587, 659, 698, 784, 880][MOVES.indexOf(m)], 'piano', 0.3);
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
    let rot = 0;
    let squash = 1;
    let armL = -0.6;
    let armR = 0.6;
    switch (this.pose) {
      case 'stepL':
        x -= e * 60;
        rot = -0.12 * e;
        break;
      case 'stepR':
        x += e * 60;
        rot = 0.12 * e;
        break;
      case 'spin':
        sx = Math.cos(p * Math.PI * 2);
        break;
      case 'clap':
        armL = -0.1 * e - 0.6 * (1 - e);
        armR = 0.1 * e + 0.6 * (1 - e);
        squash = 1 - 0.06 * e;
        break;
      case 'wave':
        armR = 2.4 + Math.sin(this.poseT * 20) * 0.4;
        rot = Math.sin(this.poseT * 20) * 0.08;
        break;
      case 'jump':
        y -= e * 70;
        break;
    }
    const s = Math.abs(sx) < 0.15 ? 0.15 * Math.sign(sx || 1) : sx;
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x, this.stageY + 128, 150 - (this.pose === 'jump' ? e * 50 : 0), 24);
    if (this.bertieArt) {
      const base = this.bertieArt.getData('base') as number;
      this.bertieArt.setPosition(x, y + 128).setScale(base * s, base * squash).setRotation(rot);
      this.drawMoveBubble(x + 110, y - 90);
      return;
    }
    const X = (dx: number) => x + dx * s;
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
    this.drawMoveBubble(x + 110, y - 150);
  }

  /** The move Bertie is doing, as its picture in a bubble over his head (the same picture as the card). */
  private drawMoveBubble(x: number, y: number): void {
    const g = this.bubbleG;
    g.clear();
    if (!this.pose || this.poseT > 0.55) return;
    const pop = Math.min(1, this.poseT / 0.12);
    const s = 0.7 + pop * 0.3;
    g.fillStyle(0x000000, 0.25);
    g.fillCircle(x + 3, y + 4, 34 * s);
    g.fillStyle(0xf4ebd5, 1);
    g.fillCircle(x, y, 34 * s);
    g.fillStyle(MOVE_COLOR[this.pose], 1);
    g.fillCircle(x, y, 29 * s);
    // the bubble's tail points down-left at Bertie
    g.fillTriangle(x - 22 * s, y + 18 * s, x - 6 * s, y + 28 * s, x - 36 * s, y + 38 * s);
    drawMove(g, this.pose, x, y, 1.05 * s);
  }

  private drawSparkles(): void {
    // the light sprites dance with Bertie while he shows the dance (the hints say to watch them)
    const sg = this.spritesG;
    sg.clear();
    if (this.demoing) {
      const bx = this.bertieArt?.x ?? this.stageX;
      const by = (this.bertieArt?.y ?? this.stageY + 128) - 150;
      for (let k = 0; k < 3; k++) {
        const a = this.t * 3 + (k * Math.PI * 2) / 3;
        const px = bx + Math.cos(a) * 120;
        const py = by + Math.sin(a) * 50 - (this.pose === 'jump' ? 30 : 0);
        sg.fillStyle(this.pose ? MOVE_COLOR[this.pose] : 0xfff3b0, 0.35);
        sg.fillCircle(px, py, 20);
        sg.fillStyle(0xfff3b0, 0.95);
        sg.fillCircle(px, py, 8);
        for (let j = 0; j < 4; j++) {
          const b = this.t * 6 + j * 1.6;
          sg.fillStyle(0xffffff, 0.6);
          sg.fillCircle(px + Math.cos(b) * 14, py + Math.sin(b) * 14, 2);
        }
      }
    }
    // in the Dance Party, the button for the next move glows
    const next = this.nextPartyMove();
    for (const b of this.partyBtns) b.btn.setScale(b.move === next ? 1 + Math.sin(this.t * 6) * 0.07 : 1);
  }

  private nextPartyMove(): Move | undefined {
    return this.style.id === 'tinker' ? this.def.scenarios[0].moves[this.state.copied] : undefined;
  }

  protected tick(dt: number): void {
    this.t += dt;
    this.poseT += dt;
    if (this.poseT > 0.55) this.pose = null;
    if (this.queue.length) {
      this.queueT += dt;
      const beat = this.demoing ? 0.8 : this.fast ? 0.5 : 0.66;
      if (this.queueT >= beat || (this.queueIndex === 0 && this.queueT >= 0.25)) {
        this.queueT = 0;
        const m = this.queue.shift()!;
        this.step = this.queueIndex;
        this.perform(m);
        this.onStep?.(this.queueIndex, m);
        this.queueIndex++;
        if (!this.queue.length && this.onQueueDone) {
          const done = this.onQueueDone;
          this.onQueueDone = null;
          this.time.delayedCall(beat * 1000, done);
        }
      }
    }
    if (this.style.id === 'tinker') {
      this.row = 0;
      this.step = this.demoing ? this.step : this.state.copied;
    }
    this.drawBertie();
    this.drawScore();
    this.drawSparkles();
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

/**
 * Grown-ups (GDD §25, §26, §28), behind the parental gate: Play Style per
 * profile, the "What We Learned" summary, sound, subtitles and read-aloud,
 * comfort and accessibility, Closing Time and Wind-Down, co-op, and the
 * child-safety promises. This page is for adults, so it uses words.
 */
import Phaser from 'phaser';
import { setLevels } from '../audio/engine';
import { setSoft } from '../audio/sfx';
import { Kip } from '../art/Kip';
import type { PlayStyleId } from '../content/types';
import { whatWeLearned } from '../core/progress';
import { persist, removeProfile, save, settings, type Settings } from '../core/save';
import { reopen, shopClosed } from '../core/session';
import { PLAY_STYLES } from '../core/styles';
import { FONT, SERIF } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';
import { goScene } from './router';

type Opt<T> = [label: string, value: T];

const GUIDE = [
  'Take apart an old, unplugged toy together and find its gears and springs.',
  'Build a cardboard marble run with tubes and tape.',
  'Find the gears on a bicycle: which way does each one turn?',
  'Make a pendulum from string and a washer. Does a longer string swing slower?',
  'Hunt for levers at home: scissors, a seesaw, a bottle opener.',
];

const PROMISES =
  'No ads. No purchases. No accounts, chat or internet features. Everything is saved only on this device, and the game works offline. ' +
  'No timers that punish absence, no streaks, no random rewards. Nothing in the game can fail or break for good.';

export class GrownUpsScene extends MetaScene {
  private content!: Phaser.GameObjects.Container;
  private y = 0;
  private back: 'title' | 'shop' = 'shop';
  private confirm: string | null = null;

  constructor() {
    super('grownups');
  }

  protected build(data: Record<string, unknown>): void {
    this.back = data.back === 'title' ? 'title' : 'shop';
    this.confirm = null;
    this.add.rectangle(0, 0, 1280, 720, 0xf3e2bd).setOrigin(0).setDepth(0);
    this.add.rectangle(0, 0, 1280, 96, 0x3d2412).setOrigin(0).setDepth(HUD - 1);
    this.add.text(640, 48, 'For grown-ups', { fontFamily: SERIF, fontSize: '36px', color: '#ffd76a', fontStyle: 'bold' }).setOrigin(0.5).setDepth(HUD);
    // with every profile removed there is no shop to go back to: go to the title to make one
    this.backButton(() => goScene(this, save.profiles.length ? this.back : 'title'), '✓');
    this.render();
    // scroll by dragging or with the wheel
    let drag: { y0: number; c0: number } | null = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (drag = { y0: p.y, c0: this.content.y }));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (drag && p.isDown) this.content.y = Phaser.Math.Clamp(drag.c0 + p.y - drag.y0, Math.min(0, 690 - this.y), 0);
    });
    this.input.on('pointerup', () => (drag = null));
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      this.content.y = Phaser.Math.Clamp(this.content.y - dy, Math.min(0, 690 - this.y), 0);
    });
  }

  private render(): void {
    const keep = this.content?.y ?? 0;
    this.content?.destroy();
    this.content = this.add.container(0, keep).setDepth(10);
    this.y = 120;
    const s = settings();
    const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
      s[k] = v;
      setLevels({ muted: s.muted, music: s.music, sfx: s.sfx, voice: s.voice });
      setSoft(s.soft);
      persist();
      this.render();
    };

    this.section('Profiles');
    if (!save.profiles.length) this.text('No profiles yet.');
    for (const p of save.profiles) {
      const row = this.y;
      this.content.add(new Kip(this, 120, row + 70, p.look).setScale(1.1));
      this.content.add(this.add.text(180, row + 4, p.initials || '(no letters)', { fontFamily: SERIF, fontSize: '26px', color: '#3b260b', fontStyle: 'bold' }));
      this.options(
        'Play Style',
        (['tinker', 'fixer', 'engineer'] as PlayStyleId[]).map((id) => [`${PLAY_STYLES[id].icon} ${PLAY_STYLES[id].name}`, id] as Opt<PlayStyleId>),
        p.style,
        (v) => {
          p.style = v;
          persist();
          this.render();
        },
        360,
        row,
      );
      this.y = row + 52;
      this.text(whatWeLearned(p), 180, 900);
      this.button(this.confirm === p.id ? 'Tap again to remove' : 'Remove profile', 1000, row + 60, () => {
        if (this.confirm === p.id) {
          removeProfile(p.id);
          this.confirm = null;
        } else this.confirm = p.id;
        this.render();
      }, this.confirm === p.id ? 0xd64541 : 0x9a8a72);
      this.y += 30;
    }

    const vol: Array<Opt<number>> = [
      ['Off', 0],
      ['Low', 0.25],
      ['Medium', 0.5],
      ['High', 0.85],
    ];
    const near = (v: number) => vol.reduce((a, b) => (Math.abs(b[1] - v) < Math.abs(a[1] - v) ? b : a))[1];
    this.section('Sound');
    this.options('Music', vol, near(s.music), (v) => set('music', v));
    this.options('Sound effects', vol, near(s.sfx), (v) => set('sfx', v));
    this.options('Voices', vol, near(s.voice), (v) => set('voice', v));
    this.options('All sound', [['On', false], ['Muted', true]], s.muted, (v) => set('muted', v));
    this.options('Soft Clockwork (gentler bells and sparks)', [['Off', false], ['On', true]], s.soft, (v) => set('soft', v));

    this.section('Words');
    this.options<Settings['subtitles']>('Subtitles', [['Automatic (none in Little Tinker)', 'auto'], ['Always', 'on'], ['Never', 'off']], s.subtitles, (v) => set('subtitles', v));
    this.options('Read buttons aloud', [['Off', false], ['On', true]], s.readAloud, (v) => set('readAloud', v));

    this.section('Comfort & access');
    this.options('Calm Visuals (fewer particles, no camera moves)', [['Off', false], ['On', true]], s.calm, (v) => set('calm', v));
    this.options('High contrast outlines', [['Off', false], ['On', true]], s.contrast, (v) => set('contrast', v));
    this.options('Snap assist', [['Normal', 1], ['Bigger', 1.5], ['Biggest', 2]], s.snap, (v) => set('snap', v));
    this.options('Hint timing', [['Sooner', 0.6], ['Normal', 1], ['Later', 1.6]], s.hintPace, (v) => set('hintPace', v));

    this.section('Healthy play');
    this.options('Closing Time', [['Off', 0], ['15 min', 15], ['30 min', 30], ['45 min', 45], ['60 min', 60]], s.closingMin, (v) => set('closingMin', v));
    this.options('Wind-Down Mode (quiet, warm, Quick Fixes only)', [['Off', 'off'], ['On now', 'on'], ['From 7 pm', 19], ['From 8 pm', 20]] as Array<Opt<string | number>>, s.windDown ? 'on' : s.windDownHour ?? 'off', (v) => {
      s.windDown = v === 'on';
      s.windDownHour = typeof v === 'number' ? v : null;
      persist();
      this.render();
    });
    if (shopClosed()) {
      this.button('Reopen the shop for today', 360, this.y + 6, () => {
        reopen();
        this.render();
      }, 0x2e9b5f);
      this.y += 60;
    }

    this.section('Playing together');
    this.options<Settings['coop']>('Co-op', [['Off', 'off'], ['Tess on screen (two fingers)', 'tess'], ['Outside Hands (flashlight)', 'hands']], s.coop, (v) => set('coop', v));
    this.text('Tess joins after the Grand Tea Machine is fixed. Outside Hands: a grown-up shines a second-finger flashlight in dark rooms — they can help, but Kip makes the fix.');

    this.section('Grown-Up Guide');
    for (const g of GUIDE) this.text(`• ${g}`);

    this.section('Our promises');
    this.text(PROMISES);
    this.y += 40;
  }

  private section(title: string): void {
    this.y += 18;
    const g = this.add.graphics();
    g.fillStyle(0x7a5413, 1);
    g.fillRect(60, this.y + 40, 1160, 3);
    this.content.add(g);
    this.content.add(this.add.text(60, this.y, title, { fontFamily: SERIF, fontSize: '28px', color: '#5e3f10', fontStyle: 'bold' }));
    this.y += 56;
  }

  private text(t: string, x = 60, width = 1160): void {
    const tx = this.add.text(x, this.y, t, { fontFamily: FONT, fontSize: '19px', color: '#3b260b', wordWrap: { width }, lineSpacing: 4 });
    this.content.add(tx);
    this.y += tx.height + 12;
  }

  private button(label: string, x: number, y: number, onTap: () => void, color = 0x7a5413): Phaser.GameObjects.Text {
    const t = this.add
      .text(x, y, label, { fontFamily: FONT, fontSize: '18px', color: '#fff6e2', backgroundColor: `#${color.toString(16).padStart(6, '0')}`, padding: { x: 12, y: 8 } })
      .setInteractive({ useHandCursor: true });
    let sx = 0;
    let sy = 0;
    t.on('pointerdown', (p: Phaser.Input.Pointer) => ((sx = p.x), (sy = p.y)));
    t.on('pointerup', (p: Phaser.Input.Pointer) => Math.hypot(p.x - sx, p.y - sy) < 12 && onTap());
    this.content.add(t);
    return t;
  }

  private options<T>(label: string, opts: Array<Opt<T>>, current: T, onPick: (v: T) => void, x = 60, y = this.y): void {
    this.content.add(this.add.text(x, y + 8, label, { fontFamily: FONT, fontSize: '19px', color: '#3b260b', fontStyle: 'bold' }));
    let bx = x + Math.max(300, label.length * 9.5 + 20);
    let by = y;
    for (const [name, v] of opts) {
      const b = this.button(name, bx, by, () => onPick(v), v === current ? 0x2e7d6b : 0xb39a72);
      if (bx + b.width > 1220) {
        bx = x + 300;
        by += 46;
        b.setPosition(bx, by);
      }
      bx += b.width + 10;
    }
    if (y === this.y) this.y = by + 54;
  }
}

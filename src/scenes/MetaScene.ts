/**
 * Shared bits for the scenes around the rooms (shop hub, menus, story):
 * sound settings, the first-tap audio unlock, a back button, the counters,
 * a speech bubble, Wind-Down warmth, and the debug hooks.
 */
import Phaser from 'phaser';
import { setLevels, unlockAudio } from '../audio/engine';
import { playMusic, type THEMES } from '../audio/music';
import { setSoft } from '../audio/sfx';
import { setVoiceChip, speak } from '../audio/voice';
import { ensureBasics, ensureGearTexture } from '../art/textures';
import { LINES } from '../content/story';
import { goldTotal } from '../core/progress';
import { profile, settings } from '../core/save';
import { tickPlayTime, windDownActive } from '../core/session';
import { pm } from '../debug';
import { goFullscreen } from '../platform';
import { FONT, roundButton, SERIF, showWords, SpeechBubble } from '../ui/widgets';
import { go, resetLeaving } from './router';

export const HUD = 900;

export abstract class MetaScene extends Phaser.Scene {
  protected bubble!: SpeechBubble;

  protected abstract build(data: Record<string, unknown>): void;

  create(data: Record<string, unknown> = {}): void {
    const s = settings();
    ensureBasics(this);
    setLevels({ muted: s.muted, music: s.music, sfx: s.sfx, voice: s.voice });
    setSoft(s.soft);
    setVoiceChip(profile().look.voice);
    pm.scene = this.scene.key;
    resetLeaving();
    pm.next = null;
    pm.hot = {};
    this.input.on('pointerdown', () => unlockAudio());
    // fullscreen needs a finished tap (pointerup); see platform.ts
    this.input.on('pointerup', () => {
      unlockAudio();
      goFullscreen(this);
    });
    this.bubble = new SpeechBubble(this, 640, 640, 760).setDepth(HUD + 20);
    this.build(data ?? {});
    if (windDownActive()) this.add.rectangle(0, 0, 1280, 720, 0xff9e57, 0.1).setOrigin(0).setDepth(HUD - 1);
    this.cameras.main.fadeIn(260, 26, 18, 12);
    this.time.addEvent({ delay: 5000, loop: true, callback: tickPlayTime });
  }

  protected music(id: keyof typeof THEMES, progress = 1): void {
    playMusic(id, progress, windDownActive());
  }

  /** Nana (or whoever owns the line) says a line from LINES. */
  protected line(id: string, opts: { ms?: number } = {}): void {
    const l = LINES[id];
    if (l) this.bubble.say(l.text, { who: l.who, id, ms: opts.ms });
  }

  /** Speak without showing a bubble. */
  protected sayQuiet(id: string): void {
    const l = LINES[id];
    if (l) void speak(l.who, l.text, id);
  }

  protected backButton(onTap: () => void = () => go(this, { scene: 'shop' }), icon = '⌂'): Phaser.GameObjects.Container {
    return roundButton(this, 56, 52, icon, onTap, { say: 'Back' }).setDepth(HUD);
  }

  protected heading(text: string, y = 52): Phaser.GameObjects.Text | null {
    if (!showWords()) return null;
    return this.add
      .text(640, y, text, { fontFamily: SERIF, fontSize: '40px', color: '#ffd76a', fontStyle: 'bold', stroke: '#2b1d14', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(HUD);
  }

  /** Golden Gears and Shiny Bits, top right. */
  protected counters(x = 1220): void {
    const p = profile();
    const gold = this.add.image(x - 150, 52, ensureGearTexture(this, 12, 'gold')).setDepth(HUD).setScale(0.8);
    this.add
      .text(gold.x + 26, 52, String(goldTotal(p)), { fontFamily: FONT, fontSize: '26px', color: '#ffe48a', fontStyle: 'bold', stroke: '#2b1d14', strokeThickness: 6 })
      .setOrigin(0, 0.5)
      .setDepth(HUD);
    const bit = this.add.image(x - 40, 52, 'bit').setDepth(HUD).setScale(1.8);
    this.shinyText = this.add
      .text(bit.x + 20, 52, String(p.shiny), { fontFamily: FONT, fontSize: '26px', color: '#e8f1ff', fontStyle: 'bold', stroke: '#2b1d14', strokeThickness: 6 })
      .setOrigin(0, 0.5)
      .setDepth(HUD);
  }

  protected shinyText?: Phaser.GameObjects.Text;

  protected refreshShiny(): void {
    this.shinyText?.setText(String(profile().shiny));
  }

  /** Register a tappable for the automated playthrough. */
  protected hot(name: string, fn: () => void): void {
    pm.hot[name] = fn;
  }
}

/** Free composition replaces the Invention Bench; the old route and saves remain valid. */
import Phaser from 'phaser';
import { playComposition, musicBoxTone, type MusicPlayback, type MusicTone } from '../audio/composer';
import { stopMusic } from '../audio/music';
import { stopVoice } from '../audio/voice';
import { drawRoomBackdrop } from '../art/backgrounds';
import { CM, CM_CSS, drawTimber } from '../art/copperMoss';
import { etchedPlate, rivet } from '../art/finish';
import { MachineArt } from '../art/objects';
import { checkStamps, repairDone, setFlag } from '../core/progress';
import { persist, persistSoon, profile } from '../core/save';
import { musicDraft, musicTempo, MUSIC_NOTES, NOTE_NAMES, toggleMusicPin, writeMusicNote, type MusicDraft } from '../mechanism/composer';
import { blocker, card, FONT, roundButton, scrollGrid, setButtonIcon, showWords, tile, toast } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';
import { go } from './router';

const ROLL = { x: 300, y: 210, w: 800, row: 28 };
const COLORS = [CM.copper, CM.brass, CM.moss, CM.teal, CM.slate, 0x8b7585, 0xb89176, CM.copperLight, CM.mossLight, CM.tealLight];

export class MusicBoxScene extends MetaScene {
  private draft!: MusicDraft;
  private history: MusicDraft[] = [];
  private playing?: MusicPlayback;
  private audition?: MusicTone;
  private loop = false;
  private lastBeat = -1;
  private pins!: Phaser.GameObjects.Graphics;
  private playhead!: Phaser.GameObjects.Graphics;
  private playButton!: Phaser.GameObjects.Container;
  private loopMark!: Phaser.GameObjects.Text;
  private tempoLabel!: Phaser.GameObjects.Text;
  private beatLabel!: Phaser.GameObjects.Text;
  private nameLabel!: Phaser.GameObjects.Text;
  private keys: Phaser.GameObjects.Graphics[] = [];
  private panel: Phaser.GameObjects.GameObject[] = [];
  private box!: MachineArt;

  constructor() { super('bench'); }

  protected build(): void {
    this.draft = musicDraft(profile().musicBox);
    this.history = []; this.keys = []; this.panel = []; this.loop = false; this.lastBeat = -1;
    this.playing = undefined; this.audition = undefined;
    stopMusic();
    drawRoomBackdrop(this, 'musicbox', 700).setDepth(0);
    this.bubble.setY(123);
    this.backButton(() => { this.stop(); persist(); this.scene.start('shop'); });
    this.heading('My Music Box');
    if (repairDone(profile(), 8)) roundButton(this, 143, 52, '🪺', () => {
      this.stop(); go(this, { scene: 'room', launch: { roomId: '8-7', mode: 'free' } });
    }, { r: 27, say: 'Nest Studio' }).setDepth(HUD);
    roundButton(this, 1220, 52, '?', () => { this.stop(); this.line('musicbox.help'); }, { r: 28, say: 'Help' }).setDepth(HUD);
    this.nameLabel = this.add.text(1110, 53, '♪', { fontFamily: FONT, fontSize: '22px', color: CM_CSS.cream, stroke: CM_CSS.ink, strokeThickness: 3 }).setOrigin(.5).setDepth(HUD);
    const wood = this.add.graphics().setDepth(2);
    drawTimber(wood, 233, 165, 941, 361, 863, CM.woodDark);
    etchedPlate(wood, 249, 177, 910, 337, CM.copperDark, 1, 379);
    etchedPlate(wood, ROLL.x - 7, ROLL.y - 6, ROLL.w + 14, MUSIC_NOTES * ROLL.row + 12, CM.brass, 1, 322);
    for (const x of [ROLL.x - 26, ROLL.x + ROLL.w + 26]) {
      wood.fillStyle(CM.copperLight); wood.fillRoundedRect(x - 10, ROLL.y - 12, 20, 304, 8);
      wood.lineStyle(2, CM.ink, .7); wood.strokeRoundedRect(x - 10, ROLL.y - 12, 20, 304, 8);
      rivet(wood, x, ROLL.y - 3); rivet(wood, x, ROLL.y + 283);
    }
    const cell = ROLL.w / this.draft.steps;
    for (let step = 0; step < this.draft.steps; step++) {
      const x = ROLL.x + (step + .5) * cell;
      this.add.text(x, 190, String(step + 1), { fontFamily: FONT, fontSize: '15px', color: CM_CSS.cream }).setOrigin(.5).setDepth(3);
      const select = this.add.zone(x, 188, cell, 30).setInteractive({ useHandCursor: true }).setDepth(4);
      select.on('pointerup', () => { this.stop(); this.draft.cursor = step; this.remember(); this.refresh(); });
      for (let note = 0; note < MUSIC_NOTES; note++) {
        const y = this.rowY(note);
        wood.lineStyle(step % 4 === 0 ? 2 : .6, CM.copperDark, .35);
        wood.lineBetween(ROLL.x + step * cell, ROLL.y, ROLL.x + step * cell, ROLL.y + MUSIC_NOTES * ROLL.row);
        wood.fillStyle(CM.copperDark, .72); wood.fillCircle(x, y, 4.7);
        wood.fillStyle(CM.cream, .28); wood.fillCircle(x - .6, y + 1, 2.2);
        this.add.zone(x, y, cell - 1, ROLL.row - 1).setDepth(4).setInteractive({ useHandCursor: true }).on('pointerup', () => {
          this.edit(toggleMusicPin(this.draft, step, note));
          if (this.draft.pins.includes(`${step}:${note}`)) this.hear(note);
        });
      }
    }
    for (let note = 0; note < MUSIC_NOTES; note++) {
      const y = this.rowY(note);
      wood.fillStyle(COLORS[note]); wood.fillCircle(263, y, 8);
      if (showWords()) this.add.text(242, y, NOTE_NAMES[note], { fontFamily: FONT, fontSize: '14px', color: CM_CSS.cream }).setOrigin(1, .5).setDepth(4);
    }
    this.pins = this.add.graphics().setDepth(5);
    this.playhead = this.add.graphics().setDepth(6);
    this.box = new MachineArt(this, 132, 448, 'musicbox', .62).setDepth(7).setName('composer:musicbox');
    this.beatLabel = this.add.text(130, 481, '', { fontFamily: FONT, fontSize: '18px', color: CM_CSS.cream, stroke: CM_CSS.ink, strokeThickness: 3 }).setOrigin(.5).setDepth(7);
    this.keyboard();
    this.controls();
    this.refresh();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.stop(); this.closePanel(); this.remember(); persist(); });
    this.time.delayedCall(350, () => this.line('musicbox.help'));
  }

  private rowY(note: number): number { return ROLL.y + (MUSIC_NOTES - note - .5) * ROLL.row; }

  private keyboard(): void {
    const frame = this.add.graphics().setDepth(3);
    etchedPlate(frame, 258, 533, 896, 92, CM.woodDark, 1, 844);
    for (let note = 0; note < MUSIC_NOTES; note++) {
      const x = 270 + note * 88, g = this.add.graphics().setDepth(4);
      g.fillStyle(CM.copperDark); g.fillRoundedRect(x + 2, 545, 81, 77, 5);
      g.fillStyle(CM.cream); g.fillRoundedRect(x, 540, 81, 76, 5);
      g.lineStyle(1.5, CM.ink, .8); g.strokeRoundedRect(x, 540, 81, 76, 5);
      g.fillStyle(COLORS[note]); g.fillRoundedRect(x + 6, 546, 69, 13, 4);
      const flash = this.add.graphics().setDepth(5); this.keys.push(flash);
      if (showWords()) this.add.text(x + 40, 582, NOTE_NAMES[note], { fontFamily: FONT, fontSize: '20px', color: CM_CSS.ink, fontStyle: 'bold' }).setOrigin(.5).setDepth(6);
      else { g.fillStyle(COLORS[note]); g.fillCircle(x + 40, 585, 10); }
      this.add.zone(x + 40, 578, 85, 82).setDepth(7).setInteractive({ useHandCursor: true }).setName(`composer:key:${note}`).on('pointerup', () => {
        this.edit(writeMusicNote(this.draft, note)); this.hear(note);
        flash.clear().fillStyle(COLORS[note], .45).fillRoundedRect(x, 540, 81, 76, 5);
        this.time.delayedCall(180, () => flash.active && flash.clear());
      });
    }
    roundButton(this, 135, 579, '→', () => this.edit(writeMusicNote(this.draft, null)), { r: 36, label: showWords() ? 'Rest' : undefined, say: 'Silent beat' }).setDepth(HUD).setName('composer:rest');
  }

  private controls(): void {
    const button = (name: string, x: number, icon: string, label: string, fn: () => void, r = 34) => {
      const b = roundButton(this, x, 665, icon, fn, { r, label: showWords() ? label : undefined }).setDepth(HUD).setName(`composer:${name}`);
      b.setData('caption', b.list.find(o => o instanceof Phaser.GameObjects.Text && o.text === label));
      return b;
    };
    button('undo', 80, '↺', 'Undo', () => { const old = this.history.pop(); if (old) { this.stop(); this.draft = old; this.remember(); this.refresh(); } });
    button('clear', 180, '🧹', 'Clear', () => { if (this.draft.pins.length) this.edit({ ...this.draft, pins: [], cursor: 0 }); });
    button('slower', 300, '−', 'Slower', () => this.tempo(-10));
    this.tempoLabel = this.add.text(388, 665, '', { fontFamily: FONT, fontSize: '23px', color: CM_CSS.cream, stroke: CM_CSS.ink, strokeThickness: 3, align: 'center' }).setOrigin(.5).setDepth(HUD);
    button('faster', 478, '+', 'Faster', () => this.tempo(10));
    button('songs', 620, '♫', 'My tunes', () => this.gallery());
    button('save', 755, '✓', 'Save', () => this.saveSong());
    button('loop', 895, '⟳', 'Loop', () => { this.loop = !this.loop; this.stop(); this.loopMark.setText(this.loop ? '●' : '○'); });
    this.loopMark = this.add.text(940, 666, '○', { fontFamily: FONT, fontSize: '25px', color: CM_CSS.cream, stroke: CM_CSS.ink, strokeThickness: 2 }).setOrigin(.5).setDepth(HUD);
    this.playButton = button('play', 1080, '▶', 'Play', () => this.togglePlayback(), 42);
  }

  private tempo(change: number): void {
    const bpm = musicTempo(this.draft.bpm + change);
    if (bpm !== this.draft.bpm) this.edit({ ...this.draft, bpm });
  }

  private edit(next: MusicDraft): void {
    this.stop(); this.bubble.hide();
    this.history.push(musicDraft(this.draft));
    this.draft = musicDraft(next); this.nameLabel.setText('♪'); this.remember(); this.refresh();
  }

  private remember(): void { profile().musicBox = musicDraft(this.draft); persistSoon(); }

  private hear(note: number): void { stopVoice(); this.audition?.stop(); this.audition = musicBoxTone(note); }

  private stop(): void {
    this.playing?.stop(); this.playing = undefined; this.audition?.stop(); this.audition = undefined;
    this.box?.setWorking(false); this.lastBeat = -1;
    if (this.playButton?.active) {
      setButtonIcon(this.playButton, '▶'); (this.playButton.getData('caption') as Phaser.GameObjects.Text | undefined)?.setText('Play'); this.drawCursor(this.draft.cursor);
    }
    this.keys.forEach(g => g.active && g.clear());
  }

  private togglePlayback(): void {
    if (this.playing) { this.stop(); return; }
    if (!this.draft.pins.length) { this.line('musicbox.empty'); return; }
    this.bubble.hide(); stopVoice(); this.audition?.stop(); this.audition = undefined;
    this.playing = playComposition(this.draft, this.loop); this.box.setWorking(true);
    setButtonIcon(this.playButton, '■'); this.lastBeat = -1;
    (this.playButton.getData('caption') as Phaser.GameObjects.Text | undefined)?.setText('Stop');
  }

  update(): void {
    if (!this.playing) return;
    if (this.playing.ended) { this.stop(); return; }
    const beat = this.playing.beat;
    if (beat === this.lastBeat) return; this.lastBeat = beat;
    this.drawCursor(beat);
    for (let note = 0; note < MUSIC_NOTES; note++) {
      const g = this.keys[note]; g.clear();
      if (this.draft.pins.includes(`${beat}:${note}`)) g.fillStyle(COLORS[note], .42).fillRoundedRect(270 + note * 88, 540, 81, 76, 5);
    }
  }

  private refresh(): void {
    this.pins.clear();
    const cell = ROLL.w / this.draft.steps;
    for (const pin of this.draft.pins) {
      const [step, note] = pin.split(':').map(Number), x = ROLL.x + (step + .5) * cell, y = this.rowY(note);
      this.pins.fillStyle(CM.ink, .5).fillCircle(x + 1, y + 2, 9);
      this.pins.fillStyle(COLORS[note]).fillCircle(x, y, 9);
      this.pins.lineStyle(1.2, CM.ink, .85).strokeCircle(x, y, 9);
      this.pins.fillStyle(CM.cream, .75).fillCircle(x - 2.5, y - 3, 2.2);
    }
    this.tempoLabel.setText(`${this.draft.bpm}\n${showWords() ? 'beats / min' : '♪ / min'}`).setFontSize(22);
    this.drawCursor(this.draft.cursor);
  }

  private drawCursor(beat: number): void {
    if (!this.playhead?.active) return;
    const cell = ROLL.w / this.draft.steps, x = ROLL.x + beat * cell;
    this.playhead.clear().fillStyle(CM.cream, .19).fillRect(x, ROLL.y, cell, MUSIC_NOTES * ROLL.row);
    this.playhead.lineStyle(3, CM.cream, .9).strokeRoundedRect(x + 2, ROLL.y - 3, cell - 4, MUSIC_NOTES * ROLL.row + 6, 5);
    this.playhead.fillStyle(CM.cream).fillTriangle(x + cell / 2 - 6, 199, x + cell / 2 + 6, 199, x + cell / 2, 206);
    this.beatLabel.setText(`${beat + 1} / ${this.draft.steps}`);
  }

  private saveSong(): void {
    this.stop();
    if (!this.draft.pins.length) { this.line('musicbox.empty'); return; }
    const p = profile(), old = p.composed.find(song => JSON.stringify(musicDraft({ ...song, cursor: 0 })) === JSON.stringify({ ...musicDraft(this.draft), cursor: 0 }));
    const name = old?.name ?? `My tune ${p.composed.length + 1}`;
    if (!old) p.composed.push({ name, pins: [...this.draft.pins], bpm: this.draft.bpm, steps: this.draft.steps });
    setFlag(p, 'compose'); checkStamps(p); this.remember(); persist();
    this.nameLabel.setText('✓'); toast(this, name, undefined, '♫'); this.line('musicbox.saved');
  }

  private closePanel(): void { this.panel.splice(0).forEach(o => o.destroy()); }

  private gallery(): void {
    this.stop(); this.bubble.hide(); this.closePanel();
    const add = <T extends Phaser.GameObjects.GameObject>(o: T, depth = HUD + 11): T => { (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(depth); this.panel.push(o); return o; };
    add(blocker(this, HUD + 10, .65, () => this.closePanel()), HUD + 10);
    add(card(this, 640, 360, 1040, 536).setInteractive(new Phaser.Geom.Rectangle(120, 92, 1040, 536), Phaser.Geom.Rectangle.Contains), HUD + 10.5);
    add(roundButton(this, 1118, 128, '✕', () => this.closePanel(), { r: 25, say: 'Close' }));
    const songs = profile().composed;
    add(this.add.text(640, 125, showWords() ? 'My tunes' : '♫', { fontFamily: FONT, fontSize: '30px', color: CM_CSS.ink }).setOrigin(.5));
    if (!songs.length) {
      add(this.add.text(640, 350, '♫  →  ✓', { fontFamily: FONT, fontSize: '56px', color: CM_CSS.teal }).setOrigin(.5));
      this.line('musicbox.keep'); return;
    }
    add(scrollGrid(this, 150, 180, 980, 408, songs.length, { w: 245, h: 136, cols: 4 }, (i, x, y) => {
      const song = songs[i];
      const entry = tile(this, x, y, 226, 120, () => {
        this.closePanel(); const oldSteps = this.draft.steps; this.edit(musicDraft({ ...song, cursor: 0 })); this.nameLabel.setText('♫');
        if (oldSteps !== this.draft.steps) { persist(); this.scene.restart(); }
      }, { caption: showWords() ? song.name : undefined, fill: CM.cream });
      entry.setName(`composer:song:${i}`);
      const score = this.add.graphics(); score.lineStyle(1, CM.copperDark, .45);
      for (let row = 0; row < 5; row++) score.lineBetween(-85, -31 + row * 10, 85, -31 + row * 10);
      const saved = musicDraft(song);
      for (const pin of saved.pins) {
        const [step, note] = pin.split(':').map(Number);
        score.fillStyle(COLORS[note]).fillCircle(-80 + step * 160 / saved.steps, 12 - note * 4.5, 3.5);
      }
      entry.add(score); return entry;
    }));
  }
}

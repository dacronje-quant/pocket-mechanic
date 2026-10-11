import { describe, expect, it } from 'vitest';
import { composition, musicBeats, musicDraft, musicTempo, toggleMusicPin, writeMusicNote } from './composer';

describe('music box composition', () => {
  it('keeps every note in a chord and every silent beat', () => {
    const beats = musicBeats({ pins: ['0:0', '0:4', '0:7', '15:9'] });
    expect(beats).toHaveLength(16);
    expect(beats[0]).toEqual([0, 4, 7]); expect(beats[1]).toEqual([]); expect(beats[15]).toEqual([9]);
  });
  it('cleans duplicate and malformed saved pins without changing valid music', () => {
    expect(composition({ pins: ['1:2', '0:0', '1:2', '-1:0', '16:0', '0:10', 'bad', '01:02', 'NaN:0'] }).pins).toEqual(['0:0', '1:2']);
  });
  it('loads older Pin Garden songs with a usable tempo and preserves the high notes', () => {
    expect(musicDraft({ pins: ['0:9', '5:8'] })).toEqual({ pins: ['0:9', '5:8'], bpm: 100, steps: 16, cursor: 0 });
  });
  it('bounds corrupt draft and tempo values', () => {
    expect(musicTempo(NaN)).toBe(100); expect(musicTempo(900)).toBe(180); expect(musicTempo(-5)).toBe(40);
    expect(musicDraft({ steps: Infinity, cursor: Infinity, bpm: NaN, pins: null as unknown as string[] })).toEqual({ pins: [], steps: 16, bpm: 100, cursor: 0 });
  });
  it('keyboard writes the selected beat, replaces its old chord and advances once', () => {
    const draft = musicDraft({ pins: ['2:0', '2:4', '3:7'], cursor: 2 });
    const next = writeMusicNote(draft, 5);
    expect(next.pins).toEqual(['2:5', '3:7']); expect(next.cursor).toBe(3);
    expect(draft.pins).toEqual(['2:0', '2:4', '3:7']);
  });
  it('a rest clears just that beat and wraps from the final beat', () => {
    const next = writeMusicNote(musicDraft({ pins: ['0:0', '15:5'], cursor: 15 }), null);
    expect(next.pins).toEqual(['0:0']); expect(next.cursor).toBe(0);
  });
  it('grid toggles chords without moving to another beat', () => {
    const a = toggleMusicPin(musicDraft({ pins: ['4:0'] }), 4, 7);
    expect(a.pins).toEqual(['4:0', '4:7']); expect(a.cursor).toBe(4);
    expect(toggleMusicPin(a, 4, 0).pins).toEqual(['4:7']);
    expect(toggleMusicPin(a, 20, 2)).toEqual(a);
  });
});

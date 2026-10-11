import { describe, expect, it } from 'vitest';
import { effective } from '../rules';
import { STORY_ROOMS } from './index';
import { QUICK_FIXES } from './quickfixes';
import { hasStyledVoice, roomVoice, roomVoiceId } from './roomVoice';
import type { PlayStyleId } from './types';
import { allVoiceLines, voiceRecordingIds } from './voicelines';
import { atticRooms } from './attic';

describe('instructions for changed puzzles', () => {
  it('uses the correct age-specific goal and hints without old recorded ids', () => {
    const catalogue = new Map(allVoiceLines().map(line => [line.id, line.text]));
    const styles: PlayStyleId[] = ['tinker', 'fixer', 'engineer'];
    const changed = STORY_ROOMS.filter(room => hasStyledVoice(room.kind));
    expect(changed).toHaveLength(10);
    for (const raw of changed) for (const style of styles) {
      const room = effective(raw, style);
      const spoken = roomVoice(room, style);
      const intro = spoken.intro.id;
      expect(intro).not.toBe(`${room.id}.intro`);
      expect(catalogue.get(intro)).toBe(spoken.intro.text);
      spoken.hints.forEach(line => {
        expect(catalogue.get(line.id)).toBe(line.text);
      });
    }
  });

  it('reuses the original voice instructions only for the six archived puzzles', () => {
    const archives = QUICK_FIXES.filter(fix => fix.id.startsWith('qf-archive-'));
    expect(archives).toHaveLength(6);
    const catalogue = new Map(allVoiceLines().map(line => [line.id, line.text]));
    for (const fix of archives) {
      const id = roomVoiceId(fix.room, 'fixer', 'intro');
      expect(id).toBe(`${fix.id.slice('qf-archive-'.length)}.intro`);
      expect(catalogue.get(id)).toBe(fix.room.intro);
    }
    expect(roomVoiceId({ id: '1-2', kind: 'gear' }, 'engineer', 'intro')).toBe('1-2.engineer.intro');
  });

  it('catalogues the exact instructions shown in every room and difficulty', () => {
    const catalogue = new Map(allVoiceLines().map(line => [line.id, line]));
    const rooms = [...STORY_ROOMS, ...QUICK_FIXES.map(fix => fix.room), ...atticRooms()];
    for (const raw of rooms) for (const style of ['tinker', 'fixer', 'engineer'] as const) {
      const spoken = roomVoice(effective(raw, style), style);
      for (const line of [spoken.intro, ...spoken.hints]) expect(catalogue.get(line.id), line.id).toEqual(line);
    }
  });

  it('describes the real remaining actions on simplified classic boards', () => {
    const spoken = (id: string) => roomVoice(effective(STORY_ROOMS.find(room => room.id === id)!, 'tinker'), 'tinker');
    expect(spoken('1-1').hints[2].text).toMatch(/Pull button/);
    expect(spoken('1-1').hints.map(line => line.text).join(' ')).not.toMatch(/fulcrum/);
    expect(spoken('1-4').intro.text).toMatch(/Tap.*bob/);
    expect(spoken('1-4').hints.map(line => line.text).join(' ')).not.toMatch(/pallet|metronome/);
    expect(spoken('1-5').intro.text).toMatch(/last gear/);
    expect(spoken('1-5').hints.map(line => line.text).join(' ')).not.toMatch(/first peg|second peg|Two pegs/);
    expect(spoken('6-5').intro.text).toMatch(/glowing move button/);
    expect(spoken('6-5').hints.map(line => line.text).join(' ')).not.toMatch(/Repeat|slot|card/);
    expect(spoken('8-7').hints[2].text).toMatch(/3 different nest spots/);
  });

  it('never selects a base recording that describes another difficulty', () => {
    const raw = STORY_ROOMS.find(room => room.id === '1-1')!;
    const engineer = roomVoice(effective(raw, 'engineer'), 'engineer');
    expect(voiceRecordingIds('nana', engineer.intro.text, `${raw.id}.intro`)).not.toContain(`${raw.id}.intro`);
    expect(voiceRecordingIds('nana', raw.intro, engineer.intro.id)).toContain(`${raw.id}.intro`);
    expect(voiceRecordingIds('magnus', raw.intro, `${raw.id}.intro`)).not.toContain(`${raw.id}.intro`);
  });

  it('asks for the manual check after balancing, without replacing the original lift instruction', () => {
    const raw = STORY_ROOMS.find(room => room.id === '1-1')!;
    const engineer = roomVoice(effective(raw, 'engineer'), 'engineer');
    expect(engineer.intro.text).toMatch(/Then press the Pull button\.$/);
    expect(engineer.hints[2].text).toMatch(/Then press the Pull button\.$/);
    expect(engineer.intro.id).toBe('1-1.engineer.intro.guided');
    expect(engineer.hints[2].id).toBe('1-1.engineer.hint.2.guided');
    expect(roomVoice(effective(raw, 'fixer'), 'fixer').intro).toEqual({ id: '1-1.intro', who: 'nana', text: raw.intro });
  });

  it('explains selecting two valves and the controls available in each sorting style', () => {
    const raw = STORY_ROOMS.find(room => room.id === '4-3')!;
    for (const style of ['tinker', 'fixer', 'engineer'] as const) {
      const room = effective(raw, style);
      const spoken = roomVoice(room, style);
      for (const line of [spoken.intro, spoken.hints[2]]) {
        expect(line.id).toMatch(/\.guided$/);
        expect(line.text).toMatch(/Touch two valves/);
        expect(line.text).toMatch(/arrow button to swap/);
        expect(line.text.includes('scales button')).toBe(room.kind === 'sorting' && room.mode === 'weight');
      }
      if (room.kind === 'sorting' && room.mode === 'weight') {
        expect(spoken.intro.text).toContain(`at most ${room.maxWeighings} weighings`);
        expect(spoken.hints[2].text).toContain('front valves of two ordered groups');
      }
    }
  });
});

import { describe, expect, it } from 'vitest';
import { effective } from '../rules';
import { STORY_ROOMS } from './index';
import { QUICK_FIXES } from './quickfixes';
import { hasStyledVoice, roomVoiceId } from './roomVoice';
import type { PlayStyleId } from './types';
import { allVoiceLines } from './voicelines';

describe('instructions for changed puzzles', () => {
  it('uses the correct age-specific goal and hints without old recorded ids', () => {
    const catalogue = new Map(allVoiceLines().map(line => [line.id, line.text]));
    const styles: PlayStyleId[] = ['tinker', 'fixer', 'engineer'];
    const changed = STORY_ROOMS.filter(room => hasStyledVoice(room.kind));
    expect(changed).toHaveLength(10);
    for (const raw of changed) for (const style of styles) {
      const room = effective(raw, style);
      const intro = roomVoiceId(room, style, 'intro');
      expect(intro).not.toBe(`${room.id}.intro`);
      expect(catalogue.get(intro)).toBe(room.intro);
      room.hints.forEach((text, tier) => {
        expect(catalogue.get(roomVoiceId(room, style, `hint.${tier}`))).toBe(text);
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
    expect(roomVoiceId({ id: '1-2', kind: 'gear' }, 'engineer', 'intro')).toBe('1-2.intro');
  });
});

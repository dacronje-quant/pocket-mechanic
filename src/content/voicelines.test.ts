import { describe, expect, it } from 'vitest';
import { LINES, storyById } from './story';
import { allVoiceLines, uiLineId } from './voicelines';
import { VOICES } from './voices';

/** Every source file's text (scenes, rooms, …), to check the ids they speak. */
const SRC = Object.entries(import.meta.glob('../**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)
  .filter(([path]) => !path.endsWith('.test.ts'))
  .map(([, text]) => text);

describe('voice lines', () => {
  const lines = allVoiceLines(['Back to the shop', 'Next!']);

  it('have unique ids, words, and a known speaker', () => {
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
    for (const l of lines) {
      expect(l.text.trim().length, l.id).toBeGreaterThan(0);
      expect(VOICES[l.who], `${l.id} speaker ${l.who}`).toBeDefined();
    }
    expect(lines.length).toBeGreaterThan(800);
  });

  it('cover every speaking character with a Gemini voice or beeps', () => {
    for (const l of lines) expect(VOICES[l.who].gemini || VOICES[l.who].beeps || l.who === 'pudding', l.id).toBeTruthy();
  });

  it('include read-aloud button labels under the ids the buttons use', () => {
    const ids = new Set(lines.map((l) => l.id));
    expect(ids.has(uiLineId('Back to the shop'))).toBe(true);
    expect(ids.has(uiLineId('Next!'))).toBe(true);
  });

  it('include every LINES id that scenes and rooms speak', () => {
    const used = new Set<string>();
    for (const src of SRC) {
      for (const m of src.matchAll(/(?:this\.line|this\.sayQuiet)\('([\w.-]+)'/g)) used.add(m[1]);
      for (const m of src.matchAll(/LINES\['([\w.-]+)'\]/g)) used.add(m[1]);
    }
    expect(SRC.length).toBeGreaterThan(50);
    expect(used.size).toBeGreaterThan(30);
    for (const id of used) expect(LINES[id], id).toBeDefined();
  });

  it('include every story the scenes start by name', () => {
    const used = new Set<string>();
    for (const src of SRC) for (const m of src.matchAll(/scene: 'story', id: '([\w-]+)'/g)) used.add(m[1]);
    for (const id of ['prologue', 'attic-open', 'magnus-nest', 'bell-silent', 'closing-time', 'box-open']) used.add(id);
    for (const id of used) expect(storyById(id), id).toBeDefined();
  });
});

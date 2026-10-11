import { describe, expect, it } from 'vitest';
import { STORIES, storyById } from '../content/story';
import { storyHoldMs, storyMachineSpeaker, storyPeople } from './storyPresentation';

describe('story staging', () => {
  it('gives the speaking repaired robot exactly one stage body', () => {
    const story = storyById('r6-return')!;
    expect(storyMachineSpeaker(story)).toBe('bertie');
    expect(storyPeople(story).map(p => p.who)).toEqual(['pockets', 'nana']);
    expect(story.cast).toContain('bertie'); // narration and speaker badge stay intact
  });
  it('keeps every supporting character visible with room for the dialogue strip', () => {
    for (const story of STORIES) {
      const people = storyPeople(story);
      expect(people.length).toBe(story.cast.filter(who => who !== 'kip' && who !== 'tess' && who !== storyMachineSpeaker(story)).length);
      for (const person of people) {
        expect(Number.isFinite(person.x), `${story.id}/${person.who}`).toBe(true);
        expect(person.x - 175 * person.scale).toBeGreaterThan(0);
        expect(person.x + 175 * person.scale).toBeLessThan(1280);
        expect(person.y + 280 * person.scale).toBeLessThan(580);
      }
    }
    expect(storyPeople(storyById('epilogue')!)).toHaveLength(6);
  });
  it('holds a visual beat for beeps and scales caption time within a bounded scene', () => {
    expect(storyHoldMs('Bing?', false)).toBeGreaterThanOrEqual(1800);
    expect(storyHoldMs('A long line '.repeat(10), true)).toBeGreaterThan(storyHoldMs('Bing?', true));
    expect(storyHoldMs('A long line '.repeat(100), true)).toBeLessThanOrEqual(6500);
  });
});

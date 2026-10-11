import type { CharId, StoryDef } from '../content/types';

/** A speaking machine occupies its own stage position, rather than getting a second body. */
export function storyMachineSpeaker(story: StoryDef): CharId | undefined {
  return story.object?.id === 'bertie' && story.cast.includes('bertie') ? 'bertie' : undefined;
}

/** Keep everyone in frame, including the six townsfolk in the epilogue. */
export function storyPeople(story: StoryDef): Array<{ who: CharId; x: number; y: number; scale: number }> {
  const machine = storyMachineSpeaker(story);
  const people = [...new Set(story.cast)].filter(who => who !== 'kip' && who !== 'tess' && who !== machine);
  const crowded = people.length > 4;
  const slots = story.object ? [170, 1110, 360, 920, 530, 750] : [240, 1040, 490, 790, 115, 1165];
  return people.map((who, i) => ({ who, x: slots[i] ?? 100 + i * 100, y: crowded ? 360 : 310, scale: crowded ? .58 : people.length > 2 ? .78 : .95 }));
}

/** Short beep lines still get a visual beat; fast narration never outruns readable captions. */
export function storyHoldMs(text: string, words: boolean): number {
  return words ? Math.min(6500, Math.max(1800, text.trim().split(/\s+/).length * 220)) : 1800;
}

/**
 * Character voices. `gemini` is the prebuilt voice and delivery style used by
 * scripts/generate-audio.mjs; `pitch`/`rate` shape the device-speech fallback.
 * Kip and Tess never talk — they beep (GDD §5).
 */
import type { CharId } from './types';

export interface VoiceDef {
  name: string;
  gemini?: { voice: string; style: string };
  pitch: number;
  rate: number;
  beeps?: boolean;
}

const slow = 0.92; // little ears: everyone speaks a touch slower than normal

export const VOICES: Record<CharId, VoiceDef> = {
  nana: { name: 'Nana Odette', gemini: { voice: 'Sulafat', style: 'a warm, kind, slightly forgetful grandmother clockmaker; gentle, smiling and unhurried' }, pitch: 1.05, rate: slow },
  kip: { name: 'Kip', pitch: 1.6, rate: 1, beeps: true },
  tess: { name: 'Tess', pitch: 1.8, rate: 1, beeps: true },
  albert: { name: 'Albert Finch', gemini: { voice: 'Algieba', style: 'a round, gentle baker; warm, sentimental and a little flustered' }, pitch: 0.85, rate: slow },
  rosa: { name: 'Rosa', gemini: { voice: 'Leda', style: 'a bright, chatty seven-year-old girl, brave and imaginative' }, pitch: 1.45, rate: 0.98 },
  theo: { name: 'Theo', gemini: { voice: 'Puck', style: 'an excited five-year-old boy who adores trains' }, pitch: 1.5, rate: 1 },
  ada: { name: 'Ada', gemini: { voice: 'Zephyr', style: 'a bossy but sweet five-year-old girl who is in charge' }, pitch: 1.55, rate: 1 },
  marigold: { name: 'Captain Marigold', gemini: { voice: 'Gacrux', style: 'a gruff but kind retired lighthouse keeper; steady and secretly sentimental' }, pitch: 0.8, rate: slow },
  pepperwhistle: { name: 'Mrs. Pepperwhistle', gemini: { voice: 'Callirrhoe', style: 'a tall, theatrical cafe owner; grand, dramatic and delighted' }, pitch: 1.15, rate: 0.95 },
  pockets: { name: 'Professor Pockets', gemini: { voice: 'Fenrir', style: 'an eccentric, excitable fairground showman' }, pitch: 0.95, rate: 1 },
  juniper: { name: 'Miss Juniper', gemini: { voice: 'Aoede', style: 'a gentle, dreamy schoolteacher who loves the stars; soft and calm' }, pitch: 1.1, rate: slow },
  magnus: { name: 'Magnus', gemini: { voice: 'Algenib', style: 'a vain, gloriously over-the-top theatrical magpie, never scary, secretly lonely' }, pitch: 0.75, rate: 0.95 },
  coo: { name: 'Coo', gemini: { voice: 'Puck', style: 'a dramatic, squawky wooden cuckoo bird' }, pitch: 1.7, rate: 1.05 },
  clementine: { name: 'Clementine', gemini: { voice: 'Leda', style: 'a tiny graceful dancing fox, whispery and kind' }, pitch: 1.6, rate: 0.95 },
  mice: { name: 'The Conductor Mice', gemini: { voice: 'Zephyr', style: 'three tiny cheerful mice in conductor hats' }, pitch: 1.9, rate: 1.1 },
  humbug: { name: 'The Hum-bugs', gemini: { voice: 'Aoede', style: 'tiny glowing beetles humming in harmony' }, pitch: 1.8, rate: 1 },
  steamington: { name: 'Sir Steamington', gemini: { voice: 'Iapetus', style: 'a dignified, very proper clockwork butler' }, pitch: 0.9, rate: 0.95 },
  bertie: { name: 'Big Bertie', gemini: { voice: 'Orus', style: 'a booming, joyful fairground robot who loves to dance' }, pitch: 0.6, rate: 0.9 },
  lumen: { name: 'Lumen', gemini: { voice: 'Leda', style: 'a shy, soft-spoken moth' }, pitch: 1.6, rate: 0.95 },
  pigeon: { name: 'The Bell-ringers', gemini: { voice: 'Puck', style: 'a friendly family of pigeons' }, pitch: 1.3, rate: 1.05 },
  whisker: { name: 'Whisker', gemini: { voice: 'Puck', style: 'a plump, easily startled mouse who loves crumbs' }, pitch: 1.9, rate: 1.1 },
  pudding: { name: 'Pudding', pitch: 0.5, rate: 0.7 },
  pip: { name: 'Pip', gemini: { voice: 'Puck', style: 'a giggly toddler' }, pitch: 1.7, rate: 0.95 },
  ade: { name: 'Mr. Ade', gemini: { voice: 'Iapetus', style: 'a cheerful postman who is always whistling' }, pitch: 0.95, rate: 1 },
  odum: { name: 'Mrs. Odum', gemini: { voice: 'Gacrux', style: 'a down-to-earth farmer who loves the weather' }, pitch: 1.0, rate: slow },
  lindqvist: { name: 'Mr. Lindqvist', gemini: { voice: 'Charon', style: 'a precise piano teacher who is secretly silly' }, pitch: 0.9, rate: slow },
  busker: { name: 'The Busker', gemini: { voice: 'Fenrir', style: 'a friendly park busker' }, pitch: 1.0, rate: 1 },
  mateo: { name: 'Mateo', gemini: { voice: 'Puck', style: "Rosa's giggly little brother" }, pitch: 1.6, rate: 1 },
  odette: { name: 'Young Odette', gemini: { voice: 'Kore', style: 'an eager eleven-year-old apprentice clockmaker, long ago' }, pitch: 1.4, rate: 0.95 },
  fisher: { name: 'The Fishers', gemini: { voice: 'Iapetus', style: 'a cheerful, grateful fisherman' }, pitch: 0.9, rate: 1 },
};

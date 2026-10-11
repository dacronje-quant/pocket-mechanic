import { COSMETICS, type CosmeticSlot } from '../content/cosmetics';

/** Row-major cells in the authored accessory sheets. Item IDs remain save-compatible. */
export const ACCESSORY_SHEETS = {
  'accessory-hats': { cols: 3, rows: 3, ids: ['hat-party', 'hat-feather', 'hat-tophat', 'hat-toque', 'hat-bow', 'hat-conductor', 'hat-flowers', 'hat-captain', 'hat-grad'] },
  'accessory-keys': { cols: 5, rows: 2, ids: ['key-classic', 'key-heart', 'key-star', 'key-bolt', 'key-whisk', 'key-clef', 'key-wheel', 'key-anchor', 'key-bell', 'key-master'] },
  'accessory-plates': { cols: 4, rows: 3, ids: ['plate-plain', 'plate-monogram', 'plate-gear', 'plate-heart', 'plate-firstmate', 'plate-wave', 'plate-teacup', 'plate-bertie', 'plate-rocket', 'plate-stars', 'plate-clockface'] },
  'accessory-toppers': { cols: 5, rows: 4, ids: ['bulb-classic', 'bulb-heart', 'bulb-moon', 'bulb-flower', 'topper-star', 'topper-propeller', 'topper-flag', 'topper-lighthouse', 'topper-gear', 'topper-note', 'topper-bell', 'topper-cloud', 'topper-rainbow', 'topper-lightning', 'topper-sun', 'topper-snowflake', 'topper-rocket', 'periscope', 'antenna-kip', 'antenna-tess'] },
  'accessory-feet': { cols: 4, rows: 2, ids: ['feet-springs', 'shoe-teal', 'feet-wheels', 'shoe-wheel-right', 'feet-clogs', 'shoe-clog-right', 'feet-rocket', 'shoe-rocket-right'] },
  'accessory-workshop': { cols: 4, rows: 3, ids: ['tool-classic', 'tool-rainbow', 'tool-golden', 'tool-teapot', 'tool-screwdriver', 'tool-copper', 'voice-classic', 'voice-chirpy', 'voice-musical', 'voice-bubbly', 'voice-retro', 'voice-musicbox'] },
} as const;

export interface AccessoryCell { sheet: keyof typeof ACCESSORY_SHEETS; index: number; cols: number; rows: number }
export function accessoryCell(id: string): AccessoryCell | undefined {
  // Colour bulbs share the authored filament glass; tinting preserves their metal socket.
  const item = /^bulb-(red|orange|yellow|green|blue|purple|pink|white)$/.test(id) ? 'bulb-classic' : id;
  for (const [sheet, atlas] of Object.entries(ACCESSORY_SHEETS)) {
    const index = (atlas.ids as readonly string[]).indexOf(item);
    if (index >= 0) return { sheet: sheet as AccessoryCell['sheet'], index, cols: atlas.cols, rows: atlas.rows };
  }
  return undefined;
}

export const SLOT_EXAMPLE: Record<CosmeticSlot, string> = {
  finish: 'finish-brass', key: 'key-heart', plate: 'plate-gear', eyes: 'eyes-round',
  bulb: 'bulb-flower', hat: 'hat-conductor', feet: 'feet-clogs', trail: 'trail-stars',
  voice: 'voice-musical', tool: 'tool-golden',
};

export type CosmeticVisual = 'sheet' | 'finish' | 'lenses' | 'trail' | 'empty';
export function cosmeticVisual(id: string): CosmeticVisual | undefined {
  const item = COSMETICS.find(c => c.id === id);
  if (!item) return undefined;
  if (id === 'hat-none' || id === 'trail-none') return 'empty';
  if (item.slot === 'finish') return 'finish';
  if (item.slot === 'eyes') return 'lenses';
  if (item.slot === 'trail') return 'trail';
  return accessoryCell(id) ? 'sheet' : undefined;
}

/** Frame-local attachment points, in the same 94-unit cells as the modular body. */
export function attachmentPose(pose: number, variant: 'kip' | 'tess') {
  const walking = pose === 2 || pose === 3;
  return {
    faceX: variant === 'tess' ? 11 : 10,
    faceY: variant === 'tess' ? -18 : -17,
    leftFoot: { x: -8, y: 31 },
    rightFoot: { x: walking ? 18 : 13, y: walking ? 26 : 31 },
    key: { x: -23, y: -21 },
    hat: { x: 5, y: -39 },
    antenna: { x: 25, y: -42 },
  };
}

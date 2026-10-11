import { describe, expect, it } from 'vitest';
import manifest from '../../public/art/manifest.json';
import { COSMETICS } from '../content/cosmetics';
import { ACCESSORY_SHEETS, accessoryCell, attachmentPose, cosmeticVisual } from './accessoryCatalog';

describe('complete accessory collection', () => {
  it('renders every saved cosmetic ID, including colour bulbs and empty options', () => {
    for (const item of COSMETICS) expect(cosmeticVisual(item.id), item.id).toBeDefined();
    for (const id of ['bulb-red','bulb-blue','bulb-purple','bulb-white']) expect(accessoryCell(id)).toEqual(accessoryCell('bulb-classic'));
    expect(cosmeticVisual('hat-none')).toBe('empty');
    expect(cosmeticVisual('trail-none')).toBe('empty');
  });
  it('keeps every authored part inside its sheet and publishes all required assets', () => {
    const images:Record<string,string>=manifest.images;
    for (const [id,sheet] of Object.entries(ACCESSORY_SHEETS)) {
      expect(sheet.ids.length).toBeLessThanOrEqual(sheet.cols*sheet.rows);
      expect(new Set(sheet.ids).size).toBe(sheet.ids.length);
      expect(images[id],id).toMatch(/^accessories\/[\w-]+\.webp$/);
    }
    for (const id of ['kip-modular','tess-modular']) expect(images[id],id).toMatch(/^accessories\/[\w-]+\.webp$/);
  });
  it('lifts the walking shoe rather than leaving it at the idle spring end', () => {
    for(const who of ['kip','tess'] as const){
      expect(attachmentPose(2,who).rightFoot.y).toBeLessThan(attachmentPose(0,who).rightFoot.y);
      expect(attachmentPose(3,who).rightFoot.x).toBeGreaterThan(attachmentPose(0,who).rightFoot.x);
    }
  });
});

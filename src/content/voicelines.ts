/**
 * Every line the game can speak, with a stable id: the catalogue that
 * scripts/generate-elevenlabs.mjs turns into voice files. Scenes speak the
 * same ids, so a generated file is used whenever the build has one (and the
 * device's own speech reads the line otherwise).
 */
import { ATTIC_OBJECTS, atticRooms } from './attic';
import { effective } from '../rules';
import { PLAY_STYLES } from '../core/styles';
import { roomVoice } from './roomVoice';
import { CARDS } from './bench';
import { STORY_ROOMS } from './index';
import { PEDIA, pediaLines } from './pedia';
import { QUICK_FIXES } from './quickfixes';
import { REPAIRS, TREASURES } from './repairs';
import { LINES, SPOKEN_PLAY_STYLE, STORIES } from './story';
import type { CharId, PlayStyleId, RoomDef } from './types';

export interface VoiceLine {
  id: string;
  who: CharId;
  text: string;
}

/** Voice-file id for a spoken button label (read-aloud menus). */
export const uiLineId = (say: string): string => `ui.${say.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

// These labels are assembled by controls rather than written as `say: '…'`.
// Keep them in the catalogue as well as the literals discovered by asset scripts.
const DYNAMIC_UI_LABELS = [
  'Kip', 'Tess', 'Run', 'Undo', 'Clear', 'Peek', 'Contraption Cards',
  'Contraption Code', 'Save', 'My machines', 'Nest Studio',
  ...['up', 'down', 'left', 'right'].map(direction => `Tilt ${direction}`),
  ...Object.values(PLAY_STYLES).map(style => style.tagline),
];

function roomLines(r: RoomDef): VoiceLine[] {
  const styles: PlayStyleId[] = ['tinker', 'fixer', 'engineer'];
  return styles.flatMap(style => {
    const spoken = roomVoice(effective(r, style), style);
    return [spoken.intro, ...spoken.hints];
  });
}

/** All spoken lines. `uiLabels` are the read-aloud button labels (found in the source by the script). */
export function allVoiceLines(uiLabels: string[] = []): VoiceLine[] {
  const out: VoiceLine[] = [];
  for (const s of STORIES) for (const l of s.lines) out.push({ id: l.id, who: l.who, text: l.text });
  for (const [id, l] of Object.entries(LINES)) out.push({ id, who: l.who, text: l.text });
  for (const [id, text] of Object.entries(SPOKEN_PLAY_STYLE)) out.push({ id: `style.${id}`, who: 'nana', text });
  for (const r of STORY_ROOMS) out.push(...roomLines(r));
  for (const q of QUICK_FIXES) {
    out.push(...roomLines(q.room));
    out.push({ id: `${q.id}.payoff`, who: q.owner, text: q.payoff });
  }
  for (const r of atticRooms()) out.push(...roomLines(r));
  for (const e of PEDIA) for (const l of pediaLines(e)) out.push({ id: l.id, who: 'nana', text: l.text });
  for (const o of ATTIC_OBJECTS) out.push({ id: `attic.${o.id}.history`, who: 'nana', text: o.history });
  for (const [id, t] of Object.entries(TREASURES)) out.push({ id: `treasure.${id}`, who: t.owner as CharId, text: t.line });
  for (const r of REPAIRS) out.push({ id: `town.${r.key}`, who: r.owner, text: r.tagline });
  for (const c of CARDS) out.push({ id: `card.${c.id}`, who: 'nana', text: c.say });
  for (const label of [...uiLabels, ...DYNAMIC_UI_LABELS]) {
    const id = uiLineId(label);
    if (id !== 'ui.') out.push({ id, who: 'nana', text: label });
  }
  // later entries never override earlier ones
  const seen = new Set<string>();
  return out.filter((l) => !seen.has(l.id) && seen.add(l.id) && l.text.trim().length > 0);
}

let spokenCatalogue: VoiceLine[] | undefined;
/** Reuse an existing performance only when its speaker and words still match. */
export function voiceRecordingIds(who: CharId, text: string, id: string): string[] {
  // Menu labels discovered by the offline generator may not be in the default
  // runtime catalogue. Their ids already encode their actual spoken words.
  if (id.startsWith('ui.') && id === uiLineId(text)) return [id];
  const lines = spokenCatalogue ??= allVoiceLines();
  const expected = lines.find(line => line.id === id);
  const matches = lines.filter(line => line.who === who && line.text === text);
  if (!expected) return [id, ...matches.map(line => line.id)];
  return [
    ...(expected.who === who && expected.text === text ? [id] : []),
    ...matches.filter(line => line.id !== id).map(line => line.id),
  ];
}

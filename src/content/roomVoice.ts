import type { PlayStyleId, RoomKind } from './types';

const VARIETY = new Set<RoomKind>([
  'shadow', 'slide', 'symmetry', 'packing', 'sorting',
  'sudoku', 'jugs', 'tilt', 'layers', 'difference',
]);

export function hasStyledVoice(kind: RoomKind): boolean {
  return VARIETY.has(kind);
}

/** Changed puzzles must never reuse a recording that explains their old rules. */
export function roomVoiceId(
  room: { id: string; kind: RoomKind },
  style: PlayStyleId,
  line: 'intro' | `hint.${number}`,
): string {
  if (hasStyledVoice(room.kind)) return `${room.id}.${room.kind}.${style}.${line}`;
  // Archived puzzles keep the original instructions and recordings.
  const original = /^qf-archive-(\d+-\d+)$/.exec(room.id)?.[1];
  return `${original ?? room.id}.${line}`;
}

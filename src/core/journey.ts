/**
 * The flow of a repair (GDD §6): Doorbell → rooms → Big Fix → Test Run →
 * Return → back to the shop. Expressed as a chain of steps that scenes hand
 * to each other, so any scene can be left and the journey resumed later.
 */
import { repairById, repairOfRoom } from '../content/repairs';
import { isBigFix } from '../content/index';
import type { Profile } from './save';
import { nextRoomOf, repairDone } from './progress';

export type RoomMode = 'story' | 'quick' | 'playground' | 'tuneup' | 'attic' | 'free';

export interface RoomLaunch {
  roomId: string;
  mode: RoomMode;
}

export type Step =
  | { scene: 'room'; launch: RoomLaunch }
  | { scene: 'story'; id: string; next: Step }
  | { scene: 'reveal'; repair: number; next: Step }
  | { scene: 'rewards'; repair: number; next: Step }
  | { scene: 'festival'; next: Step }
  | { scene: 'shop' }
  | { scene: 'quick' }
  | { scene: 'attic' }
  | { scene: 'shelf' };

const HOME: Step = { scene: 'shop' };

/** Wrap a step in a story scene the profile hasn't seen yet. */
function withStory(p: Profile, id: string, next: Step): Step {
  return p.seen.includes(id) ? next : { scene: 'story', id, next };
}

export function roomStep(p: Profile, roomId: string): Step {
  const room: Step = { scene: 'room', launch: { roomId, mode: 'story' } };
  if (roomId === '8-7') return withStory(p, 'magnus-nest', room);
  return room;
}

/** Start (or continue) a Great Repair from the shop. */
export function startRepair(p: Profile, repairId: number): Step {
  const r = repairById(repairId);
  return withStory(p, r.doorbell, roomStep(p, nextRoomOf(p, r)));
}

/** What happens after the Return of a repair (story beats, the festival). */
function afterReturn(p: Profile, repairId: number): Step {
  const r = repairById(repairId);
  let next: Step = HOME;
  if (repairId === 8) next = { scene: 'festival', next: HOME };
  const beats = [...(r.after ?? [])];
  // Act II closer: when the last of repairs 4–6 is done, the bell falls silent.
  if ([4, 5, 6].includes(repairId) && [4, 5, 6].every((id) => id === repairId || repairDone(p, id))) beats.push('bell-silent');
  for (const id of beats.reverse()) next = withStory(p, id, next);
  return next;
}

/** Where to go once a room is fixed (and the player taps "next"). */
export function afterRoom(p: Profile, launch: RoomLaunch): Step {
  switch (launch.mode) {
    case 'quick':
      return { scene: 'quick' };
    case 'attic':
      return { scene: 'attic' };
    case 'playground':
    case 'tuneup':
      return { scene: 'shelf' };
    case 'free':
      return HOME;
  }
  const r = repairOfRoom(launch.roomId);
  if (!r) return HOME;
  if (isBigFix(launch.roomId)) {
    const ret: Step = { scene: 'story', id: r.ret, next: { scene: 'rewards', repair: r.id, next: afterReturn(p, r.id) } };
    return { scene: 'reveal', repair: r.id, next: ret };
  }
  const i = r.rooms.indexOf(launch.roomId);
  return roomStep(p, r.rooms[i + 1]);
}

export function prologueOr(p: Profile, next: Step): Step {
  return withStory(p, 'prologue', next);
}

import { varietyStoryRooms } from './rooms/variety';
/** Content registry: every room by id, plus lookups used by scenes and tests. */
import { atticRoom } from './attic';
import { QUICK_FIX_ROOMS, QUICK_FIXES } from './quickfixes';
import { R1_ROOMS } from './rooms/r1';
import { R2_ROOMS } from './rooms/r2';
import { R3_ROOMS } from './rooms/r3';
import { R4_ROOMS } from './rooms/r4';
import { R5_ROOMS } from './rooms/r5';
import { R6_ROOMS } from './rooms/r6';
import { R7_ROOMS } from './rooms/r7';
import { R8_ROOMS } from './rooms/r8';
import type { RoomDef } from './types';

export const STORY_ROOMS: RoomDef[] = varietyStoryRooms([...R1_ROOMS, ...R2_ROOMS, ...R3_ROOMS, ...R4_ROOMS, ...R5_ROOMS, ...R6_ROOMS, ...R7_ROOMS, ...R8_ROOMS]);

const BY_ID = new Map<string, RoomDef>([...STORY_ROOMS, ...QUICK_FIX_ROOMS].map((r) => [r.id, r]));

export function getRoom(id: string): RoomDef | undefined {
  return BY_ID.get(id) ?? atticRoom(id);
}

export function quickFixOf(roomId: string) {
  return QUICK_FIXES.find((q) => q.room.id === roomId);
}

export const isBigFix = (id: string): boolean => id.endsWith('-bf');

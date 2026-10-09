/**
 * Songs (GDD §19): 12 found melodies (played in the Nook's mini music box)
 * plus the ones players compose in the Pin Garden. Notes index NOTE_FREQS;
 * -1 is a rest. All tunes are traditional or written for the game.
 */

export interface SongDef {
  id: string;
  name: string;
  /** Room or repair that unlocks it. */
  from: string;
  notes: number[];
  tempo: number;
}

export const SONGS: SongDef[] = [
  { id: 'song-cuckoo', name: 'Cuckoo Waltz', from: 'repair-1', notes: [7, 4, -1, 7, 4, -1, 5, 4, 3, 2, -1, 2, 4, 2, 0, -1], tempo: 3 },
  { id: 'song-lullaby', name: "Abuela's Lullaby", from: 'repair-2', notes: [2, 2, 4, -1, 2, 2, 4, -1, 2, 4, 7, 6, 5, 5, 4, -1], tempo: 2.5 },
  { id: 'song-birthday', name: 'Happy Birthday Line', from: 'repair-3', notes: [0, 0, 1, 0, 3, 2, -1, 0, 0, 1, 0, 4, 3, -1, -1, -1], tempo: 3 },
  { id: 'song-shanty', name: "Harbour Shanty", from: 'repair-4', notes: [4, 4, 4, 2, 4, 5, 4, 2, 1, 1, 1, 0, 1, 2, 4, -1], tempo: 3.5 },
  { id: 'song-teatime', name: 'Teatime Jig', from: 'repair-5', notes: [0, 2, 4, 2, 5, 4, 2, 0, 1, 3, 5, 3, 4, 2, 0, -1], tempo: 4 },
  { id: 'song-boogie', name: 'Bertie Boogie', from: 'repair-6', notes: [0, -1, 2, 4, 5, 4, 2, -1, 0, -1, 2, 4, 5, 4, 2, 0], tempo: 4 },
  { id: 'song-stars', name: 'Little Star Lullaby', from: 'repair-7', notes: [4, 7, 6, 5, 4, -1, 2, 4, 3, 2, 1, -1, 0, 2, 4, -1], tempo: 2.5 },
  { id: 'song-festival', name: 'Tick-Tock Festival March', from: 'repair-8', notes: [0, 0, 4, 4, 5, 5, 4, -1, 7, 7, 6, 6, 5, 5, 4, -1], tempo: 3.5 },
  { id: 'song-twinkle', name: 'Twinkle Twinkle', from: 'qf-piano', notes: [0, 0, 4, 4, 5, 5, 4, -1, 3, 3, 2, 2, 1, 1, 0, -1], tempo: 3 },
  { id: 'song-metronome', name: 'Metronome Étude', from: 'qf-metronome', notes: [0, 2, 4, 7, 4, 2, 0, -1, 1, 3, 5, 8, 5, 3, 1, -1], tempo: 3.5 },
  { id: 'song-bird', name: 'Clockwork Tweet', from: 'qf-bird', notes: [7, 9, 7, 9, 8, 7, -1, 4, 7, 9, 7, 9, 8, 7, -1, -1], tempo: 4 },
  { id: 'song-gramophone', name: 'Gramophone Swing', from: 'attic-gramophone', notes: [4, -1, 4, 5, 4, 2, -1, 0, 2, -1, 2, 4, 2, 0, -1, -1], tempo: 3 },
];

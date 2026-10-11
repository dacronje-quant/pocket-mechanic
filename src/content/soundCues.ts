/** Recorded voice chips keep saved cosmetic IDs stable. */
export const ROBOT_FLAVOURS = ['classic', 'chirpy', 'musical', 'bubbly', 'retro', 'musicbox'] as const;
export const ROBOT_CUES = ROBOT_FLAVOURS.map(flavour => `robot-${flavour}`);
export function robotCue(chip: string): string {
  return `robot-${ROBOT_FLAVOURS.find(flavour => chip === `voice-${flavour}`) ?? 'classic'}`;
}

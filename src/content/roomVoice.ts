import { parseGrid } from '../mechanism/flow';
import { parseLightGrid } from '../mechanism/light';
import type { Effective } from '../rules';
import type { PlayStyleId, RoomDef, RoomKind } from './types';

export interface RoomVoiceLine { id: string; who: 'nana'; text: string }
export interface RoomVoice { intro: RoomVoiceLine; hints: [RoomVoiceLine, RoomVoiceLine, RoomVoiceLine] }

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
  // Difficulty changes can replace the mechanism, pre-fit parts or turn cards
  // into a button-copying game. They must never play the base recording.
  if (style !== 'fixer') return `${room.id}.${style}.${line}`;
  // Archived puzzles keep their original recordings in the original rules.
  const original = /^qf-archive-(\d+-\d+)$/.exec(room.id)?.[1];
  return `${original ?? room.id}.${line}`;
}

/** Instructions are derived after the actual difficulty rules are applied. */
export function roomVoice(room: RoomDef | Effective<RoomDef>, style: PlayStyleId): RoomVoice {
  let intro = room.intro;
  let hints = room.hints;
  const set = (goal: string, nudge: string, clue: string, action: string) => {
    intro = goal;
    hints = [nudge, clue, action];
  };
  if (style === 'tinker' && room.simplify !== false && !hasStyledVoice(room.kind)) {
    switch (room.kind) {
      case 'gear':
        { const outputNames: Record<string, string> = { hands: 'clock hands', fan: 'fan', wheels: 'wheels', arm: 'planet arms', lift: 'lift', drum: 'music drum', bell: 'bell', spinner: room.id === 'qf-top' ? 'spinning top' : 'spinner', grinder: 'grinder', paddle: 'paddle wheel', dial: 'dial' };
        const goal = [...new Set(room.outputs.map(output => outputNames[output.widget] ?? 'machine'))].join(' and ');
        set(`Make the ${goal} turn. Put the last gear from the drawer onto the glowing peg.`,
          'Where does the turning stop?', 'Look for the empty peg beside the gears.', 'Drag the gear from the drawer onto the glowing peg.');
        break; }
      case 'flow': {
        const cells = parseGrid(room.grid).cells;
        const remaining = cells.filter(tile => tile?.sol);
        const slot = remaining.find(tile => tile?.slot);
        const tail = room.family === 'tracks' ? ' Then press the triangular Go button.' : '';
        const path = room.family === 'tracks' ? 'train track' : room.family === 'circuit' ? 'wire loop' : 'water path';
        if (slot) {
          set(`Finish the ${path}. Fit the last matching part into the glowing gap.${tail}`,
            'Follow the path. Where does it stop?', 'The glowing gap needs the part in the drawer.',
            `Drag the part onto the glowing gap. Tap it to turn it if its ends do not join.${tail}`);
        } else if (remaining.some(tile => tile?.sol?.state !== undefined)) {
          const label = room.family === 'pipes' ? 'wheel valve' : room.family === 'tracks' ? 'points' : 'switch';
          set(`Tap the ${label} to finish the path.${tail}`, 'Follow the path to the part that can click.',
            `The ${label} changes the path when you tap it.`, `Tap the glowing ${label}.${tail}`);
        } else {
          set(`Turn the glowing piece so the path joins up.${tail}`, 'Look where the path stops.',
            'The glowing piece has ends that need to join its neighbours.', `Tap the glowing piece to turn it until the ends join.${tail}`);
        }
        break;
      }
      case 'light': {
        const slot = parseLightGrid(room.grid).cells.find(tile => tile?.slot);
        const part = slot?.sol?.kind === 'P' ? 'prism' : slot?.sol?.kind === 'N' ? 'lens' : slot?.sol?.kind === 'F' ? 'colour filter' : 'mirror';
        if (slot) set(`The light needs one more ${part}. Put it in the glowing gap to wake the sensor.`,
          'Follow the light. Where does it stop?', `Look for the ${part} in the drawer.`, `Drag the ${part} into the glowing gap. Tap it to turn the light if needed.`);
        else set('Turn the glowing mirror so the light reaches the sensor.', 'Follow the light to the mirror.',
          'A mirror can turn the light round a corner.', 'Tap the glowing mirror to send the light towards the sensor.');
        break;
      }
      case 'logic':
        if (room.nodes.some(node => node.slot)) {
          const tail = room.goal.kind === 'reach' ? ' Then try the levers.' : ' Then press the triangular Test button.';
          set(`One gate is missing. Put the gate from the drawer in its glowing space.${tail}`,
            'Follow the chutes to the empty space.', 'The gate in the drawer fits that space.', `Drag the gate into the glowing space.${tail}`);
        }
        break;
      case 'cards':
        set("Copy Bertie's dance! Touch the glowing move button, one move at a time.",
          'Which move button is glowing?', 'The glowing button shows the next dance move.', 'Tap each glowing move button until the dance is complete.');
        break;
      case 'music':
        set('One note is missing. Tap the glowing hole to put its pin back and complete the song.',
          'Listen for the missing note.', 'The empty glowing hole needs a pin.', 'Tap the glowing hole on the music cylinder.');
        break;
      case 'tune':
        set('One setting needs a little nudge. Slide its handle into the green band.',
          'Find the handle outside its green band.', 'The green band shows where the handle belongs.', 'Drag that handle along its track into the green band.');
        break;
      case 'pendulum':
        set('The pendulum is ready. Tap its round bob to give it a push and start the ticking.',
          'Find the round bob at the end of the rod.', 'A gentle tap starts it swinging.', 'Tap the round pendulum bob.');
        break;
      case 'balance':
        if (room.mode === 'pulley') set('Add one pulley wheel, then press the Pull button to lift the load.',
          'The rope needs a wheel.', 'Put the drawer wheel into the glowing space.', 'Drag the wheel into its space, then press the Pull button at the bottom right.');
        else set('The beam is ready. Press the Pull button and watch it lift.', 'The weights are already in place.',
          'Kip is ready to pull.', 'Press the Pull button at the bottom right.');
        break;
      case 'oil':
        if (room.crank) set('The spring is ready to wind. Turn the crank, or hold its handle, until it is wound up.',
          'Find the big winding crank.', 'Holding its handle winds it too.', 'Keep turning the crank, or hold its handle, until the spring is ready.');
        break;
      case 'cam':
        set('One bumpy cam is missing. Put the cam from the drawer on the glowing shaft to finish the dance.',
          'Look for the rod without a bumpy wheel.', 'Its cam is waiting in the drawer.', 'Drag the cam onto the glowing empty shaft.');
        break;
      case 'chain':
        set('One link is missing. Fit the drawer part into the glowing gap, then press the triangular Run button.',
          'Follow the power to the empty gap.', 'The drawer part joins the chain.', 'Drag the part into the glowing gap, then press the triangular Run button.');
        break;
      case 'nest':
        set(`Let's make Magnus a happy nest! Drag decorations onto ${room.need} different nest spots.`,
          'Choose a shiny decoration from the drawer.', 'Each decoration needs its own nest spot.', `Fill ${room.need} different nest spots with decorations.`);
        break;
    }
  }
  // Some older Engineer overrides changed the gate network but inherited
  // hints describing the easier network's levers instead of its gate slots.
  if (style === 'engineer' && room.kind === 'logic' && room.nodes.some(node => node.slot)) {
    const labels: Record<string, string> = { AND: 'Both', OR: 'Either', NOT: 'Flip', LATCH: 'Remember' };
    const gates = room.nodes.filter(node => node.slot).map(node => labels[room.solution.gates?.[node.id] ?? ''] ?? 'matching');
    hints = ['Follow the chutes and compare them with the rule.',
      'Choose gates that make the output follow the rule for every input.',
      `Use ${gates.join(', then ')} ${gates.length === 1 ? 'gate' : 'gates'} in the empty spaces, then press the triangular Test button.`];
  }
  if (room.kind === 'balance' && room.mode === 'lever' && room.lever?.goal.kind === 'balance') {
    intro = `${intro} Then press the Pull button.`;
    hints = [hints[0], hints[1], `${hints[2]} Then press the Pull button.`];
  }
  if (room.kind === 'sorting') {
    if (room.mode === 'weight') {
      const limit = room.maxWeighings === undefined ? '' : ` in at most ${room.maxWeighings} weighings`;
      intro = `Put the radio valves from lightest to heaviest${limit}. Touch two valves. Press the scales button to weigh, or the arrow button to swap.`;
      hints = [hints[0], hints[1], 'Compare the front valves of two ordered groups. Touch two valves, then press the scales button to weigh or the arrow button to swap.'];
    } else {
      const action = 'Touch two valves, then press the arrow button to swap them.';
      intro = `${intro} ${action}`;
      hints = [hints[0], hints[1], `${hints[2]} ${action}`];
    }
  }
  if (room.kind === 'pendulum') {
    if (room.goal === 'sync') {
      set('Match the two pendulum lengths. Then press the triangular button to release them together and form the bridge.',
        'Longer pendulums swing more slowly. Equal lengths have the same beat.',
        'Slide the brass bob to the same distance below its pivot as the green bob.',
        'Match the bob lengths, then press the triangular button to release both together.');
    } else if (room.goal === 'tempo') {
      const target = Math.round(room.bpm ?? 60);
      set('Slide the brass bob along its rod to match the green reference: ' + target + ' ticks a minute. Then watch three ticks.',
        'The bob pauses while you hold it. Let go to hear the new beat.',
        'Longer swings are slower. Shorter swings are faster. Weight does not set the beat.',
        'Slide the bob to notch ' + room.solution.notches?.[room.pendulums.find(p => !p.fixed)!.id] + ', let go and watch it swing.');
    } else if (room.pendulums.length > 1) {
      set('The two pendulums are ready. Tap either round bob to start them together and form the bridge.',
        'The bobs are already at equal lengths.', 'Tap either bob to give both a gentle push.',
        'Tap a round bob, then watch both swing together.');
    } else if (room.pallet) {
      set('Fit the copper anchor from the drawer under the toothed wheel. Then tap the round bob to start the clock.',
        'The missing anchor catches one wheel tooth at each tick.',
        'Fit the copper anchor into its glowing space under the wheel.',
        'Fit the anchor, then tap the round bob and watch three ticks.');
    }
  }
  if (room.kind === 'difference') {
    intro = `${room.intro} Touch each difference on the right-hand picture.`;
    hints = [hints[0], hints[1], `${hints[2]} Touch the changed parts on the right-hand picture.`];
  }
  const line = (text: string, key: 'intro' | `hint.${number}`): RoomVoiceLine => {
    const authored = key === 'intro' ? room.intro : room.hints[Number(key.split('.')[1])];
    const id = roomVoiceId(room, style, key) + (text === authored ? '' : '.guided');
    return { id, who: 'nana', text };
  };
  return { intro: line(intro, 'intro'), hints: hints.map((text, i) => line(text, `hint.${i}`)) as RoomVoice['hints'] };
}

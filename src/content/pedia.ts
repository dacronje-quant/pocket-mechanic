/**
 * The Part-o-pedia (GDD §19.1): every part Kip meets. `say` is the spoken
 * description for young players, `how` is "How It Really Works", `home` is
 * "Spot It at Home!" (always with "ask a grown-up first" where it matters).
 */
import type { Family } from './types';

export interface PediaEntry {
  id: string;
  name: string;
  family: Family;
  say: string;
  how: string;
  home: string;
}

const GROWNUP = 'Ask a grown-up first!';
const WALL = 'Real electricity from the wall is dangerous — only grown-ups should open things that plug in.';

const e = (id: string, name: string, family: Family, say: string, how: string, home: string): PediaEntry => ({ id, name, family, say, how, home });

export const PEDIA: PediaEntry[] = [
  // gears & shafts
  e('gear', 'Gear', 'gears', 'A gear is a wheel with teeth. When two gears touch, turning one turns the other!', 'Bicycles use gears so your legs can push the wheels fast or slow.', 'Look at a bicycle chain wheel or an old egg whisk.'),
  e('mesh', 'Meshing', 'gears', 'Gears mesh when their teeth fit together. Meshed gears turn opposite ways.', 'Inside a wind-up toy, meshed gears pass the turning along, one to the next.', 'Find two gears touching in a toy, and watch which way each one turns.'),
  e('idler', 'Idler Gear', 'gears', 'An idler sits in the middle. It makes the gears on each side turn the same way.', 'Idler gears fill gaps in machines without changing the speed.', 'Count three gears in a row: the first and last turn the same way!'),
  e('gear-train', 'Gear Train', 'gears', 'A gear train is a line of gears passing turning along, like a relay race.', 'Clocks use gear trains to carry turning from the spring to the hands.', 'Peek through the back of a see-through clock.'),
  e('ratio', 'Gear Ratio', 'gears', 'Small gear turns big gear: slow and strong. Big gear turns small gear: fast!', 'A 10-tooth gear turning a 30-tooth gear goes round three times for each one turn of the big gear.', 'Pedal a bike in different gears and feel the difference.'),
  e('compound-gear', 'Compound Gear', 'gears', 'Two gears stuck on one shaft turn together, so their ratios multiply.', 'Clock hands use compound gears to make the hour hand go twelve times slower than the minute hand.', 'Look for a big and small gear stacked together in an old clock.'),
  e('planetary-gear', 'Planetary Gears', 'gears', 'Little planet gears roll around a big sun gear — just like an orrery.', 'Car gearboxes and electric screwdrivers hide planetary gears inside.', 'Ask a grown-up to show you a hand drill with a gear chuck.'),
  e('crank', 'Crank', 'gears', 'A crank is a bent handle. Turning it round turns a wheel or shaft.', 'Pencil sharpeners and old car engines both use cranks.', 'A pencil sharpener with a handle is a crank!'),
  e('flywheel', 'Flywheel', 'gears', 'A heavy flywheel keeps on spinning once it gets going.', 'Pull-back toy cars store their zoom in a little spinning flywheel.', 'Find a pull-back car and listen to it whirr.'),
  e('paddle-wheel', 'Paddle Wheel', 'gears', 'A paddle wheel pushes water as it turns, so the boat moves.', 'Old river steamboats had giant paddle wheels at the back.', 'In the bath, turn a toy paddle and feel the water push.'),
  e('wheel-axle', 'Wheel and Axle', 'gears', 'A wheel on a rod that turns with it. A little push on the wheel turns the rod strongly.', 'Door knobs are wheels and axles: easy to turn the knob, hard to turn the bare rod.', 'Try turning a door knob, then the thin spindle without it.'),
  // levers & simple machines
  e('lever', 'Lever', 'levers', 'A lever is a long bar that tips on a point. Push one end down, the other goes up!', 'See-saws, scissors and bottle openers are all levers.', 'Play on a see-saw — that is a lever.'),
  e('fulcrum', 'Fulcrum', 'levers', 'The fulcrum is the point a lever tips on. Move it, and lifting gets easier or harder.', 'Put the fulcrum close to a heavy load and a small push can lift it.', 'Balance a ruler on a pencil and slide the pencil.'),
  e('counterweight', 'Counterweight', 'levers', 'A counterweight balances a heavy load so it is easy to move.', 'Lifts and drawbridges use counterweights so the motor only does a little work.', 'Look at a crane: the big block at the back is a counterweight.'),
  e('pulley', 'Pulley', 'levers', 'A pulley is a wheel with a rope. More pulley wheels make heavy things feel lighter.', 'Builders use block-and-tackle pulleys to lift heavy beams.', 'Look for a pulley on a flagpole or window blind.'),
  e('ramp', 'Ramp', 'levers', 'A ramp is a slope. Rolling something up a ramp is easier than lifting it straight up.', 'Wheelchair ramps and slides are both ramps.', 'Roll a toy car down a book propped up as a ramp.'),
  e('wedge', 'Wedge', 'levers', 'A wedge is a slope that pushes things apart.', 'An axe and a doorstop are wedges.', 'A doorstop is a wedge. Ask a grown-up to show you one.'),
  e('screw', 'Screw', 'levers', 'A screw is a ramp wrapped round and round a rod.', 'Pepper grinders and jar lids use screw threads.', 'Twist a jar lid and feel the thread.'),
  e('nest', 'Nest', 'levers', "Magnus's new nest: a spinning, sparkling, music-playing home made from spare parts.", 'Real birds build nests from twigs, moss and sometimes shiny bits of string.', 'Look for nests in trees in spring — but never touch them.'),
  // springs & escapements
  e('spring', 'Spring', 'springs', 'A spring stores energy when you squash or wind it, and gives it back when you let go. Boing!', 'Pens, mattresses and trampolines all use springs.', 'Click a clicky pen — there is a spring inside.'),
  e('mainspring', 'Mainspring', 'springs', 'A mainspring is a long curly spring that powers a clock or music box.', 'Wind-up watches store a whole day of power in one mainspring.', 'Wind up a music box or a wind-up toy.'),
  e('ratchet', 'Ratchet and Pawl', 'springs', 'A ratchet only turns one way. The little pawl clicks into its teeth so it cannot slip back.', 'Socket wrenches and tape measures use ratchets.', 'Listen to a zip-tie or a tape measure clicking.'),
  e('escapement', 'Escapement', 'springs', 'The escapement lets a clock spring out a tiny bit at a time: tick, tock, tick.', 'Every mechanical clock has an escapement that makes the tick.', 'Listen closely to a ticking clock.'),
  e('governor', 'Governor', 'springs', 'A governor is a spinning fan or weights that stop a machine going too fast.', 'Music boxes use a little air-brake fan so the song never gallops.', 'Wind a music box and watch the tiny fan whirr.'),
  e('oil', 'Oil', 'springs', 'A drop of oil helps metal parts slide and stops them squeaking.', 'Bicycle chains need oil to run smoothly.', `Listen for a squeaky door. ${GROWNUP}`),
  e('hinge', 'Hinge', 'springs', 'A hinge lets a door or lid swing open and shut.', 'Doors, cupboards and laptop lids all swing on hinges.', 'Count the hinges on your bedroom door.'),
  e('bearing', 'Bearing', 'springs', 'A bearing is a ring of tiny balls that lets a wheel spin easily.', 'Skateboard wheels spin fast because of their bearings.', 'Spin a skateboard or scooter wheel.'),
  // pendulums & timing
  e('pendulum', 'Pendulum', 'pendulums', 'A pendulum is a weight on a rod that swings back and forth. A longer pendulum swings slower!', 'Grandfather clocks keep time with a long pendulum.', 'Tie a washer to a string and count its swings.'),
  e('metronome', 'Metronome', 'pendulums', 'A metronome ticks a steady beat so musicians play in time.', 'Sliding the weight up makes the beat faster; down makes it slower.', 'Clap along to a steady beat in a song.'),
  e('sync', 'In Sync', 'pendulums', 'Two pendulums of the same length swing together, side by side.', 'Long ago, people noticed clocks on the same wall slowly start to tick together.', 'Swing two strings of the same length together.'),
  // pins, cams & music
  e('cam', 'Cam', 'music', 'A cam is a bumpy wheel. As it turns, the bumps push things up and down.', 'Car engines use cams to open and close valves.', 'Look inside a moving toy that bobs up and down.'),
  e('follower', 'Cam Follower', 'music', 'The follower rides on the cam and goes up and down with its bumps.', 'Automata and dancing toys use followers to make figures move.', 'Watch a bobbing toy and guess the cam shape.'),
  e('bellows', 'Bellows', 'music', 'Bellows squash and stretch to puff air — to make a cuckoo sing or a fire glow.', 'Accordions use bellows to push air through their reeds.', 'Squeeze an empty squeezy bottle to feel the puff.'),
  e('pinned-cylinder', 'Pinned Cylinder', 'music', 'Each pin on the cylinder plucks one note as it turns round.', 'Music boxes play their song from a cylinder covered in pins.', 'Listen to a music box and watch the cylinder turn.'),
  e('comb', 'Steel Comb', 'music', 'A comb of steel teeth: short teeth sing high, long teeth sing low.', 'Each tooth is tuned like a tiny bell.', 'Twang a ruler on a table edge: shorter is higher!'),
  e('pitch', 'Pitch', 'music', 'Pitch is how high or low a sound is.', 'Faster wobbles make higher notes.', 'Sing a high note and a low note.'),
  e('chord', 'Chord', 'music', 'A chord is notes played together that sound nice side by side.', 'Do, Mi and Sol together make a happy chord.', 'Press three piano keys at once.'),
  e('wave', 'Sound Wave', 'music', 'Sound travels as invisible wiggles in the air. You can see them drawn as waves.', 'Radios tune in by matching a wave.', 'Feel your throat buzz when you hum.'),
  // tracks
  e('track', 'Track', 'tracks', 'Tracks guide a train wherever they go: straight, curved, over bridges.', 'Real railways have two steel rails held apart by sleepers.', 'Build a wooden train track loop.'),
  e('points', 'Points', 'tracks', 'Points are a switch in the track that sends the train left or right.', 'Signal staff change points so trains reach the right platform.', 'Make a track with a switch and try both ways.'),
  e('buffer', 'Buffer Stop', 'tracks', 'A buffer stop is the end of the line. Trains gently bump and stop.', 'Station platforms end with big springy buffers.', 'Look at the end of a train platform.'),
  e('signal', 'Signal', 'tracks', 'Signals tell trains when to stop and when to go.', 'Railway signals work like traffic lights for trains.', 'Spot traffic lights on a walk.'),
  e('locomotive', 'Locomotive', 'tracks', 'The locomotive is the engine that pulls the train.', 'Steam locomotives use steam to push pistons that turn the wheels.', 'Find a toy train engine.'),
  e('cargo', 'Cargo', 'tracks', 'Cargo is what a train carries: parcels, coal — or party favours!', 'Freight trains carry food and goods all over the country.', 'Load a toy truck with cargo.'),
  // circuits
  e('spark-cell', 'Spark Cell (Battery)', 'circuits', 'A Spark Cell pushes electricity out of one end and back into the other.', `Batteries power torches and toys. ${WALL}`, 'Find the battery hatch on a toy — with a grown-up.'),
  e('wire', 'Wire', 'circuits', 'Copper wire is a road for electricity. It needs a whole loop to flow.', 'Wires inside walls carry electricity to lamps.', `${WALL}`),
  e('bulb', 'Bulb', 'circuits', 'A bulb glows when electricity flows through it.', 'Old bulbs have a thin wire that glows hot. New ones use LEDs.', 'Count the lamps in your home.'),
  e('switch', 'Switch', 'circuits', 'A switch opens or closes the loop. Closed: on! Open: off.', 'Light switches break the loop to turn lamps off.', 'Flick a light switch on and off.'),
  e('bell', 'Electric Bell', 'circuits', 'An electric bell uses a magnet to tap a hammer very fast. Brrring!', 'Old school bells and doorbells ring with electromagnets.', 'Press a doorbell — with a grown-up nearby.'),
  e('motor', 'Motor', 'circuits', 'A motor turns electricity into spinning.', 'Fans, blenders and toy cars spin with motors.', 'Listen to a fan motor hum.'),
  e('snap-link', 'Snap Link (Fuse)', 'circuits', 'A Snap Link pops safely if too much electricity flows, so nothing gets hurt.', `Real fuses and circuit breakers protect homes. ${WALL}`, 'Ask a grown-up where your home fuse box is — just to look.'),
  e('series', 'Series', 'circuits', 'Lamps in a line share the electricity, so each glows dimmer.', 'Some old fairy lights went out completely if one bulb broke.', 'Spot a string of lights.'),
  e('parallel', 'Parallel', 'circuits', 'Lamps side by side each get the full push, so they all glow bright.', 'Your home is wired in parallel: one lamp off does not turn off the rest.', 'Turn one lamp off — the others stay on!'),
  e('tube', 'Vacuum Tube', 'circuits', 'Glowing glass tubes made old radios work, a bit like tiny electric taps.', 'Before tiny chips, radios and computers used warm glowing tubes.', 'Look for old radio pictures in a book.'),
  e('speaker', 'Speaker', 'circuits', 'A speaker wobbles a paper cone to turn electricity into sound.', 'Headphones are tiny speakers.', 'Feel a speaker buzz gently when music plays.'),
  e('radio-dial', 'Radio Dial', 'circuits', 'Turning the dial tunes the radio to one station out of many.', 'Every station sends its own wave; the dial picks one.', 'Turn a radio dial with a grown-up.'),
  e('magic-eye', 'Magic Eye', 'circuits', 'A glowing tuning eye that turns light back into a spark signal.', 'Old radios had a green glowing "magic eye" to show good tuning.', 'Ask a grown-up about old radios.'),
  e('dynamo', 'Dynamo', 'circuits', 'A dynamo turns spinning into electricity — the opposite of a motor!', 'Bike lights can be powered by a dynamo on the wheel.', 'Wind-up torches have a little dynamo inside.'),
  // pipes & steam
  e('pipe', 'Pipe', 'pipes', 'Pipes carry water or steam from one place to another.', 'Pipes bring water to your taps.', 'Find the pipe under a sink — just look.'),
  e('elbow', 'Elbow Pipe', 'pipes', 'An elbow pipe turns the water round a corner.', 'Every corner in a plumbing pipe is an elbow.', 'Look for bends in pipes under the sink.'),
  e('t-junction', 'T-Junction', 'pipes', 'A T-junction splits water two ways.', 'Gardens use T-pieces to send water to two sprinklers.', 'Find a hose splitter in a garden.'),
  e('valve', 'Valve', 'pipes', 'A valve opens and closes to let water through or stop it.', 'Every tap is a valve.', 'Turn a tap on and off.'),
  e('pump', 'Pump', 'pipes', 'A pump pushes water uphill.', 'Old wells had hand pumps to lift water up.', 'Use a pump bottle of soap.'),
  e('waterwheel', 'Waterwheel', 'pipes', 'Flowing water pushes a waterwheel round.', 'Old mills used waterwheels to grind flour.', 'Pour water over a toy waterwheel.'),
  e('boiler', 'Boiler', 'pipes', 'A boiler heats water until it turns into steam.', `Kettles are tiny boilers. Hot steam can burn — ${GROWNUP}`, 'Watch a kettle boil from a safe distance.'),
  e('steam', 'Steam', 'pipes', 'Steam is water so hot it turns into a cloud. It pushes hard!', `Steam trains were pushed along by steam. ${GROWNUP}`, 'Watch steam curl from a cup of tea — from a safe distance.'),
  e('pressure-gauge', 'Pressure Gauge', 'pipes', 'A gauge needle shows how hard the steam is pushing.', 'Bike pumps have pressure gauges.', 'Look at a bike pump gauge.'),
  e('piston', 'Piston', 'pipes', 'Steam pushes a piston out, like a strong arm.', 'Steam engines and car engines both use pistons.', 'Push a syringe without a needle in the bath.'),
  e('whistle', 'Steam Whistle', 'pipes', 'More steam pressure makes a higher whistle. Toot!', 'Steam trains and factories used whistles to signal.', 'Blow across a bottle top to make a whistle.'),
  // logic
  e('button', 'Button', 'logic', 'Press a button and something happens! It springs back when you let go.', 'Lift buttons, keyboards and doorbells.', 'Count the buttons on a remote control.'),
  e('both-gate', '"Both" Gate (AND)', 'logic', 'A door with two keyholes. It only opens when both are on.', 'Some machines need two buttons pressed at once to be safe.', 'Find something that needs two things at once.'),
  e('either-gate', '"Either" Gate (OR)', 'logic', 'A Y-shaped chute: a marble from either side gets through.', 'A room light that can be switched from either end of the stairs.', 'Find a light you can turn on from two switches.'),
  e('flip-gate', '"Flip" Gate (NOT)', 'logic', 'A seesaw: input down, output up. It does the opposite!', 'Night lights turn on when the room light turns off.', 'Spot a night light.'),
  e('latch', '"Remember" Latch', 'logic', 'A ratchet that clicks and stays clicked until you reset it.', 'Computers remember with millions of tiny latches.', 'A clicky pen remembers if it is in or out!'),
  e('punch-card', 'Punch Card', 'logic', 'Holes in a card tell a machine what to do, one row at a time.', 'Old looms and early computers read punch cards.', 'Punch holes in paper to make your own pattern.'),
  e('loop', 'Repeat Card (Loop)', 'logic', 'A Repeat card does the next card again and again.', 'Computer programs use loops so they do not have to repeat themselves.', 'Clap, clap, clap — that is a loop!'),
  e('sensor-card', 'Sensor Card (If)', 'logic', 'A sensor card listens: if the music is fast, spin; if not, wave.', 'Automatic doors use "if someone is there, open".', 'Find a door or tap that knows you are there.'),
  // light
  e('lamp', 'Lamp', 'light', 'A lamp makes light that travels in straight lines.', 'Lighthouses use powerful lamps to guide ships.', 'Shine a torch across a dark room.'),
  e('mirror', 'Mirror', 'light', 'A mirror bounces light off at the same angle it hits.', 'Periscopes use two mirrors to see over walls.', 'Bounce torch light off a mirror — never into eyes.'),
  e('reflection', 'Reflection', 'light', 'Reflection is light bouncing off a shiny surface.', 'Calm water reflects like a mirror.', 'Look at your reflection in a spoon!'),
  e('lens', 'Lens', 'light', 'A lens bends light. It can make things look bigger or gather light into one bright spot.', 'Glasses, cameras and magnifying glasses all use lenses.', 'Look through a magnifying glass.'),
  e('focus', 'Focus', 'light', 'Focused light is gathered into one sharp point.', 'Cameras focus to make pictures sharp.', 'Move a magnifying glass until the picture goes sharp.'),
  e('prism', 'Prism', 'light', 'A prism splits white light into a rainbow of colours.', 'Raindrops act like prisms to make rainbows.', 'Look for rainbows from a glass of water in the sun.'),
  e('colour', 'Colour', 'light', 'White light is all the colours mixed together.', 'Coloured glass only lets its own colour through.', 'Look through a coloured sweet wrapper.'),
  e('chain-reaction', 'Chain Reaction', 'gears', 'One thing makes the next thing happen, which makes the next thing happen…', 'Domino runs and marble runs are chain reactions.', 'Build a domino line and tip the first one.'),
];

export const pediaById = (id: string): PediaEntry | undefined => PEDIA.find((p) => p.id === id);

/** The three spoken lines of a page, with their voice-file ids. */
export function pediaLines(e: PediaEntry): Array<{ id: string; text: string }> {
  return [
    { id: `pedia.${e.id}.say`, text: e.say },
    { id: `pedia.${e.id}.how`, text: `How it really works: ${e.how}` },
    { id: `pedia.${e.id}.home`, text: `Spot it at home! ${e.home}` },
  ];
}

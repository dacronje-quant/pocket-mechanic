/**
 * Story scenes (GDD §4, §6). Short, warm, visual-first: every beat is staged
 * with characters and sounds, so it works with the sound off and without
 * reading. Kip and Tess speak in beeps (their text is shown as a subtitle only).
 * Line ids are stable: they are the keys of the generated voice files.
 */
import type { StoryDef } from './types';

export const STORIES: StoryDef[] = [
  {
    id: 'prologue',
    bg: 'storm',
    cast: ['nana', 'kip'],
    lines: [
      { id: 'prologue.1', who: 'nana', text: 'Fifty years of fixing, and my hands have started to shake.', mood: 'sad', sfx: 'thunder' },
      { id: 'prologue.2', who: 'nana', text: 'So tonight I am building a helper. A tiny one. Brass body, glass eyes… and a big winding key.', mood: 'happy' },
      { id: 'prologue.3', who: 'nana', text: 'Oh! The lamp flickered — and…', mood: 'surprised', sfx: 'thunder' },
      { id: 'prologue.4', who: 'kip', text: 'Bee-boop?', mood: 'surprised', sfx: 'sparkle' },
      { id: 'prologue.5', who: 'nana', text: 'Ha! You blinked! Hello, little one. I shall call you Kip.', mood: 'laugh' },
      { id: 'prologue.6', who: 'kip', text: 'Bloop-bloop!', mood: 'happy' },
      { id: 'prologue.7', who: 'nana', text: 'And you can do something I never could, Kip. You can go inside.', mood: 'proud' },
    ],
  },
  // ───────────── Repair 1 ─────────────
  {
    id: 'r1-doorbell',
    bg: 'shop',
    cast: ['albert', 'nana', 'kip'],
    object: { id: 'clock' },
    lines: [
      { id: 'r1d.1', who: 'albert', text: 'Odette! My cuckoo clock stopped in the night! I overslept!', mood: 'worried', sfx: 'doorbell' },
      { id: 'r1d.2', who: 'albert', text: "There's no bread in all of Brasswick!", mood: 'worried' },
      { id: 'r1d.3', who: 'nana', text: "Don't fret, Albert. Safety first, Kip: I've opened the back panel, and it isn't plugged into anything.", mood: 'happy' },
      { id: 'r1d.4', who: 'nana', text: 'Well, little one. Want to see what is inside?', mood: 'proud' },
      { id: 'r1d.5', who: 'kip', text: 'Beep beep!', mood: 'happy' },
    ],
  },
  {
    id: 'r1-return',
    bg: 'shop',
    cast: ['albert', 'nana', 'kip'],
    object: { id: 'clock', working: true },
    lines: [
      { id: 'r1r.1', who: 'albert', text: 'Cuckoo! Cuckoo! Oh, listen to it! It sings like new!', mood: 'laugh', sfx: 'cuckoo' },
      { id: 'r1r.2', who: 'albert', text: 'Thank you, Odette. And thank you, little Kip. Here — a whisk-shaped winding key, from a baker to a fixer.', mood: 'happy' },
      { id: 'r1r.3', who: 'nana', text: "Warm bread for everyone tomorrow, then!", mood: 'happy' },
      { id: 'r1r.4', who: 'kip', text: 'Whirr-chime!', mood: 'proud' },
    ],
  },
  // ───────────── Repair 2 ─────────────
  {
    id: 'r2-doorbell',
    bg: 'shop',
    cast: ['rosa', 'nana', 'kip'],
    object: { id: 'musicbox' },
    lines: [
      { id: 'r2d.1', who: 'rosa', text: 'Hello! Is this where the tiny fixer lives?', mood: 'happy', sfx: 'doorbell' },
      { id: 'r2d.2', who: 'rosa', text: "This music box was my abuela's. It played the lullaby she used to sing to me. It hasn't played for a whole year.", mood: 'sad' },
      { id: 'r2d.3', who: 'nana', text: 'Then we will help it remember its song. Kip?', mood: 'happy' },
      { id: 'r2d.4', who: 'kip', text: 'Ting-a-ling!', mood: 'happy' },
    ],
  },
  {
    id: 'r2-return',
    bg: 'shop',
    cast: ['rosa', 'nana', 'kip'],
    object: { id: 'musicbox', working: true },
    lines: [
      { id: 'r2r.1', who: 'rosa', text: "It's Abuela's song! I remember all the words!", mood: 'laugh', sfx: 'lullaby' },
      { id: 'r2r.2', who: 'rosa', text: 'I made you a friendship bracelet, Kip. Now the music box can sing in your footsteps too.', mood: 'happy' },
      { id: 'r2r.3', who: 'nana', text: 'Love has a way of being remembered, doesn\'t it?', mood: 'happy' },
    ],
  },
  // ───────────── Repair 3 ─────────────
  {
    id: 'r3-doorbell',
    bg: 'shop',
    cast: ['theo', 'ada', 'nana', 'kip'],
    object: { id: 'train' },
    lines: [
      { id: 'r3d.1', who: 'ada', text: "Our birthday is TOMORROW, and the party train won't go!", mood: 'worried', sfx: 'doorbell' },
      { id: 'r3d.2', who: 'theo', text: 'It has to deliver the party favours. Choo choo! That is its whole job!', mood: 'worried' },
      { id: 'r3d.3', who: 'nana', text: 'A whole little world in a box! Kip, this one is a big adventure.', mood: 'surprised' },
      { id: 'r3d.4', who: 'kip', text: 'Toot-toot!', mood: 'happy' },
    ],
  },
  {
    id: 'r3-return',
    bg: 'party',
    cast: ['theo', 'ada', 'nana', 'kip'],
    object: { id: 'train', working: true },
    lines: [
      { id: 'r3r.1', who: 'theo', text: 'It goes! Round and round the whole table!', mood: 'laugh', sfx: 'whistle' },
      { id: 'r3r.2', who: 'ada', text: 'A favour for every guest. And a party hat for Kip! I chose it. I am in charge of hats.', mood: 'proud' },
      { id: 'r3r.3', who: 'nana', text: 'Happy birthday, you two!', mood: 'happy', sfx: 'cheer' },
    ],
  },
  {
    id: 'act1-closer',
    bg: 'shopNight',
    cast: ['kip', 'nana'],
    lines: [
      { id: 'a1c.1', who: 'kip', text: 'Bip?', mood: 'surprised' },
      { id: 'a1c.2', who: 'nana', text: 'What have you found, Kip? A feather… glossy black, with a blue shimmer.', mood: 'surprised' },
      { id: 'a1c.3', who: 'nana', text: 'Parts missing in the clock, in the music box, in the train. Not broken — missing. Someone has been taking the shiniest pieces…', mood: 'worried' },
    ],
  },
  // ───────────── Repair 4 ─────────────
  {
    id: 'r4-doorbell',
    bg: 'shop',
    cast: ['marigold', 'nana', 'kip'],
    object: { id: 'radio' },
    lines: [
      { id: 'r4d.1', who: 'marigold', text: 'Odette. There is a storm coming in from the sea, and my radio is dead as a doornail.', mood: 'worried', sfx: 'doorbell' },
      { id: 'r4d.2', who: 'marigold', text: 'The fishing boats need my weather report to find their way home.', mood: 'worried' },
      { id: 'r4d.3', who: 'nana', text: "Unplugged and opened, Captain — that's the rule. Real electricity from the wall is only for grown-ups. Now, Kip: in you go!", mood: 'proud' },
      { id: 'r4d.4', who: 'kip', text: 'Bzzt-beep!', mood: 'happy' },
    ],
  },
  {
    id: 'r4-return',
    bg: 'harbor',
    cast: ['marigold', 'fisher', 'nana', 'kip'],
    object: { id: 'radio', working: true },
    lines: [
      { id: 'r4r.1', who: 'marigold', text: 'This is Brasswick Harbour. Storm to the north — all boats turn for home. Over!', mood: 'grand', sfx: 'static' },
      { id: 'r4r.2', who: 'fisher', text: 'Every boat safe in the harbour! Thank you, little fixer!', mood: 'laugh', sfx: 'cheer' },
      { id: 'r4r.3', who: 'marigold', text: 'Kip, you have earned this. A brass plate: First Mate.', mood: 'proud' },
    ],
  },
  {
    id: 'magnus-radio',
    bg: 'shopNight',
    cast: ['magnus', 'kip'],
    lines: [
      { id: 'mr.1', who: 'magnus', text: 'Caught? ME? Caught?! Unthinkable!', mood: 'surprised', sfx: 'flap' },
      { id: 'mr.2', who: 'magnus', text: 'I am Magnus the Magnificent, collector of the exquisite! This tube simply belonged with someone who appreciates shine.', mood: 'grand' },
      { id: 'mr.3', who: 'kip', text: 'Beep! Beep-beep!', mood: 'worried' },
      { id: 'mr.4', who: 'magnus', text: 'Farewell, small brass person! Ta-taaa!', mood: 'grand', sfx: 'flap' },
    ],
  },
  // ───────────── Repair 5 ─────────────
  {
    id: 'r5-doorbell',
    bg: 'shop',
    cast: ['pepperwhistle', 'nana', 'kip'],
    object: { id: 'tea' },
    lines: [
      { id: 'r5d.1', who: 'pepperwhistle', text: 'Disaster, darlings! My Grand Tea Machine is spluttering, hissing and serving COLD TEA!', mood: 'worried', sfx: 'doorbell' },
      { id: 'r5d.2', who: 'pepperwhistle', text: 'The whole town takes tea at four. Whatever shall we do?', mood: 'grand' },
      { id: 'r5d.3', who: 'nana', text: "Kip will sort it out. Mind the pipes, Kip — they're cool now, but steam is strong stuff.", mood: 'happy' },
    ],
  },
  {
    id: 'r5-return',
    bg: 'cafe',
    cast: ['pepperwhistle', 'nana', 'kip'],
    object: { id: 'tea', working: true },
    lines: [
      { id: 'r5r.1', who: 'pepperwhistle', text: 'Listen to her whistle! Every cup filled, sugared and stirred!', mood: 'laugh', sfx: 'steam' },
      { id: 'r5r.2', who: 'pepperwhistle', text: 'For you, little hero: the tiniest, most ridiculous feathered hat in all the land.', mood: 'grand' },
      { id: 'r5r.3', who: 'kip', text: 'Pip-pip-hooray!', mood: 'laugh' },
    ],
  },
  {
    id: 'tess-built',
    bg: 'shopNight',
    cast: ['nana', 'kip', 'tess'],
    lines: [
      { id: 'tb.1', who: 'nana', text: 'You love company so much, Kip. So I made you someone.', mood: 'happy' },
      { id: 'tb.2', who: 'tess', text: 'Bing?', mood: 'surprised', sfx: 'sparkle' },
      { id: 'tb.3', who: 'tess', text: 'Ba-bing-bong!', mood: 'laugh' },
      { id: 'tb.4', who: 'kip', text: 'Bloop-bloop-bloop!', mood: 'laugh' },
      { id: 'tb.5', who: 'nana', text: 'Her name is Tess. Now you will never be lonely. And two hands are better than one!', mood: 'proud' },
    ],
  },
  // ───────────── Repair 6 ─────────────
  {
    id: 'r6-doorbell',
    bg: 'shop',
    cast: ['pockets', 'nana', 'kip'],
    object: { id: 'bertie' },
    lines: [
      { id: 'r6d.1', who: 'pockets', text: 'Roll up, roll up! Er — that is to say, help! Big Bertie has forgotten how to dance!', mood: 'worried', sfx: 'doorbell' },
      { id: 'r6d.2', who: 'pockets', text: 'His punch-card brain is all of a jumble, and bits of his logic have simply vanished.', mood: 'sad' },
      { id: 'r6d.3', who: 'nana', text: 'Vanished, you say? Hmm. Kip, keep your lenses peeled.', mood: 'worried' },
    ],
  },
  {
    id: 'r6-return',
    bg: 'fair',
    cast: ['pockets', 'bertie', 'nana', 'kip'],
    object: { id: 'bertie', working: true },
    lines: [
      { id: 'r6r.1', who: 'bertie', text: 'BER-TIE! BER-TIE DANCES!', mood: 'laugh', sfx: 'dance' },
      { id: 'r6r.2', who: 'pockets', text: 'The fair is open! And from pocket number forty-two… a top hat, exactly Kip-sized!', mood: 'grand', sfx: 'cheer' },
    ],
  },
  {
    id: 'bell-silent',
    bg: 'street',
    cast: ['nana', 'kip', 'albert', 'rosa'],
    lines: [
      { id: 'bs.1', who: 'albert', text: "It's noon. Any second now…", mood: 'happy' },
      { id: 'bs.2', who: 'rosa', text: '…the bell?', mood: 'worried' },
      { id: 'bs.3', who: 'nana', text: 'The Clock Tower bell. It has rung every noon for a hundred years. And today… nothing.', mood: 'sad' },
      { id: 'bs.4', who: 'nana', text: 'The Tick-Tock Festival is in one week. Oh, Kip. What has happened to my tower?', mood: 'worried' },
    ],
  },
  // ───────────── Repair 7 ─────────────
  {
    id: 'r7-doorbell',
    bg: 'shop',
    cast: ['juniper', 'nana', 'kip'],
    object: { id: 'orrery' },
    lines: [
      { id: 'r7d.1', who: 'juniper', text: 'Good morning, Odette. I promised my class a night sky lesson, and the school orrery is jammed.', mood: 'worried', sfx: 'doorbell' },
      { id: 'r7d.2', who: 'juniper', text: 'It is very old. There was an old map folded inside the lid, too. I brought it along.', mood: 'happy' },
      { id: 'r7d.3', who: 'nana', text: 'Planets, lenses and a little lamp-sun. Kip, bring the light back!', mood: 'proud' },
    ],
  },
  {
    id: 'r7-return',
    bg: 'classroom',
    cast: ['juniper', 'nana', 'kip'],
    object: { id: 'orrery', working: true },
    lines: [
      { id: 'r7r.1', who: 'juniper', text: 'Look up, everyone. Those are the stars, right over our heads.', mood: 'happy', sfx: 'stars' },
      { id: 'r7r.2', who: 'juniper', text: 'And here is the map I found. It shows the inside of the Clock Tower. It is signed… "Odette".', mood: 'surprised' },
      { id: 'r7r.3', who: 'nana', text: '…I drew this when I was your age, Kip. I built that tower as an apprentice. I always wished I could fix it from the inside.', mood: 'sad' },
      { id: 'r7r.4', who: 'kip', text: 'Beep. Beep-beep!', mood: 'proud' },
      { id: 'r7r.5', who: 'nana', text: 'You are right. Now I can. With you.', mood: 'happy' },
    ],
  },
  // ───────────── Repair 8 ─────────────
  {
    id: 'r8-doorbell',
    bg: 'tower',
    cast: ['nana', 'kip', 'tess'],
    object: { id: 'tower' },
    lines: [
      { id: 'r8d.1', who: 'nana', text: 'Here she is. The Great Brasswick Clock Tower. And way up top… a nest. A magpie nest.', mood: 'surprised', sfx: 'flap' },
      { id: 'r8d.2', who: 'nana', text: 'Everyone you helped is here to help you back, Kip. The train, the tea machine, Bertie, Coo — all of them.', mood: 'proud' },
      { id: 'r8d.3', who: 'tess', text: 'Ba-bing!', mood: 'happy' },
      { id: 'r8d.4', who: 'nana', text: 'Floor by floor, all the way to the bell. Off you go, my two fixers.', mood: 'happy' },
    ],
  },
  {
    id: 'magnus-nest',
    bg: 'nest',
    cast: ['magnus', 'kip', 'tess'],
    lines: [
      { id: 'mn.1', who: 'magnus', text: 'Oh. It is you. Come to laugh at the magnificent Magnus, stuck in his own magnificent nest?', mood: 'sad' },
      { id: 'mn.2', who: 'magnus', text: "It's too heavy to move. And… nobody visits a plain old magpie. So I thought, if it was shiny enough, maybe someone would.", mood: 'sad' },
      { id: 'mn.3', who: 'kip', text: 'Beep… bloop?', mood: 'happy' },
      { id: 'mn.4', who: 'magnus', text: 'A new nest? For ME? One that spins and sparkles and… plays music? Truly?', mood: 'surprised' },
    ],
  },
  {
    id: 'epilogue',
    bg: 'festival',
    cast: ['nana', 'kip', 'tess', 'magnus', 'albert', 'rosa', 'marigold', 'pepperwhistle'],
    object: { id: 'tower', working: true },
    lines: [
      { id: 'ep.1', who: 'magnus', text: 'Every gear, every spring, every bulb. Returned. With interest. And with my sincerest… sorry.', mood: 'happy', sfx: 'flap' },
      { id: 'ep.2', who: 'nana', text: 'It is noon.', mood: 'happy', sfx: 'bong' },
      { id: 'ep.3', who: 'albert', text: 'The Tick-Tock Festival is open!', mood: 'laugh', sfx: 'cheer' },
      { id: 'ep.4', who: 'nana', text: 'Fifty years ago I built that clock with these two hands. Today, you fixed it with yours.', mood: 'proud' },
      { id: 'ep.5', who: 'nana', text: 'Everything broken can be loved back to working.', mood: 'happy' },
      { id: 'ep.6', who: 'magnus', text: 'Oh, and I found this key behind the bell. It says "Attic". Shiny, isn\'t it? I am keeping my beak off it.', mood: 'grand' },
    ],
  },
  // ───────────── post-game ─────────────
  {
    id: 'attic-open',
    bg: 'attic',
    cast: ['nana', 'kip', 'tess'],
    lines: [
      { id: 'ao.1', who: 'nana', text: 'My attic! Fifty years of machines I never quite managed to fix.', mood: 'surprised' },
      { id: 'ao.2', who: 'nana', text: 'Each one hides a little symbol. Find them all, and maybe the Mystery Box will finally open.', mood: 'happy' },
    ],
  },
  {
    id: 'box-open',
    bg: 'attic',
    cast: ['odette', 'kip'],
    lines: [
      { id: 'bo.1', who: 'odette', text: 'Hello, whoever opens this box. I am Odette, and I am eleven, and I am going to be a clockmaker.', mood: 'happy', sfx: 'sparkle' },
      { id: 'bo.2', who: 'odette', text: "If you got this far, you must love fixing things as much as I do. So here is my best key. Look after it.", mood: 'proud' },
      { id: 'bo.3', who: 'kip', text: 'Ting-ting-ting!', mood: 'laugh' },
    ],
  },
  {
    id: 'closing-time',
    bg: 'shopNight',
    cast: ['nana', 'kip'],
    lines: [
      { id: 'ct.1', who: 'nana', text: "That's closing time at the Tick & Tinker. Lamps down, sign turned.", mood: 'sleepy' },
      { id: 'ct.2', who: 'kip', text: 'Tick… tock… zzz…', mood: 'sleepy' },
      { id: 'ct.3', who: 'nana', text: 'Sleep tight, little fixer. Everything you did today is saved.', mood: 'happy' },
    ],
  },
];

export const storyById = (id: string): StoryDef | undefined => STORIES.find((s) => s.id === id);

/** One-off lines Nana (and friends) say around the shop and in rooms. */
export const LINES: Record<string, { who: StoryDef['cast'][number]; text: string }> = {
  'shop.hello': { who: 'nana', text: 'Welcome back to the Tick and Tinker, Kip!' },
  'shop.job': { who: 'nana', text: 'Someone is at the door with something broken.' },
  'shop.locked': { who: 'nana', text: 'Not yet, little one. We will open that up soon.' },
  'shop.quick': { who: 'nana', text: 'A basket of quick little fixes. Pick one!' },
  'shop.shelf': { who: 'nana', text: 'Everything you have fixed. Hop back inside any time.' },
  'shop.pedia': { who: 'nana', text: 'The parts drawers. Every part you touch gets a page.' },
  'shop.nook': { who: 'nana', text: "Kip's own cosy nook." },
  'shop.paint': { who: 'nana', text: 'Paint and polish! Let us make you shine.' },
  'shop.window': { who: 'nana', text: 'Look at Brasswick! See everything you fixed, working again.' },
  'shop.bench': { who: 'nana', text: 'Your own music box! Make a tune, then play it for everyone.' },
  'shop.attic': { who: 'nana', text: 'The attic! Mind the dust.' },
  'shop.pudding': { who: 'pudding', text: 'Purrrrr…' },
  'shop.whisker': { who: 'whisker', text: 'Squeak! Crumbs?' },
  'shop.winddown': { who: 'nana', text: "It's nearly bedtime. Just quick little fixes now." },
  'room.fixed': { who: 'nana', text: 'You fixed it! Wonderful!' },
  'room.wrong': { who: 'nana', text: 'Hmm, not that one. Try another!' },
  'room.funny': { who: 'nana', text: 'Ha! That works — just a little bit funny!' },
  'room.gold': { who: 'nana', text: 'A golden gear!' },
  'room.treasure': { who: 'nana', text: 'Oh! Something precious. Let us give it back.' },
  'room.mark': { who: 'nana', text: 'A clue! Someone shiny-loving was here.' },
  'room.jam': { who: 'nana', text: 'Oh dear, a jam! Those gears are all pushing each other.' },
  'shop.done': { who: 'nana', text: 'Every big repair in Brasswick is done! Quick fixes, your music box and the attic are always waiting.' },
  'musicbox.help': { who: 'nana', text: 'Make your own music! Tap the keys to put notes on the next beat. Tap the brass holes to add or remove notes. Press Play to hear your tune.' },
  'musicbox.empty': { who: 'nana', text: 'Tap a key to add your first note. Then you can play or save your tune!' },
  'musicbox.saved': { who: 'nana', text: 'Your tune is saved! Find it in My Tunes, or play it on the little music box in your nook.' },
  'musicbox.keep': { who: 'nana', text: 'Make a tune and press the tick to save it here. Tap a saved tune to change it or play it again.' },
  'shop.closed': { who: 'nana', text: 'The shop is closed for today. See you tomorrow, little fixer!' },
  'shop.tess': { who: 'nana', text: "Tess's corner! Let's give your sister a new look." },
  'title.who': { who: 'nana', text: "Who's come to help in the shop today?" },
  'title.new': { who: 'nana', text: 'A new fixer! Pick your colour.' },
  'title.letters': { who: 'nana', text: 'Stamp your letters, if you like.' },
  'title.style': { who: 'nana', text: 'How do you like to fix things? Pick a tool!' },
  'quick.locked': { who: 'nana', text: 'That one comes in later, after another big repair.' },
  'shelf.pick': { who: 'nana', text: 'Pick a room. Play inside it, or try a Tune-Up!' },
  'shelf.tuneup': { who: 'nana', text: 'A Tune-Up! Fewer moves, a quick time, and no peeking or hints win the best medals.' },
  'shelf.empty': { who: 'nana', text: 'This spot is waiting for something you fix.' },
  'town.closed': { who: 'nana', text: "That one still needs fixing. Let's help soon!" },
  'pedia.locked': { who: 'nana', text: 'Touch more parts inside the machines to fill this page.' },
  'pedia.attic': { who: 'nana', text: 'Real history! These machines were real inventions, long ago.' },
  'paint.polish': { who: 'nana', text: 'Rub-a-dub! Polish Kip until every bit shines.' },
  'paint.buy': { who: 'nana', text: 'That one costs shiny bits. Tap it again to swap them for it.' },
  'paint.poor': { who: 'nana', text: 'Not enough shiny bits yet. Fix more things to find some!' },
  'paint.locked': { who: 'nana', text: 'Someone special will give you that one. Keep fixing!' },
  'paint.saved': { who: 'nana', text: 'Look saved! Tap it any time to wear it again.' },
  'nook.bed': { who: 'nana', text: 'Sweet dreams, Kip.' },
  'nook.grown': { who: 'nana', text: "Look! Kip's nook has grown!" },
  'nook.book': { who: 'nana', text: "Kip's Job Book. A stamp for every special moment." },
  'nook.music': { who: 'nana', text: 'The mini music box! Pick a song.' },
  'bench.run': { who: 'nana', text: 'Give it a whirl!' },
  'bench.card': { who: 'nana', text: 'A Contraption Card! Can you build it?' },
  'bench.cardDone': { who: 'nana', text: 'It works! What a clever contraption.' },
  'bench.code': { who: 'nana', text: 'This code is your machine. Someone else can type it in to build it too!' },
  'bench.badcode': { who: 'nana', text: "Hmm, that code doesn't make a machine. Let's check the letters." },
  'bench.nest': { who: 'magnus', text: 'A nest studio! For ME? Make it sparkle, little fixer!' },
  'attic.box': { who: 'nana', text: 'The Mystery Box. Turn the dials to match the pictures on the lid.' },
  'attic.boxShut': { who: 'nana', text: 'Not quite. Each picture is an attic machine: fix it to find its symbol.' },
  'attic.done': { who: 'nana', text: "All three rooms fixed! Here is this machine's secret symbol." },
  'reveal.go': { who: 'nana', text: 'Time for the Test Run! Three, two, one…' },
  'rewards.thanks': { who: 'nana', text: 'A thank-you gift, just for you!' },
  'festival.hello': { who: 'nana', text: 'The Tick-Tock Festival! All of Brasswick is ticking again, thanks to you.' },
  'radio.harbour': { who: 'marigold', text: '…this is Brasswick Harbour, can you hear me…?' },
  'bench.magnus.1': { who: 'magnus', text: 'Insufficiently sparkly!' },
  'bench.magnus.2': { who: 'magnus', text: 'Magnificent. Almost as magnificent as me.' },
  'bench.magnus.3': { who: 'magnus', text: 'It spins! It shines! I am speechless. Nearly.' },
};

/** Golden-gear gating message, never blocking: one more room to go. */
export const SPOKEN_PLAY_STYLE: Record<string, string> = {
  tinker: 'Click, clunk, and make it go!',
  fixer: 'Find the problem and fix it!',
  engineer: 'Gears, gates and genius!',
};

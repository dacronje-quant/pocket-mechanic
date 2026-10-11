import Phaser from 'phaser';
import { pm } from './debug';
import { keepScaleFresh } from './platform';
import { BootScene } from './scenes/BootScene';
import { ALL_SCENES } from './scenes/index';
import { installAudioUnlock } from './audio/engine';

installAudioUnlock();

window.addEventListener('error', (e) => pm.errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => pm.errors.push(String(e.reason)));

/*
 * Safety net: Phaser schedules the next animation frame only after the current
 * one finishes, so a single exception anywhere in a frame (a timer, a tween
 * callback, a scene update) stopped the game loop for good — the screen froze
 * while taps were still being counted underneath. Catch, report and carry on.
 */
const step = Phaser.Game.prototype.step;
Phaser.Game.prototype.step = function (this: Phaser.Game, time: number, delta: number) {
  try {
    step.call(this, time, delta);
  } catch (err) {
    pm.errors.push(String((err as Error)?.message ?? err));
    console.error(err);
  }
};

// `?renderer=canvas` forces the Canvas renderer: much faster under headless
// software GL, so automated playthroughs finish in reasonable time.
const forceCanvas = new URLSearchParams(location.search).get('renderer') === 'canvas';

const game = new Phaser.Game({
  type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#32291f',
  width: 1280,
  height: 720,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: document.documentElement,
  },
  render: { antialias: true, roundPixels: false },
  input: { activePointers: 3 }, // Kip, Tess / Outside Hands, and one spare finger
  audio: { noAudio: true }, // the recorded players share their own AudioContext
  scene: [BootScene, ...ALL_SCENES],
});

pm.game = game;
keepScaleFresh(game);

// Phones held upright: the "turn me sideways" card can be tapped away, so a
// phone with rotation lock on is never stuck behind it.
// Its touches stop here: Phaser also listens on `window`, so a tap on the card
// used to go through to whatever game button lay underneath it.
const rotate = document.getElementById('rotate');
if (rotate) {
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'click']) {
    rotate.addEventListener(ev, (e) => e.stopPropagation());
  }
  // hide on `click`, the last event of a tap: hiding on pointerup let the browser's
  // follow-up mouse events land on the canvas underneath
  rotate.addEventListener('click', () => document.body.classList.add('rotate-ok'));
}

// Offline support / "Install app" on Android. Only in the built site, so the
// dev server never serves stale cached files.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}

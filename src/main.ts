import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { GearGalleryScene } from './scenes/GearGalleryScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1a120c',
  width: 1280,
  height: 720,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: document.documentElement,
  },
  render: { antialias: true, roundPixels: false },
  input: { activePointers: 3 }, // room for two-player "Outside Hands" later
  scene: [MenuScene, GearGalleryScene],
});

// Handy in the browser console while prototyping: window.pm.scene.getScene('gear-gallery')
(window as unknown as { pm: Phaser.Game }).pm = game;

// Offline support / "Install app" on Android. Only in the built site, so the
// dev server never serves stale cached files.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}

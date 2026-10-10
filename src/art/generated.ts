/**
 * Optional generated illustrations (painted story backdrops, the title
 * picture, "postcards" from Brasswick, Attic history plates). They are made
 * offline by scripts/generate-assets.mjs with Gemini's image model and listed
 * in public/art/manifest.json. Every one of them is optional: scenes draw
 * their code-made art first and fade the picture in on top if it loads.
 */
import Phaser from 'phaser';

let images: Record<string, string> = {};
let loaded: Promise<void> | null = null;

export function loadArtManifest(): Promise<void> {
  loaded ??= (async () => {
    try {
      const res = await fetch('./art/manifest.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const m = (await res.json()) as { images?: Record<string, string> };
      images = m.images ?? {};
    } catch {
      /* no generated art: the code-drawn art is used */
    }
  })();
  return loaded;
}

export const hasArt = (id: string): boolean => !!images[id];

const textureKey = (id: string) => `art:${id}`;

/**
 * Load a generated picture (once) and hand back its texture key, or null if
 * the build has none. Never blocks a scene: callers draw their own art first.
 */
export function withArt(scene: Phaser.Scene, id: string, onReady: (key: string) => void): void {
  void loadArtManifest().then(() => {
    const file = images[id];
    if (!file || !scene.sys.isActive()) return;
    const key = textureKey(id);
    if (scene.textures.exists(key)) {
      onReady(key);
      return;
    }
    scene.load.image(key, `./art/${file}`);
    scene.load.once(`filecomplete-image-${key}`, () => {
      if (scene.sys.isActive()) onReady(key);
    });
    scene.load.start();
  });
}

/** Cover the given box with an image, cropped to fit (like CSS object-fit: cover). */
export function coverImage(scene: Phaser.Scene, key: string, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image {
  const img = scene.add.image(x + w / 2, y + h / 2, key);
  const s = Math.max(w / img.width, h / img.height);
  img.setScale(s);
  const cw = w / s;
  const ch = h / s;
  img.setCrop((img.width - cw) / 2, (img.height - ch) / 2, cw, ch);
  return img;
}

/** Fade a full-screen painted backdrop in over the code-drawn one. */
export function paintedBackdrop(scene: Phaser.Scene, id: string, depth: number, alpha = 1): void {
  withArt(scene, id, (key) => {
    const img = coverImage(scene, key, 0, 0, scene.scale.width, scene.scale.height).setDepth(depth).setAlpha(0);
    scene.tweens.add({ targets: img, alpha, duration: 500 });
  });
}

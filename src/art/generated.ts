/** Painted Copper & Moss illustrations, with procedural art as an offline fallback. */
import Phaser from 'phaser';
import { installSeparation } from './separation';

let images: Record<string, string> = {};
let loaded: Promise<void> | null = null;
const generations = new WeakMap<Phaser.Scene, number>();

export function loadArtManifest(): Promise<void> {
  loaded ??= (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch('./art/manifest.json', { cache: 'no-cache', signal: controller.signal });
      if (res.ok) images = ((await res.json()) as { images?: Record<string, string> }).images ?? {};
    } catch {
      // The complete code-drawn game remains available when images cannot be fetched.
    } finally {
      window.clearTimeout(timeout);
    }
  })();
  return loaded;
}

export const artTextureKey = (id: string): string => `art:${id}`;

function generation(scene: Phaser.Scene): number {
  const value = generations.get(scene) ?? 0;
  if (!generations.has(scene)) generations.set(scene, value);
  return value;
}

/** Bind one activation. Old image callbacks must not populate a restarted scene. */
export function beginArtScene(scene: Phaser.Scene): void {
  installSeparation(scene);
  generations.set(scene, generation(scene) + 1);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    generations.set(scene, generation(scene) + 1);
  });
}

/** Load an illustration without delaying input; stale callbacks are removed on shutdown. */
export function withArt(scene: Phaser.Scene, id: string, onReady: (key: string) => void): void {
  const expected = generation(scene);
  const live = () => scene.sys.isActive() && generation(scene) === expected;
  void loadArtManifest().then(() => {
    const file = images[id];
    if (!file || !live()) return;
    const key = artTextureKey(id);
    if (scene.textures.exists(key)) {
      onReady(key);
      return;
    }
    const event = `filecomplete-image-${key}`;
    const cleanup = () => {
      scene.load.off(event, ready);
      scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, failed);
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    };
    const ready = () => {
      cleanup();
      if (live()) onReady(key);
    };
    const failed = (failedFile: Phaser.Loader.File) => {
      if (failedFile.key === key) cleanup();
    };
    scene.load.once(event, ready);
    scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, failed);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    // Phaser's loader deduplicates keys that are already queued or inflight.
    scene.load.image(key, `./art/${file}`);
    if (!scene.load.isLoading()) scene.load.start();
  });
}

/** Briefly warm the opening art cache; slower art can arrive after the title appears. */
export function preloadCoreArt(scene: Phaser.Scene, budgetMs = 2500): Promise<void> {
  const expected = generation(scene);
  const live = () => scene.sys.isActive() && generation(scene) === expected;
  return new Promise<void>((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      scene.load.off(Phaser.Loader.Events.COMPLETE, finish);
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, finish);
      resolve();
    };
    // This bounds the complete wait, including a slow manifest request.
    const timeout = window.setTimeout(finish, Math.max(0, budgetMs));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, finish);
    void loadArtManifest().then(() => {
      if (finished || !live()) return finish();
      const ids = ['title', 'title-logo', 'copper-kip-shell', 'portrait-nana', 'kip-modular', 'tess-modular', 'accessory-keys', 'accessory-toppers', 'accessory-feet', 'portrait-cast', 'portrait-creatures', 'portrait-clementine', 'busy-gadgets', 'puzzle-props', 'item-atlas', 'item-musicbox', 'item-atlas-extra', 'ui-surfaces'];
      const pending = ids.filter((id) => images[id] && !scene.textures.exists(artTextureKey(id)));
      if (!pending.length) return finish();
      scene.load.once(Phaser.Loader.Events.COMPLETE, finish);
      for (const id of pending) scene.load.image(artTextureKey(id), `./art/${images[id]}`);
      if (!scene.load.isLoading()) scene.load.start();
    });
  });
}

/** Cover a rectangle, preserving the illustration's proportions. */
export function coverImage(scene: Phaser.Scene, key: string, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image {
  const img = scene.add.image(x + w / 2, y + h / 2, key);
  const scale = Math.max(w / img.width, h / img.height);
  img.setScale(scale);
  const cw = w / scale;
  const ch = h / scale;
  img.setCrop((img.width - cw) / 2, (img.height - ch) / 2, cw, ch);
  return img;
}

/** Fixed-depth backdrop, always below characters and controls. */
export function paintedBackdrop(scene: Phaser.Scene, id: string, depth: number, alpha = 1): void {
  withArt(scene, id, (key) => {
    coverImage(scene, key, 0, 0, scene.scale.width, scene.scale.height)
      .setDepth(depth).setAlpha(alpha).setName(`painted:${id}`);
  });
}

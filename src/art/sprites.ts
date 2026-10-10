import Phaser from 'phaser';
import { artTextureKey } from './generated';

/** Split authored atlases at runtime; the original art files remain untouched. */
export function atlasFrame(scene: Phaser.Scene, key: string, index: number, cols: number, rows: number, trim = false): string {
  const texture = scene.textures.get(key);
  const name = `cell:${cols}:${rows}:${index}:${trim}`;
  if (texture.has(name)) return name;
  const source = texture.getSourceImage() as HTMLImageElement;
  const cellW = source.width / cols, cellH = source.height / rows;
  const row = Math.floor(index / cols);
  const rowsAt = key === 'art:puzzle-props' && cols === 4 && rows === 4 ? [0, 280, 540, 798, 1086].map(n => Math.round(n * source.height / 1086)) : undefined;
  const x = Math.floor(index % cols * cellW), y = rowsAt ? rowsAt[row] : Math.floor(row * cellH);
  let w = Math.floor(cellW), h = rowsAt ? rowsAt[row + 1] - y : Math.floor(cellH), left = 0, top = 0;
  if (trim) {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    // Select the main silhouette; atlas neighbours can leave tiny edge fragments.
    const seen = new Uint8Array(w * h), queue = new Int32Array(w * h);
    let right = 0, bottom = 0, biggest = 0; left = w; top = h;
    for (let p = 0; p < w * h; p++) {
      if (seen[p] || data[p * 4 + 3] < 64) continue;
      let head = 0, tail = 1, minX = w, minY = h, maxX = 0, maxY = 0;
      queue[0] = p; seen[p] = 1;
      while (head < tail) {
        const q = queue[head++], xx = q % w, yy = Math.floor(q / w);
        minX = Math.min(minX, xx); minY = Math.min(minY, yy); maxX = Math.max(maxX, xx); maxY = Math.max(maxY, yy);
        for (const n of [xx > 0 ? q - 1 : -1, xx < w - 1 ? q + 1 : -1, yy > 0 ? q - w : -1, yy < h - 1 ? q + w : -1]) {
          if (n < 0 || seen[n] || data[n * 4 + 3] < 64) continue;
          seen[n] = 1; queue[tail++] = n;
        }
      }
      if (tail > biggest) { biggest = tail; left = minX; top = minY; right = maxX; bottom = maxY; }
    }
    if (right > left && bottom > top) { w = right - left + 1; h = bottom - top + 1; } else { left = 0; top = 0; }
  }
  texture.add(name, 0, x + left, y + top, w, h);
  return name;
}

/** A painted illustration follows a Graphics owner's transform, visibility and lifecycle. */
export function followGraphic(g: Phaser.GameObjects.Graphics, image: Phaser.GameObjects.Image, x: number, y: number, w: number, h: number): void {
  const scene = g.scene;
  // The image takes the graphic's place in the draw order: directly above it, in the same container
  // (or the scene's list at the same depth). Anything added after the graphic, like a picture or
  // text on a painted card, stays on top of it.
  // Callers often move the graphic into a container after creating it, so this re-homes the image
  // whenever the graphic moves.
  const place = () => {
    const parent = g.parentContainer;
    if (parent) {
      if (image.parentContainer !== parent) {
        image.parentContainer?.remove(image);
        parent.addAt(image, parent.getIndex(g) + 1);
      } else if (parent.getIndex(image) !== parent.getIndex(g) + 1) parent.moveAbove<Phaser.GameObjects.GameObject>(image, g);
    } else if (!image.parentContainer) {
      if (image.depth !== g.depth) image.setDepth(g.depth);
      const list = scene.children;
      if (list.getIndex(image) !== list.getIndex(g) + 1) list.moveAbove(image as Phaser.GameObjects.GameObject, g);
    }
  };
  const update = () => {
    if (!g.scene || !image.scene) return;
    place();
    const at = g.getLocalTransformMatrix().transformPoint(x, y);
    image.setPosition(at.x, at.y).setScale(w / image.width * g.scaleX, h / image.height * g.scaleY)
      .setRotation(g.rotation).setAlpha(g.alpha).setVisible(g.visible);
  };
  const cleanup = () => { scene.events.off(Phaser.Scenes.Events.POST_UPDATE, update); if (image.scene) image.destroy(); };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, update); g.once(Phaser.GameObjects.Events.DESTROY, cleanup);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup); update();
}

const OBJECTS = ['clock','musicbox','train','radio','tea','bertie','orrery','tower','door','mouse','doorbell','bikebell','timer','pepper','jack','piano'];
const EXTRA = ['cat','car','boat','whistle','flashlight','desklamp','vane','sprinkler','metronome','coinbank','gumball','robot','top','nightlight','kaleidoscope','bird'];
export function paintedObject(g: Phaser.GameObjects.Graphics, id: string, x: number, y: number, scale: number): boolean {
  let index = OBJECTS.indexOf(id), atlas = 'item-atlas';
  if (index < 0) { index = EXTRA.indexOf(id); atlas = 'item-atlas-extra'; }
  if (id === 'musicbox' && g.scene?.textures.exists(artTextureKey('item-musicbox'))) atlas = 'item-musicbox';
  const key = artTextureKey(atlas);
  if (index < 0 || !g.scene || !g.displayList || !g.scene.textures.exists(key)) return false;
  const image = g.scene.add.image(0, 0, key, atlasFrame(g.scene, key, index, 4, 4, true)).setName(`item:${id}`);
  const s = 108 * scale / Math.max(image.width, image.height);
  followGraphic(g, image, x, y, image.width * s, image.height * s);
  return true;
}

/** Gameplay finishes recolour only warm case metal, preserving glass, teal patches and lighting. */
export function kipFinishTexture(scene: Phaser.Scene, key: string, finish: string, color: number, originalFinish = 'finish-brass'): string {
  if (finish === originalFinish) return key;
  const name = `${key}:${finish}`; if (scene.textures.exists(name)) return name;
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
  const ctx = canvas.getContext('2d')!; ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height), d = pixels.data;
  const target = Phaser.Display.Color.IntegerToRGB(color);
  const cw = canvas.width / 4, ch = canvas.height / 2;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const nx = (x % cw) / cw, ny = (y % ch) / ch;
    if (((nx - 0.57) / 0.29) ** 2 + ((ny - 0.48) / 0.26) ** 2 > 1) continue;
    const p = (y * canvas.width + x) * 4, r = d[p], g = d[p+1], b = d[p+2];
    if (d[p+3] < 20 || r < g * 1.07 || g < b * 1.12) continue;
    const tone = finish === 'finish-candy' && Math.floor((nx + ny * .7) * 12) % 2 === 0 ? { r: 244, g: 235, b: 213 } : target;
    const light = (r * 0.24 + g * 0.62 + b * 0.14) / 160;
    const shine = Math.max(0, light - 1.1) * 120;
    d[p] = Math.min(255, tone.r * light + shine); d[p+1] = Math.min(255, tone.g * light + shine); d[p+2] = Math.min(255, tone.b * light + shine);
  }
  ctx.putImageData(pixels, 0, 0); scene.textures.addCanvas(name, canvas); return name;
}

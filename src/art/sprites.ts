import Phaser from 'phaser';
import { artTextureKey } from './generated';

/**
 * Character sheets and their grids. Their figures are painted close together and often overflow
 * their cell (feet hang into the row below, the cat lies across three cells), so they are cut out
 * as whole figures instead of cell rectangles.
 */
const FIGURE_SHEETS: Record<string, [number, number]> = {
  'art:portrait-cast': [4, 4],
  'art:portrait-clementine': [4, 3],
  'art:portrait-creatures': [4, 3],
};

/**
 * Where a figure that is much bigger than its cell lives, as a box on a 1448×1086 sheet (scaled to
 * the real size). Pudding the cat lies across three cells and touches the mouse and bird beside it.
 */
const OVERSIZE: Record<string, Record<number, [number, number, number, number]>> = {
  'art:portrait-clementine': { 10: [684, 772, 494, 310] },
  'art:portrait-creatures': { 10: [684, 772, 494, 310] },
};

/**
 * Cut the character sheets ahead of time, one sheet at a time with a pause between, so the
 * one-off cut (about a tenth of a second per sheet) happens on the title screen rather than as a
 * hitch the first time a character appears in a room. Sheets that haven't loaded are skipped;
 * they are cut on first use as before.
 */
export function warmFigures(game: Phaser.Game): void {
  const keys = Object.keys(FIGURE_SHEETS);
  const next = (i: number) => {
    if (i >= keys.length) return;
    const key = keys[i];
    if (game.textures.exists(key)) cutFigures(game.textures.get(key), ...FIGURE_SHEETS[key]);
    window.setTimeout(() => next(i + 1), 250);
  };
  window.setTimeout(() => next(0), 400);
}

/** Split authored atlases at runtime; the original art files remain untouched. */
export function atlasFrame(scene: Phaser.Scene, key: string, index: number, cols: number, rows: number, trim = false): string {
  const texture = scene.textures.get(key);
  const name = `cell:${cols}:${rows}:${index}:${trim}`;
  if (texture.has(name)) return name;
  const grid = FIGURE_SHEETS[key];
  if (trim && grid && grid[0] === cols && grid[1] === rows && cutFigures(texture, cols, rows) && texture.has(name)) return name;
  const source = texture.getSourceImage() as HTMLImageElement;
  const cellW = source.width / cols, cellH = source.height / rows;
  const row = Math.floor(index / cols);
  const rowsAt = key === 'art:puzzle-props' && cols === 4 && rows === 4 ? [0, 280, 540, 798, 1086].map(n => Math.round(n * source.height / 1086)) : undefined;
  const x = Math.floor(index % cols * cellW), y = rowsAt ? rowsAt[row] : Math.floor(row * cellH);
  let w = Math.floor(cellW), h = rowsAt ? rowsAt[row + 1] - y : Math.floor(cellH), left = 0, top = 0;
  if (trim) {
    const box = trimCell(source, x, y, w, h);
    if (box) ({ left, top, w, h } = box);
  }
  texture.add(name, 0, x + left, y + top, w, h);
  return name;
}

/**
 * Cut every figure out of a character sheet once: find the connected shapes across the whole
 * sheet, give each cell the shape that mostly lives in it (plus the small loose bits that belong
 * to it, like a coin or a wisp of steam), and copy just those pixels onto a clean canvas. Feet or a
 * stand from a neighbour are left behind, and figures that overflow their cell stay whole. Each
 * figure becomes an extra source on the same texture, under the usual `cell:` frame name.
 */
function cutFigures(texture: Phaser.Textures.Texture, cols: number, rows: number): boolean {
  if (texture.has(`cell:${cols}:${rows}:0:true`)) return true;
  const image = texture.getSourceImage() as HTMLImageElement;
  const W = image.width, H = image.height;
  let data: Uint8ClampedArray;
  try {
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(image, 0, 0);
    data = ctx.getImageData(0, 0, W, H).data;
  } catch {
    return false;
  }
  // Label solid shapes; soft edges (alpha < 160) are joined back on afterwards.
  const { label, boxes, sizes, count } = labelShapes(data, W, H, 160);
  const cellW = W / cols, cellH = H / rows;
  const key = texture.key;
  const inside = new Int32Array(count);
  const touched: number[] = [];
  for (let index = 0; index < cols * rows; index++) {
    const over = OVERSIZE[key]?.[index];
    const sx = W / 1448, sy = H / 1086;
    const cell = over
      ? { x: Math.round(over[0] * sx), y: Math.round(over[1] * sy), w: Math.round(over[2] * sx), h: Math.round(over[3] * sy) }
      : { x: Math.floor((index % cols) * cellW), y: Math.floor(Math.floor(index / cols) * cellH), w: Math.floor(cellW), h: Math.floor(cellH) };
    // how much of each shape lies inside this cell (in first-seen order, like a Map)
    for (const id of touched) inside[id] = 0;
    touched.length = 0;
    for (let yy = cell.y; yy < cell.y + cell.h; yy++) {
      const row = yy * W;
      for (let xx = cell.x; xx < cell.x + cell.w; xx++) {
        const id = label[row + xx];
        if (id < 0) continue;
        if (inside[id]++ === 0) touched.push(id);
      }
    }
    let main = -1;
    for (const id of touched) if (main < 0 || inside[id] > inside[main]) main = id;
    if (main < 0) continue;
    const keep = new Set<number>([main]);
    for (const id of touched) if (id !== main && sizes[id] >= 24 && inside[id] >= sizes[id] * 0.7) keep.add(id);
    // the figure's box: its shapes' boxes, allowed to hang a little way out of the cell
    const pad = over ? 0 : 0.45;
    const lim = { x0: cell.x - cell.w * pad, y0: cell.y - cell.h * pad, x1: cell.x + cell.w * (1 + pad), y1: cell.y + cell.h * (1 + pad) };
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const id of keep) {
      x0 = Math.min(x0, boxes[id * 4]); y0 = Math.min(y0, boxes[id * 4 + 1]); x1 = Math.max(x1, boxes[id * 4 + 2]); y1 = Math.max(y1, boxes[id * 4 + 3]);
    }
    x0 = Math.max(0, Math.floor(Math.max(x0, lim.x0)) - 2); y0 = Math.max(0, Math.floor(Math.max(y0, lim.y0)) - 2);
    x1 = Math.min(W - 1, Math.ceil(Math.min(x1, lim.x1)) + 2); y1 = Math.min(H - 1, Math.ceil(Math.min(y1, lim.y1)) + 2);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const octx = out.getContext('2d')!;
    const px = octx.createImageData(w, h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const sxp = x0 + xx, syp = y0 + yy, sp = syp * W + sxp;
      const a = data[sp * 4 + 3];
      if (!a) continue;
      let ok = keep.has(label[sp]);
      if (!ok && label[sp] < 0) {
        // a soft edge pixel: keep it when it hugs one of this figure's shapes
        for (let dy = -2; dy <= 2 && !ok; dy++) for (let dx = -2; dx <= 2 && !ok; dx++) {
          const nx = sxp + dx, ny = syp + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && keep.has(label[ny * W + nx])) ok = true;
        }
      }
      if (!ok) continue;
      const dp = (yy * w + xx) * 4;
      px.data[dp] = data[sp * 4]; px.data[dp + 1] = data[sp * 4 + 1]; px.data[dp + 2] = data[sp * 4 + 2]; px.data[dp + 3] = a;
    }
    octx.putImageData(px, 0, 0);
    const sourceIndex = texture.source.length;
    texture.source.push(new Phaser.Textures.TextureSource(texture, out, w, h));
    texture.add(`cell:${cols}:${rows}:${index}:true`, sourceIndex, 0, 0, w, h);
  }
  return true;
}

/** The box round the main figure in one atlas cell (null when the cell can't be read). */
export function trimCell(source: CanvasImageSource, x: number, y: number, w: number, h: number): { left: number; top: number; w: number; h: number } | null {
  let data: Uint8ClampedArray;
  try {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null;
  }
  // Select the main silhouette; atlas neighbours can leave tiny edge fragments.
  const { boxes, sizes, count } = labelShapes(data, w, h, 64);
  let best = -1;
  for (let id = 0; id < count; id++) if (best < 0 || sizes[id] > sizes[best]) best = id;
  if (best < 0) return null;
  const left = boxes[best * 4], top = boxes[best * 4 + 1], right = boxes[best * 4 + 2], bottom = boxes[best * 4 + 3];
  if (right <= left || bottom <= top) return null;
  return { left, top, w: right - left + 1, h: bottom - top + 1 };
}

/**
 * Connected solid shapes in RGBA pixels (4-neighbour flood fill on alpha ≥ threshold): each
 * pixel's shape id (-1 for clear), each shape's box (minX, minY, maxX, maxY) and pixel count.
 * Written without per-pixel allocations, since it runs over whole atlas sheets.
 */
function labelShapes(data: Uint8ClampedArray, w: number, h: number, threshold: number): { label: Int32Array; boxes: Int32Array; sizes: Int32Array; count: number } {
  const n = w * h;
  const label = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let boxes = new Int32Array(256 * 4);
  let sizes = new Int32Array(256);
  let count = 0;
  for (let p = 0; p < n; p++) {
    if (label[p] >= 0 || data[p * 4 + 3] < threshold) continue;
    const id = count++;
    if (id >= sizes.length) {
      const nb = new Int32Array(boxes.length * 2); nb.set(boxes); boxes = nb;
      const ns = new Int32Array(sizes.length * 2); ns.set(sizes); sizes = ns;
    }
    let head = 0, tail = 1, minX = w, minY = h, maxX = 0, maxY = 0;
    queue[0] = p; label[p] = id;
    while (head < tail) {
      const q = queue[head++];
      const yy = (q / w) | 0, xx = q - yy * w;
      if (xx < minX) minX = xx;
      if (xx > maxX) maxX = xx;
      if (yy < minY) minY = yy;
      if (yy > maxY) maxY = yy;
      let m = q - 1;
      if (xx > 0 && label[m] < 0 && data[m * 4 + 3] >= threshold) { label[m] = id; queue[tail++] = m; }
      m = q + 1;
      if (xx < w - 1 && label[m] < 0 && data[m * 4 + 3] >= threshold) { label[m] = id; queue[tail++] = m; }
      m = q - w;
      if (yy > 0 && label[m] < 0 && data[m * 4 + 3] >= threshold) { label[m] = id; queue[tail++] = m; }
      m = q + w;
      if (yy < h - 1 && label[m] < 0 && data[m * 4 + 3] >= threshold) { label[m] = id; queue[tail++] = m; }
    }
    boxes[id * 4] = minX; boxes[id * 4 + 1] = minY; boxes[id * 4 + 2] = maxX; boxes[id * 4 + 3] = maxY;
    sizes[id] = tail;
  }
  return { label, boxes, sizes, count };
}

/** One reused matrix for followGraphic's per-frame update (Phaser would allocate a new one). */
const followMatrix = new Phaser.GameObjects.Components.TransformMatrix();

/** A painted illustration follows a Graphics owner's transform, visibility and lifecycle. */
export function followGraphic(g: Phaser.GameObjects.Graphics, image: Phaser.GameObjects.Image, x: number, y: number, w: number, h: number): void {
  const scene = g.scene;
  // The image takes the graphic's place in the draw order: directly above it, in the same container
  // (or the scene's list at the same depth). Anything added after the graphic, like a picture or
  // text on a painted card, stays on top of it.
  // Callers often move the graphic into a container after creating it, so this re-homes the image
  // whenever the graphic moves.
  const adjacent = (list: { getIndex: (child: Phaser.GameObjects.GameObject) => number; moveTo: (child: Phaser.GameObjects.GameObject, index: number) => unknown }) => {
    const graphicIndex = list.getIndex(g), imageIndex = list.getIndex(image);
    if (graphicIndex < 0 || imageIndex < 0 || imageIndex === graphicIndex + 1) return;
    // moveAbove is a no-op when an asynchronously loaded image is already
    // anywhere above the graphic. Account for removal when moving from below.
    list.moveTo(image, graphicIndex + (imageIndex < graphicIndex ? 0 : 1));
  };
  const place = () => {
    const parent = g.parentContainer;
    if (parent) {
      if (image.parentContainer !== parent) {
        image.parentContainer?.remove(image);
        parent.addAt(image, parent.getIndex(g) + 1);
      } else adjacent(parent);
    } else {
      if (image.parentContainer) {
        image.parentContainer.remove(image);
        scene.children.add(image);
      }
      if (image.depth !== g.depth) image.setDepth(g.depth);
      const list = scene.children;
      adjacent(list);
    }
  };
  const update = () => {
    if (!g.scene || !image.scene) return;
    place();
    const at = g.getLocalTransformMatrix(followMatrix).transformPoint(x, y);
    image.setPosition(at.x, at.y).setScale(w / image.width * g.scaleX, h / image.height * g.scaleY)
      .setRotation(g.rotation).setAlpha(g.alpha).setVisible(g.visible);
  };
  const cleanup = () => { scene.events.off(Phaser.Scenes.Events.POST_UPDATE, update); if (image.scene) image.destroy(); };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, update); g.once(Phaser.GameObjects.Events.DESTROY, cleanup);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup); update();
}

const OBJECTS = ['clock','musicbox','train','radio','tea','bertie','orrery','tower','door','mouse','doorbell','bikebell','timer','pepper','jack','piano'];
const EXTRA = ['cat','car','boat','whistle','flashlight','desklamp','vane','sprinkler','metronome','coinbank','gumball','robot','top','nightlight','kaleidoscope','bird'];
/** Where an object's painting lives: its atlas and cell (4×4), or null when it has none. */
export function objectArt(id: string): { atlas: string; index: number } | null {
  let index = OBJECTS.indexOf(id);
  if (index >= 0) return { atlas: 'item-atlas', index };
  index = EXTRA.indexOf(id);
  return index >= 0 ? { atlas: 'item-atlas-extra', index } : null;
}

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

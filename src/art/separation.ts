import Phaser from 'phaser';

/** Cache an alpha-only edge behind a sprite; the original artwork stays untouched. */
export function separateSprite(image: Phaser.GameObjects.Image): void {
  if (image.getData('separation')) return;
  image.setData('separation', true);
  const scene = image.scene;
  const edge = scene.add.image(image.x, image.y, '__WHITE').setName('separation:edge');
  let frameKey = '';
  const update = () => {
    if (!image.scene || !edge.scene || !image.frame) return;
    const f = image.frame, ratio = Math.min(1, 192 / Math.max(f.cutWidth, f.cutHeight));
    const w = Math.max(1, Math.round(f.cutWidth * ratio)), h = Math.max(1, Math.round(f.cutHeight * ratio)), pad = 8;
    const key = `separation:v2:${image.texture.key}:${f.name}:${w}:${h}`;
    if (key !== frameKey) {
      if (!scene.textures.exists(key)) {
        const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
        const m = mask.getContext('2d')!;
        m.drawImage(image.texture.getSourceImage() as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, w, h);
        const canvas = document.createElement('canvas'); canvas.width = w + pad * 2; canvas.height = h + pad * 2;
        const c = canvas.getContext('2d')!;
        const tone = (colour: string) => { m.globalCompositeOperation = 'source-in'; m.fillStyle = colour; m.fillRect(0,0,w,h); };
        tone('rgba(29,25,20,.62)'); c.filter = 'blur(2px)'; c.drawImage(mask,pad+1,pad+4); c.filter = 'none';
        tone('rgba(255,230,176,.52)');
        for (let i=0;i<12;i++) { const a=i*Math.PI/6; c.drawImage(mask,pad+Math.cos(a)*4,pad+Math.sin(a)*4); }
        // Restore alpha before tinting, so repeated tones do not diminish the outline.
        m.globalCompositeOperation='source-over'; m.clearRect(0,0,w,h);
        m.drawImage(image.texture.getSourceImage() as CanvasImageSource, f.cutX,f.cutY,f.cutWidth,f.cutHeight,0,0,w,h);
        tone('rgba(44,34,25,.9)');
        for (let i=0;i<12;i++) { const a=i*Math.PI/6; c.drawImage(mask,pad+Math.cos(a)*2.7,pad+Math.sin(a)*2.7); }
        c.globalCompositeOperation='destination-out';
        c.drawImage(image.texture.getSourceImage() as CanvasImageSource,f.cutX,f.cutY,f.cutWidth,f.cutHeight,pad,pad,w,h);
        scene.textures.addCanvas(key,canvas);
      }
      edge.setTexture(key); frameKey = key;
    }
    if (edge.parentContainer !== image.parentContainer) {
      edge.parentContainer?.remove(edge);
      if (image.parentContainer) image.parentContainer.addAt(edge,Math.max(0,image.parentContainer.getIndex(image)));
      else scene.add.existing(edge);
    }
    edge.setPosition(image.x,image.y).setScale(image.scaleX * image.width / w,image.scaleY * image.height / h)
      .setOrigin((pad+image.originX*w)/(w+pad*2),(pad+image.originY*h)/(h+pad*2))
      .setRotation(image.rotation).setFlip(image.flipX,image.flipY).setAlpha(image.alpha).setVisible(image.visible)
      .setDepth(image.depth-.001);
    let mask = image.mask;
    for (let p=image.parentContainer;p&&!mask;p=p.parentContainer) mask=p.mask;
    if (mask) edge.setMask(mask); else edge.clearMask(false);
  };
  const cleanup = () => { scene.events.off(Phaser.Scenes.Events.POST_UPDATE,update); if(edge.scene)edge.destroy(); };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE,update);
  image.once(Phaser.GameObjects.Events.DESTROY,cleanup); scene.events.once(Phaser.Scenes.Events.SHUTDOWN,cleanup);
  update();
}

/** New asynchronous illustrations receive the same edge in every scene and renderer. */
export function installSeparation(scene: Phaser.Scene): void {
  let next = 0;
  const scan = () => {
    if (scene.time.now < next) return; next = scene.time.now + 250;
    const walk = (objects: Phaser.GameObjects.GameObject[]) => {
      for (const object of [...objects]) {
        if (object instanceof Phaser.GameObjects.Container) walk(object.list);
        else if (object instanceof Phaser.GameObjects.Image) {
          const key = object.texture.key;
          if (/^(gear-|art:(kip-dimensional|tess-dimensional|portrait-|item-|busy-gadgets|puzzle-props))/.test(key) && !object.getData('separation')) separateSprite(object);
        }
      }
    };
    walk(scene.children.list);
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE,scan);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>scene.events.off(Phaser.Scenes.Events.POST_UPDATE,scan));
}

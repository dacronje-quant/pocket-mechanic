import Phaser from 'phaser';
import { cosmeticById, type KipLook } from '../content/cosmetics';
import { withArt } from './generated';
import { atlasFrame } from './sprites';
import { accessoryCell, attachmentPose, cosmeticVisual } from './accessoryCatalog';
import { finishSwatch, lensTexture, trailTexture } from './accessoryMaterials';

/** Load one authored part without blocking the scene or allowing stale try-ons to return. */
function part(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, id: string, x: number, y: number, w: number, h: number, bottom = false): Phaser.GameObjects.Image {
  const image = scene.add.image(x, y, '__WHITE').setVisible(false).setName(`accessory:${id}`).setData('cosmetic', id);
  image.setOrigin(.5, bottom ? 1 : .5); parent.add(image);
  const cell = accessoryCell(id);
  if (cell) withArt(scene, cell.sheet, key => {
    if (!image.active || !image.scene) return;
    const frame = atlasFrame(scene, key, cell.index, cell.cols, cell.rows, true);
    image.setTexture(key, frame);
    const scale = Math.min(w / image.width, h / image.height);
    image.setScale(scale).setData('baseScale',scale).setVisible(true);
    // Colour variants tint glass only; the brass mounting socket stays warm.
    if (/^bulb-(red|orange|yellow|green|blue|purple|pink|white)$/.test(id)) {
      const name = `${key}:${id}`;
      if (!scene.textures.exists(name)) {
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const c = canvas.getContext('2d')!, f = image.frame;
        c.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, canvas.width, canvas.height);
        const pixels = c.getImageData(0, 0, canvas.width, canvas.height), target = Phaser.Display.Color.IntegerToRGB(cosmeticById(id)?.color ?? 0xf1d391);
        for (let yy=0; yy<canvas.height*.7; yy++) for(let xx=0;xx<canvas.width;xx++) {
          const p=(yy*canvas.width+xx)*4,d=pixels.data;if(d[p+3]<5)continue;
          const light=(d[p]*.3+d[p+1]*.6+d[p+2]*.1)/180,shine=Math.max(0,light-1)*150;
          d[p]=Math.min(255,target.r*light+shine);d[p+1]=Math.min(255,target.g*light+shine);d[p+2]=Math.min(255,target.b*light+shine);
        }c.putImageData(pixels,0,0);scene.textures.addCanvas(name,canvas);
      }image.setTexture(name).setScale(scale);
    }
  });
  return image;
}

/** The same real accessory art is used in category buttons, cards and reward previews. */
export function accessoryIcon(scene: Phaser.Scene, x: number, y: number, id: string, size = 66, variant: 'kip'|'tess' = 'kip'): Phaser.GameObjects.Container {
  const node = scene.add.container(x,y).setName(`cosmetic-icon:${id}`).setData('cosmetic',id);
  const visual=cosmeticVisual(id);
  if(visual==='sheet') part(scene,node,variant==='tess'&&id==='bulb-classic'?'periscope':id,0,0,size,size);
  else if(visual==='finish') node.add(scene.add.image(0,0,finishSwatch(scene,id)).setDisplaySize(size,size));
  else if(visual==='lenses') node.add(scene.add.image(0,0,lensTexture(scene,id)).setDisplaySize(size,size*.55));
  else if(visual==='trail') {
    for(let i=0;i<3;i++)node.add(scene.add.image((i-1)*size*.24,(i%2?-.1:.12)*size,trailTexture(scene,id)).setDisplaySize(size*.35,size*.35).setAngle(i*18-18).setAlpha(.65+i*.15));
  } else if(visual==='empty') {
    const g=scene.add.graphics();g.lineStyle(3,0x8a7962,.75).strokeCircle(0,0,size*.29).lineBetween(-size*.2,size*.2,size*.2,-size*.2);node.add(g);
  }
  return node;
}

/** Separate back/front layers keep keys behind the case and badges above the faceplate. */
export class AccessoryRig {
  readonly back: Phaser.GameObjects.Container;
  readonly front: Phaser.GameObjects.Container;
  private key?: Phaser.GameObjects.Image;
  private leftFoot?: Phaser.GameObjects.Image;
  private rightFoot?: Phaser.GameObjects.Image;
  private eyes?: Phaser.GameObjects.Image;
  private pupils?: Phaser.GameObjects.Graphics;
  private topper?: Phaser.GameObjects.Image;
  private stalk?: Phaser.GameObjects.Image;
  private hat?: Phaser.GameObjects.Image;
  private plate?: Phaser.GameObjects.Image;
  private text?: Phaser.GameObjects.Text;
  private look?: KipLook;
  constructor(private scene: Phaser.Scene, torso: Phaser.GameObjects.Container, private variant: 'kip'|'tess') {
    this.back=scene.add.container().setName('accessories:back');this.front=scene.add.container().setName('accessories:front');
    torso.addAt(this.back,0);torso.add(this.front);this.setVisible(false);
  }
  setVisible(visible:boolean):void {this.back.setVisible(visible);this.front.setVisible(visible);}
  setLook(look:KipLook):void {
    this.look={...look};this.back.removeAll(true);this.front.removeAll(true);
    const s=this.scene,p=attachmentPose(0,this.variant);
    this.key=part(s,this.back,look.key,p.key.x,p.key.y,33,39);
    this.stalk=part(s,this.back,this.variant==='tess'?'antenna-tess':'antenna-kip',p.antenna.x,-38,9,13,true);
    this.topper=part(s,this.front,this.variant==='tess'&&look.bulb==='bulb-classic'?'periscope':look.bulb,p.antenna.x,-49,18,19,true);
    const right=look.feet==='feet-springs'?'shoe-teal':look.feet==='feet-wheels'?'shoe-wheel-right':look.feet==='feet-clogs'?'shoe-clog-right':'shoe-rocket-right';
    this.leftFoot=part(s,this.front,look.feet,p.leftFoot.x,p.leftFoot.y,22,17,true);
    this.rightFoot=part(s,this.front,right,p.rightFoot.x,p.rightFoot.y,22,17,true);
    this.eyes=s.add.image(p.faceX,p.faceY,lensTexture(s,look.eyes)).setDisplaySize(38,20.9).setName(`accessory:${look.eyes}`).setData('cosmetic',look.eyes);this.front.add(this.eyes);
    this.pupils=s.add.graphics().setPosition(p.faceX,p.faceY);this.front.add(this.pupils);
    if(look.plate!=='plate-plain') this.plate=part(s,this.front,look.plate,p.faceX,5,19,15);
    else this.plate=undefined;
    this.text=s.add.text(p.faceX,5,look.plate==='plate-monogram'?(look.initials||'★'):'',{fontFamily:'Georgia,serif',fontSize:'5px',fontStyle:'bold',color:'#60452e'}).setOrigin(.5);this.front.add(this.text);
    this.hat=look.hat==='hat-none'?undefined:part(s,this.front,look.hat,p.hat.x,p.hat.y,look.hat==='hat-bow'?31:43,look.hat==='hat-party'?36:32,true);
    if(look.tool!=='tool-classic')part(s,this.front,look.tool,35,6,17,23);
    // Voice chips are shown as cartridges in the chooser, rather than covering the face.
  }
  update(pose:number,time:number,walking:boolean,keySpeed:number,pupilDx:number):void {
    const p=attachmentPose(pose,this.variant);
    if(this.key){
      const scale=this.key.getData('baseScale')??this.key.scaleY;
      const turn=keySpeed>1?Math.max(.45,Math.abs(Math.cos(time*keySpeed*2))):.9+.1*Math.cos(time*.9);
      this.key.setScale(turn*scale,scale);
    }
    const bounce=walking?Math.sin(time*18)*2:0;
    this.leftFoot?.setPosition(p.leftFoot.x,p.leftFoot.y+bounce).setAngle(walking?Math.sin(time*18)*12:0);
    this.rightFoot?.setPosition(p.rightFoot.x,p.rightFoot.y-bounce).setAngle(walking?-Math.sin(time*18)*12:0);
    const blink=pose===1||pose===6;
    this.eyes?.setScale(this.eyes.scaleX,this.eyes.scaleX*(blink ? .12 : 1));
    this.pupils?.clear().setVisible(!blink);
    if(this.pupils&&!blink)for(const x of [-9.1,9.1]){
      const dx=x+pupilDx;this.pupils.fillStyle(0x365c5f).fillCircle(dx,0,4.5).fillStyle(0x15232a).fillCircle(dx,-.2,3.3).fillStyle(0xfff7dd).fillCircle(dx-1.3,-2,1.5).fillStyle(0xffffff,.45).fillCircle(dx+1.5,1.5,.6);
    }
    this.topper?.setAngle(this.look?.bulb==='topper-propeller'?Math.sin(time*7)*12:Math.sin(time*2)*2);
    this.hat?.setPosition(p.hat.x,p.hat.y).setAngle(walking?Math.sin(time*9)*1.5:0);
    this.plate?.setPosition(p.faceX,5);
    this.stalk?.setAngle(Math.sin(time*2)*1.2);
  }
}

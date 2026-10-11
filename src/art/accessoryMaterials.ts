import Phaser from 'phaser';
import { cosmeticById } from '../content/cosmetics';

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

/** Supersampled brass-and-glass lenses: clear silhouettes with live pupils and eyelids. */
export function lensTexture(scene: Phaser.Scene, id: string): string {
  const key = `accessory:lenses:${id}`;
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 176;
  const c = canvas.getContext('2d')!; c.scale(4, 4);
  for (const [i, x] of [20, 59].entries()) {
    const y = 20, radius = id === 'eyes-telescope' ? 15 : i === 1 && id === 'eyes-monocle' ? 18 : 16;
    const shape = (r: number) => {
      const path = new Path2D();
      if (id === 'eyes-heart') {
        path.moveTo(x, y + r * .9); path.bezierCurveTo(x-r*1.5,y-r*.1,x-r,y-r*1.4,x,y-r*.55);
        path.bezierCurveTo(x+r,y-r*1.4,x+r*1.5,y-r*.1,x,y+r*.9);
      } else if (id === 'eyes-star') {
        for (let n=0;n<10;n++) {const a=n*Math.PI/5-Math.PI/2,rr=n%2?r*.58:r; const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr; n?path.lineTo(px,py):path.moveTo(px,py);} path.closePath();
      } else path.ellipse(x,y,r,r*.96,0,0,Math.PI*2);
      return path;
    };
    if (id === 'eyes-telescope') {
      const barrel=c.createLinearGradient(x-18,y-17,x+15,y+15);
      barrel.addColorStop(0,'#d9b876');barrel.addColorStop(.4,'#f9e7b1');barrel.addColorStop(.6,'#87653e');barrel.addColorStop(1,'#352d23');
      c.fillStyle=barrel;c.beginPath();c.roundRect(x-18,y-16,34,34,8);c.fill();
    }
    const metal=c.createLinearGradient(x-radius,y-radius,x+radius,y+radius);
    metal.addColorStop(0,'#fff0bd');metal.addColorStop(.22,'#d1a567');metal.addColorStop(.43,'#f2d599');metal.addColorStop(.65,'#94704a');metal.addColorStop(1,'#392c22');
    c.fillStyle=metal;c.fill(shape(radius));c.strokeStyle='#443127';c.lineWidth=.9;c.stroke(shape(radius));
    c.fillStyle='#48372d';c.fill(shape(radius-2.1));
    const glass=c.createRadialGradient(x-5,y-7,1,x,y,radius);
    glass.addColorStop(0,'#fffced');glass.addColorStop(.45,hex(cosmeticById(id)?.color??0xf4ebd5));glass.addColorStop(1,id==='eyes-green'?'#709789':id==='eyes-amber'?'#b67b47':'#9cb6ba');
    c.fillStyle=glass;c.fill(shape(radius-3.5));
    c.save();c.clip(shape(radius-3.5));c.strokeStyle='rgba(255,255,242,.8)';c.lineWidth=1.5;c.beginPath();c.arc(x-1,y-1,radius-5,Math.PI*1.1,Math.PI*1.67);c.stroke();c.restore();
  }
  if (id==='eyes-monocle') {c.strokeStyle='#b19159';c.lineWidth=1.2;c.beginPath();c.moveTo(76,22);c.bezierCurveTo(79,28,70,30,76,42);c.stroke();}
  scene.textures.addCanvas(key,canvas);return key;
}

/** Material swatches show the actual finish family, including stripes and patina. */
export function finishSwatch(scene: Phaser.Scene, id: string): string {
  const key=`accessory:finish:${id}`;if(scene.textures.exists(key))return key;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=192;const c=canvas.getContext('2d')!;
  const fin=cosmeticById(id),color=hex(fin?.color??0xb77b56),dark=hex(fin?.color2??0x79503d);
  c.fillStyle='#342b24';c.beginPath();c.arc(96,96,89,0,Math.PI*2);c.fill();
  const rim=c.createLinearGradient(10,10,182,182);rim.addColorStop(0,'#f3d6a2');rim.addColorStop(.4,'#b68b52');rim.addColorStop(1,'#584333');c.fillStyle=rim;c.beginPath();c.arc(96,96,85,0,Math.PI*2);c.fill();
  const metal=c.createRadialGradient(58,48,4,96,96,84);metal.addColorStop(0,id==='finish-pearl'?'#ffffff':'#f9e4ba');metal.addColorStop(.28,color);metal.addColorStop(.72,color);metal.addColorStop(1,dark);
  c.beginPath();c.arc(96,96,74,0,Math.PI*2);c.save();c.clip();c.fillStyle=metal;c.fillRect(0,0,192,192);
  if(id==='finish-candy'){c.rotate(-.4);c.fillStyle='#f4ebd5';for(let x=-100;x<250;x+=32)c.fillRect(x,-100,14,400);}
  for(let i=0;i<30;i++){const x=35+(i*37)%125,y=35+(i*23)%125;c.fillStyle=id==='finish-brass'||id==='finish-verdigris'?'rgba(56,119,106,.25)':'rgba(255,250,215,.2)';c.fillRect(x,y,2+i%6,1+i%3);}c.restore();
  for(let i=0;i<6;i++){const a=i*Math.PI/3,x=96+Math.cos(a)*81,y=96+Math.sin(a)*81;c.fillStyle='#624633';c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();c.fillStyle='#eed6a4';c.fillRect(x-1,y-2,2,1);}
  scene.textures.addCanvas(key,canvas);return key;
}

export function trailTexture(scene: Phaser.Scene, id: string): string {
  const key=`accessory:${id}`;if(scene.textures.exists(key))return key;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const c=canvas.getContext('2d')!;
  if(id==='trail-steam'){
    const gradient=c.createRadialGradient(45,40,2,48,48,43);gradient.addColorStop(0,'rgba(255,252,235,.9)');gradient.addColorStop(.6,'rgba(246,237,217,.5)');gradient.addColorStop(1,'rgba(246,237,217,0)');c.fillStyle=gradient;c.fillRect(0,0,96,96);
  }else{
    c.translate(48,48);const path=new Path2D();
    if(id==='trail-notes'){path.ellipse(-10,16,13,9,-.4,0,Math.PI*2);path.rect(0,-29,5,46);path.moveTo(5,-29);path.lineTo(27,-20);path.lineTo(27,-9);path.lineTo(5,-18);}
    else if(id==='trail-gears'){for(let n=0;n<48;n++){const a=n*Math.PI/24,r=n%6<3?29:37;const x=Math.cos(a)*r,y=Math.sin(a)*r;n?path.lineTo(x,y):path.moveTo(x,y);}path.closePath();path.arc(0,0,10,0,Math.PI*2,true);}
    else{for(let n=0;n<10;n++){const a=n*Math.PI/5-Math.PI/2,r=n%2?13:36;const x=Math.cos(a)*r,y=Math.sin(a)*r;n?path.lineTo(x,y):path.moveTo(x,y);}path.closePath();}
    const gold=c.createLinearGradient(-30,-35,30,35);gold.addColorStop(0,'#fff2c7');gold.addColorStop(.38,id==='trail-notes'?'#aa8fbd':'#e7bb65');gold.addColorStop(1,id==='trail-notes'?'#574263':'#986438');c.fillStyle=gold;c.fill(path);c.strokeStyle='#74543b';c.lineWidth=2;c.stroke(path);
  }scene.textures.addCanvas(key,canvas);return key;
}

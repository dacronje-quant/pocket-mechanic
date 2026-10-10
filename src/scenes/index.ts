/** Every scene in the game (the boot scene is added first in main.ts). */
import type Phaser from 'phaser';
import { BalanceRoom } from '../rooms/BalanceRoom';
import { CamRoom } from '../rooms/CamRoom';
import { CardsRoom } from '../rooms/CardsRoom';
import { ChainRoom } from '../rooms/ChainRoom';
import { FlowRoom } from '../rooms/FlowRoom';
import { GearRoom } from '../rooms/GearRoom';
import { LightRoom } from '../rooms/LightRoom';
import { LogicRoom } from '../rooms/LogicRoom';
import { MusicRoom } from '../rooms/MusicRoom';
import { OilRoom } from '../rooms/OilRoom';
import { PendulumRoom } from '../rooms/PendulumRoom';
import { BusyRoom, HuntRoom, NestRoom } from '../rooms/SimpleRooms';
import { TuneRoom } from '../rooms/TuneRoom';
import { AtticScene } from './AtticScene';
import { BenchScene } from './BenchScene';
import { FestivalScene } from './FestivalScene';
import { GrownUpsScene } from './GrownUpsScene';
import { NookScene } from './NookScene';
import { PaintScene } from './PaintScene';
import { PediaScene } from './PediaScene';
import { QuickFixesScene } from './QuickFixesScene';
import { RevealScene } from './RevealScene';
import { RewardsScene } from './RewardsScene';
import { ShelfScene } from './ShelfScene';
import { ShopScene } from './ShopScene';
import { StoryScene } from './StoryScene';
import { TitleScene } from './TitleScene';
import { TownScene } from './TownScene';

export const ROOM_SCENES: Array<typeof Phaser.Scene> = [
  GearRoom,
  FlowRoom,
  LightRoom,
  LogicRoom,
  CardsRoom,
  MusicRoom,
  TuneRoom,
  PendulumRoom,
  BalanceRoom,
  OilRoom,
  CamRoom,
  ChainRoom,
  HuntRoom,
  BusyRoom,
  NestRoom,
];

export const META_SCENES: Array<typeof Phaser.Scene> = [
  TitleScene,
  ShopScene,
  StoryScene,
  RevealScene,
  RewardsScene,
  FestivalScene,
  QuickFixesScene,
  ShelfScene,
  AtticScene,
  TownScene,
  PediaScene,
  PaintScene,
  NookScene,
  BenchScene,
  GrownUpsScene,
];

export const ALL_SCENES: Array<typeof Phaser.Scene> = [...META_SCENES, ...ROOM_SCENES];

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

export const ALL_SCENES: Array<typeof Phaser.Scene> = [...ROOM_SCENES];

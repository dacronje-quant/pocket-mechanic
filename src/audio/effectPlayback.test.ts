import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => {
  const nodes: any[] = [], gains: any[] = [], output = {};
  const node = () => {
    const value: any = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), addEventListener: vi.fn(), frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } };
    value.connect.mockImplementation((target: unknown) => target); nodes.push(value); return value;
  };
  const createGain = () => {
    const gain: any = { connect: vi.fn(), disconnect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } };
    gain.connect.mockReturnValue(gain); gains.push(gain); return gain;
  };
  return { nodes, gains, output, context: { currentTime: 0, createGain, createOscillator: node } };
});
vi.mock('./engine', () => ({ ac: () => mock.context, bus: () => mock.output, soundFiles: () => [], loadBuffer: vi.fn(), readyBuffer: vi.fn() }));
import { effectPlayback, tone } from './sfx';
beforeEach(() => { mock.nodes.length = 0; mock.gains.length = 0; });
describe('owned sound-effect playback', () => {
  it('routes its notes through the effects bus and cancels only its own scheduled sources', () => {
    tone(440, 'sine', 0.1, 0.01, 0.1);
    const unrelated = mock.nodes[0];
    const group = effectPlayback(), path = mock.gains[1];
    group.play(() => tone(660, 'sine', 0.1, 0.01, 0.1, 2));
    expect(path.connect).toHaveBeenCalledWith(mock.output);
    expect(mock.gains[2].connect).toHaveBeenCalledWith(path);
    const owned = mock.nodes[1];
    owned.stop.mockClear(); unrelated.stop.mockClear();
    group.stop(); group.stop();
    expect(owned.stop).toHaveBeenCalledTimes(1);
    expect(unrelated.stop).not.toHaveBeenCalled();
    expect(path.disconnect).toHaveBeenCalledTimes(1);
    group.play(() => tone(880, 'sine', 0.1, 0.01, 0.1));
    expect(mock.nodes).toHaveLength(2);
  });
  it('restores the ordinary sound route even if an object cue throws', () => {
    const group = effectPlayback();
    expect(() => group.play(() => { throw new Error('cue'); })).toThrow('cue');
    tone(440, 'sine', 0.1, 0.01, 0.1);
    expect(mock.gains[1].connect).toHaveBeenCalledWith(mock.output);
    group.stop();
  });
});

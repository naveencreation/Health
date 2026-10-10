import { AccessibilityInfo } from 'react-native';

jest.mock('react-native-reanimated', () => ({
  Easing: {
    out: (fn: (t: number) => number) => (t: number) => 1 - fn(1 - t),
    inOut: (fn: (t: number) => number) => (t: number) =>
      t < 0.5 ? fn(t * 2) / 2 : 1 - fn((1 - t) * 2) / 2,
    in: (fn: (t: number) => number) => fn,
    cubic: (t: number) => t * t * t,
    bezier: (_x1: number, _y1: number, _x2: number, _y2: number) => ({
      factory: () => (t: number) => t,
    }),
  },
}));

import { MotionDurations, MotionCurves, SpringPresets, checkReducedMotion } from '../motion';

describe('motion design tokens and easing curves', () => {
  it('defines positive MotionDurations constants', () => {
    expect(MotionDurations.instant).toBeGreaterThan(0);
    expect(MotionDurations.micro).toBeGreaterThan(0);
    expect(MotionDurations.standard).toBeGreaterThan(0);
    expect(MotionDurations.emphasized).toBeGreaterThan(0);
    expect(MotionDurations.screen).toBeGreaterThan(0);
    expect(MotionDurations.sheet).toBeGreaterThan(0);
  });

  it('defines SpringPresets with positive damping and stiffness', () => {
    expect(SpringPresets.gentle.damping).toBeGreaterThan(0);
    expect(SpringPresets.gentle.stiffness).toBeGreaterThan(0);
    expect(SpringPresets.gauge.damping).toBeGreaterThan(0);
    expect(SpringPresets.gauge.stiffness).toBeGreaterThan(0);
    expect(SpringPresets.slosh.damping).toBeGreaterThan(0);
    expect(SpringPresets.slosh.stiffness).toBeGreaterThan(0);
  });

  it('provides worklet-compatible MotionCurves functions or easing factories', () => {
    expect(MotionCurves.easeOut).toBeDefined();
    expect(MotionCurves.easeInOut).toBeDefined();
    expect(MotionCurves.easeIn).toBeDefined();
    expect(MotionCurves.accordion).toBeDefined();
    expect(MotionCurves.decelerate).toBeDefined();

    const curves = [
      MotionCurves.easeOut,
      MotionCurves.easeInOut,
      MotionCurves.easeIn,
      MotionCurves.accordion,
      MotionCurves.decelerate,
    ];

    for (const curve of curves) {
      if (typeof curve === 'function') {
        const val0 = curve(0);
        const val1 = curve(1);
        expect(typeof val0).toBe('number');
        expect(typeof val1).toBe('number');
      } else if (typeof curve === 'object' && curve !== null && 'factory' in curve) {
        const fn = (curve as any).factory();
        expect(typeof fn(0)).toBe('number');
        expect(typeof fn(1)).toBe('number');
      }
    }
  });

  it('checks reduced motion status safely', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const result = await checkReducedMotion();
    expect(result).toBe(false);
  });
});

import { expect, it } from '@jest/globals';
import { pickNext } from './useArrowNavigation';

const box = (left: number, top: number, w = 10, h = 10) => ({
  left,
  top,
  right: left + w,
  bottom: top + h
});

//  a  b
//  c     d (lower, far right)
const a = box(0, 0);
const b = box(20, 0);
const c = box(0, 20);
const d = box(60, 25);

it('moves within the row or column first', () => {
  expect(pickNext(a, [a, b, c, d], 'ArrowRight')).toBe(1);
  expect(pickNext(a, [a, b, c, d], 'ArrowDown')).toBe(2);
  expect(pickNext(c, [a, b, c, d], 'ArrowUp')).toBe(0);
  expect(pickNext(c, [a, b, c, d], 'ArrowRight')).toBe(3);
});

it('returns -1 when nothing lies that way', () => {
  expect(pickNext(a, [a, b, c, d], 'ArrowLeft')).toBe(-1);
  expect(pickNext(a, [a, b, c, d], 'ArrowUp')).toBe(-1);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rangesOverlap,
  inclusiveDayCount,
  enumerateDays,
  weekStartKey,
} from '../src/utils/time.js';

test('rangesOverlap: detects overlapping inclusive ranges', () => {
  // [1-3] vs [3-5] share day 3
  assert.equal(rangesOverlap('2026-01-01', '2026-01-03', '2026-01-03', '2026-01-05'), true);
  // [1-3] vs [4-5] no overlap
  assert.equal(rangesOverlap('2026-01-01', '2026-01-03', '2026-01-04', '2026-01-05'), false);
  // contained range
  assert.equal(rangesOverlap('2026-01-01', '2026-01-10', '2026-01-04', '2026-01-05'), true);
  // identical
  assert.equal(rangesOverlap('2026-01-04', '2026-01-04', '2026-01-04', '2026-01-04'), true);
});

test('inclusiveDayCount: counts both endpoints', () => {
  assert.equal(inclusiveDayCount('2026-01-01', '2026-01-01'), 1);
  assert.equal(inclusiveDayCount('2026-01-01', '2026-01-03'), 3);
});

test('enumerateDays: returns the full inclusive sequence', () => {
  assert.deepEqual(enumerateDays('2026-01-01', '2026-01-03'), [
    '2026-01-01', '2026-01-02', '2026-01-03',
  ]);
});

test('weekStartKey: snaps to Monday', () => {
  // 2026-01-07 is a Wednesday → week starts Monday 2026-01-05
  assert.equal(weekStartKey('2026-01-07'), '2026-01-05');
  // Monday returns itself
  assert.equal(weekStartKey('2026-01-05'), '2026-01-05');
  // Sunday 2026-01-11 → previous Monday 2026-01-05
  assert.equal(weekStartKey('2026-01-11'), '2026-01-05');
});

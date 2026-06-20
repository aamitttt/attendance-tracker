import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeHours, isLate } from '../src/utils/hours.js';

test('computeHours: normal in/out difference', () => {
  const inT = new Date('2026-01-05T09:00:00.000Z');
  const outT = new Date('2026-01-05T17:30:00.000Z');
  const { hoursWorked, missingCheckout } = computeHours(inT, outT, { standardDayHours: 9 });
  assert.equal(hoursWorked, 8.5);
  assert.equal(missingCheckout, false);
});

test('computeHours: missing checkout is capped + flagged', () => {
  const inT = new Date('2026-01-05T09:00:00.000Z');
  const { hoursWorked, missingCheckout } = computeHours(inT, null, { standardDayHours: 9 });
  assert.equal(hoursWorked, 9);
  assert.equal(missingCheckout, true);
});

test('computeHours: negative/zero guarded to 0', () => {
  const inT = new Date('2026-01-05T17:00:00.000Z');
  const outT = new Date('2026-01-05T09:00:00.000Z');
  const { hoursWorked } = computeHours(inT, outT);
  assert.equal(hoursWorked, 0);
});

test('computeHours: absurdly long session capped at standard day', () => {
  const inT = new Date('2026-01-05T09:00:00.000Z');
  const outT = new Date('2026-01-07T09:00:00.000Z'); // 48h
  const { hoursWorked } = computeHours(inT, outT, { standardDayHours: 9 });
  assert.equal(hoursWorked, 9);
});

test('isLate: at threshold is late, before is not', () => {
  const opts = { hour: 9, minute: 30 };
  assert.equal(isLate(new Date('2026-01-05T09:30:00'), opts), true);
  assert.equal(isLate(new Date('2026-01-05T09:29:00'), opts), false);
  assert.equal(isLate(new Date('2026-01-05T10:00:00'), opts), true);
  assert.equal(isLate(new Date('2026-01-05T08:00:00'), opts), false);
});

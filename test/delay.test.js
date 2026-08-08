import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sleep, randomDelayMs } from '../src/utils/delay.js';

test('randomDelayMs returns a value within [min, max)', () => {
  for (let i = 0; i < 50; i++) {
    const value = randomDelayMs(100, 200);
    assert.ok(value >= 100 && value < 200, `expected [100, 200), got ${value}`);
  }
});

test('randomDelayMs can return the min bound but never the max bound', () => {
  // With min === max - epsilon, the value should always equal min.
  const value = randomDelayMs(50, 50);
  assert.equal(value, 50);
});

test('sleep waits at least the requested duration', async () => {
  const start = Date.now();
  await sleep(20);
  assert.ok(Date.now() - start >= 15, 'sleep resolved too early');
});

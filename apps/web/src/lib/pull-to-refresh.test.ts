import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pullDistance, REFRESH_THRESHOLD } from './pull-to-refresh';

test('upward and sideways gestures never refresh', () => {
  assert.equal(pullDistance(0, 100, 0, 90), 0);
  assert.equal(pullDistance(0, 0, 200, 100), 0);
});

test('downward pull uses resistance and requires deliberate distance', () => {
  assert.ok(pullDistance(0, 0, 5, 100) < REFRESH_THRESHOLD);
  assert.equal(pullDistance(0, 0, 5, 144), REFRESH_THRESHOLD);
  assert.equal(pullDistance(0, 0, 0, 1000), 100);
});

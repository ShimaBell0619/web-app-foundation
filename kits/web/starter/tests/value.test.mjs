import assert from 'node:assert/strict';
import test from 'node:test';
import { multiply } from '../src/value.ts';
test('数値の倍数を計算する', () => {
  assert.equal(multiply(3, 4), 12);
  assert.equal(multiply(-2, 3), -6);
  assert.equal(multiply(0, 2), 0);
});

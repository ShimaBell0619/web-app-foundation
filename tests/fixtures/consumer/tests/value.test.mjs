import assert from 'node:assert/strict';
import test from 'node:test';
import { multiply } from '../src/value.ts';
test('fixture tests meaningful code', () => {
  assert.equal(multiply(3, 4), 12);
  assert.equal(multiply(-2, 3), -6);
});

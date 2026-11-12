import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveNotificationIcon } from '../src/notificationIcon.ts';

test('parses Home Assistant MDI icon names with hyphenated suffixes', () => {
  const iconPath = resolveNotificationIcon('mdi:map-marker-question-outline');

  assert.ok(iconPath, 'mdi:map-marker-question-outline should resolve');
  assert.match(iconPath, /^M/);
});

test('falls back safely when the icon is missing or unknown', () => {
  assert.equal(resolveNotificationIcon(undefined), null);
  assert.equal(resolveNotificationIcon('mdi:does-not-exist-xyz'), null);
});

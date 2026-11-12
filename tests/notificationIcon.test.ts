import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveNotificationIcon } from '../src/notificationIcon.ts';

test('parses mdi icons from Home Assistant event payloads', () => {
  const bellIcon = resolveNotificationIcon('mdi:bell');
  const wifiIcon = resolveNotificationIcon('mdi:wifi');

  assert.ok(bellIcon, 'mdi:bell should resolve to a valid icon component');
  assert.ok(wifiIcon, 'mdi:wifi should resolve to a valid icon component');
});

test('falls back safely when the icon is missing or unknown', () => {
  assert.equal(resolveNotificationIcon(undefined), null);
  assert.equal(resolveNotificationIcon('mdi:does-not-exist-xyz'), null);
});

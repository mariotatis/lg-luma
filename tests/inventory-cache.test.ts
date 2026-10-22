import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseInventoryCache } from '../src/inventory-cache.ts';

test('a saved inventory is validated and app identities are rebuilt', () => {
  const inventory = parseInventoryCache(
    JSON.stringify({
      apps: [
        { id: 'netflix', title: 'Netflix', brand: 'stale', category: 'Music' },
        { id: 'bad id!', title: 'Rejected' },
        { id: 'com.example.empty', title: '  ' },
      ],
      inputs: [
        {
          id: 'com.webos.app.hdmi3',
          title: 'Switch',
          port: 'HDMI 3',
          kind: 'console',
          connected: true,
        },
        { id: 'com.webos.app.hdmi4', title: 'Bad', port: 'HDMI 4', kind: 'toaster' },
      ],
    }),
  );
  assert.ok(inventory);
  assert.deepEqual(
    inventory.apps.map((app) => app.id),
    ['netflix'],
  );
  assert.equal(inventory.apps[0].brand, 'netflix');
  assert.equal(inventory.apps[0].category, 'Streaming');
  assert.deepEqual(inventory.inputs, [
    {
      id: 'com.webos.app.hdmi3',
      title: 'Switch',
      port: 'HDMI 3',
      kind: 'console',
      connected: true,
    },
  ]);
  assert.deepEqual(inventory.warnings, []);
});

test('missing, broken, or empty caches are ignored', () => {
  assert.equal(parseInventoryCache(null), null);
  assert.equal(parseInventoryCache('{broken'), null);
  assert.equal(parseInventoryCache('{"apps":[],"inputs":[]}'), null);
  assert.equal(parseInventoryCache('{"apps":{}}'), null);
});

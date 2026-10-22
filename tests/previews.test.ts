import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appIdentity } from '../src/catalog.ts';
import { loadPreviews, normalizeContent } from '../src/previews.ts';

test('the desktop preview has a YouTube shelf that deep links each video', async () => {
  const items = await loadPreviews(appIdentity('youtube.leanback.v4', 'YouTube'));
  assert.ok(items.length >= 6);
  const [first] = items;
  assert.match(first.image, /^https:\/\/i\.ytimg\.com\/vi\/[\w-]{11}\/hqdefault\.jpg$/);
  assert.deepEqual(first.launch, { params: { contentTarget: `v=${first.id}` } });
});

test('apps without a source have no shelf', async () => {
  assert.deepEqual(await loadPreviews(appIdentity('netflix', 'Netflix')), []);
});

test('webOS published content becomes shelf items that open their target app', () => {
  const entry = (
    title: string,
    contentId: string,
    url: string,
    target = 'com.webos.app.lgchannels',
  ) => ({
    type: 'content',
    titleText: title,
    category: '',
    image: { url, width: 444, height: 250 },
    image_4k: { url: 'http://aic.imagesvc.lgtvcommon.com/4k.jpg', width: 960, height: 540 },
    onClick: { contentId, launchParam: null, targetAppId: target },
  });
  const items = normalizeContent(
    [
      { type: 'title', titleText: '', onClick: { contentId: '', targetAppId: 'x' } },
      entry('  A   channel ', '%7B%22chId%22%3A%221%22%7D', 'http://ngfts.lge.com/a.jpg'),
      entry('No artwork', 'id-2', ''),
      entry('Duplicate', '%7B%22chId%22%3A%221%22%7D', 'http://ngfts.lge.com/b.jpg'),
      entry('', 'id-4', 'http://ngfts.lge.com/c.jpg'),
      entry('Bad target', 'id-5', 'https://example.com/d.jpg', 'bad target!'),
      entry('Unsafe artwork', 'id-6', 'javascript:alert(1)'),
      null,
    ],
    'com.webos.app.lgchannels',
  );
  assert.deepEqual(
    items.map((item) => [item.title, item.image, item.appId, item.launch.params?.contentTarget]),
    [
      [
        'A channel',
        'http://ngfts.lge.com/a.jpg',
        'com.webos.app.lgchannels',
        '%7B%22chId%22%3A%221%22%7D',
      ],
      [
        'No artwork',
        'http://aic.imagesvc.lgtvcommon.com/4k.jpg',
        'com.webos.app.lgchannels',
        'id-2',
      ],
      ['Bad target', 'https://example.com/d.jpg', 'com.webos.app.lgchannels', 'id-5'],
      [
        'Unsafe artwork',
        'http://aic.imagesvc.lgtvcommon.com/4k.jpg',
        'com.webos.app.lgchannels',
        'id-6',
      ],
    ],
  );
  assert.deepEqual(normalizeContent({ contents: [] }, 'x'), []);
});

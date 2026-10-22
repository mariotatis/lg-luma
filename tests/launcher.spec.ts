import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('home is remote navigable, opening a preview never pretends to launch a TV app', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const netflix = page.getByRole('button', { name: 'Open Netflix', exact: true });
  await expect(netflix).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Open YouTube', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Desktop preview');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(':focus')).toHaveAttribute('data-focusable', /^input-/);
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await netflix.focus();
  await page.mouse.move(1, 1);
  await page.screenshot({ path: info.outputPath('luma-home.png') });
  expect(errors).toEqual([]);
});

test('hold OK opens options, favorites persist and hidden apps can be restored', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await page.getByRole('button', { name: 'Open Netflix', exact: true }).focus();
  await page.keyboard.down('Enter');
  await page.waitForTimeout(700);
  await page.keyboard.up('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Remove from favorites' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  const netflix = page.getByRole('button', { name: 'Open Netflix', exact: true });
  await netflix.focus();
  await page.keyboard.press('m');
  await page.getByRole('button', { name: 'Hide app', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(netflix).toHaveCount(0);
  await page.getByRole('button', { name: 'Hidden (1)', exact: true }).click();
  await expect(page.locator('.library-grid [data-app-id]')).toHaveCount(1);
  await expect(netflix).toBeVisible();
  await netflix.focus();
  await page.keyboard.press('m');
  await page.getByRole('button', { name: 'Show app', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hidden (1)', exact: true })).toHaveCount(0);
  await expect(netflix).toBeVisible();
});

test('full-page settings support remote navigation, Back, and persistent preferences', async ({
  page,
}, info) => {
  await page.goto('/');
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  await settings.click();
  await expect(page.getByRole('region', { name: 'Luma settings', exact: true })).toBeVisible();
  await expect(settings).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('switch', { name: 'Show app names on Home', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(settings).toBeFocused();
  for (const id of [
    'setting-home-app-names',
    'setting-previews',
    'setting-text-navigation',
    'setting-clock',
    'setting-motion',
    'setting-language',
  ]) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(':focus')).toHaveAttribute('data-focusable', id);
  }
  // Down passes the language selector like any other row; OK opens it.
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(':focus')).toHaveAttribute('data-focusable', 'setting-refresh');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await page.keyboard.press('ArrowUp');
  await expect(page.locator(':focus')).toHaveAttribute('data-focusable', 'setting-language');
  await page.locator('[data-focusable="setting-refresh"]').focus();
  await expect(page.locator(':focus')).toHaveAttribute('data-focusable', 'setting-refresh');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(':focus')).toHaveAttribute('data-focusable', 'setting-use-as-home');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(':focus')).toHaveAttribute('data-focusable', 'setting-show-weather');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator(':focus')).toHaveAttribute('data-focusable', 'setting-use-as-home');
  await page.getByRole('button', { name: 'Summit', exact: true }).click();
  await page.getByRole('switch', { name: '24-hour clock', exact: false }).click();
  await page.getByRole('switch', { name: 'Reduced motion', exact: false }).click();
  await page.screenshot({ path: info.outputPath('luma-settings.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeFocused();
  await page.reload();
  await expect(page.locator('.wallpaper')).toHaveClass(/wallpaper-summit/);
  await expect(page.locator('.luma')).toHaveClass(/reduce-motion/);
});

test('display language menu supports vertical remote navigation and persists', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Display language: English' });
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-focusable="language-option-en"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-focusable="language-option-es"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-focusable="language-option-de"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Luma-Einstellungen', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Oberfläche', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Einstellungen', exact: true }).click();
  await page.getByRole('button', { name: 'Anzeigesprache: Deutsch' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-focusable="language-option-de"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('button', { name: '主页', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Luma 设置', exact: true })).toBeVisible();
});

test('Spanish can be chosen and translates the interface', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('[data-focusable="setting-language"]').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-focusable="language-option-es"]')).toHaveText('Español');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-419');
  await expect(page.getByRole('button', { name: 'Inicio', exact: true })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Configuración de Luma', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Idioma: Español' })).toBeVisible();
  await expect(page.getByRole('switch', { name: /Usar Luma como inicio/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Inicio', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Favoritos', exact: true })).toBeVisible();
});

test('the language menu ends lead out of it and leaving sideways closes it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const trigger = page.locator('[data-focusable="setting-language"]');
  const menu = page.getByRole('listbox');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-focusable="language-option-en"]')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(trigger).toBeFocused();
  await expect(menu).toHaveCount(0);

  await page.keyboard.press('Enter');
  await expect(page.locator('[data-focusable="language-option-en"]')).toBeFocused();
  for (const option of ['es', 'de', 'zh']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(`[data-focusable="language-option-${option}"]`)).toBeFocused();
  }
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-focusable="setting-refresh"]')).toBeFocused();
  await expect(menu).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-focusable="language-option-en"]')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(menu).toHaveCount(0);
  await expect(page.locator(':focus')).toHaveAttribute('data-focusable', /^wallpaper-/);
});

test('Interface D-pad moves down to the language selector and up from refresh', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('[data-focusable="setting-motion"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-focusable="setting-language"]')).toBeFocused();
  await page.locator('[data-focusable="setting-refresh"]').focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-focusable="setting-language"]')).toBeFocused();
});

test('Settings panels fit within the content width at desktop and compact sizes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  for (const width of [1920, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      const panels = [...document.querySelectorAll<HTMLElement>('.settings-layout > *')];
      const mainBox = main.getBoundingClientRect();
      return {
        documentOverflow: document.documentElement.scrollWidth > window.innerWidth,
        panelOutside: panels.some((panel) => {
          const box = panel.getBoundingClientRect();
          return box.left < mainBox.left || box.right > mainBox.right + 1;
        }),
      };
    });
    expect(overflow.documentOverflow).toBe(false);
    expect(overflow.panelOutside).toBe(false);
  }
});

test('search, category filtering, empty results and Back work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Find an app' });
  await search.fill('jelly');
  await expect(page.locator('.library-grid [data-app-id]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Open Jellyfin', exact: true })).toBeVisible();
  await search.fill('nothing matches');
  await expect(page.getByRole('heading', { name: 'Nothing here. Yet.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('');
  await page.getByRole('button', { name: 'Music', exact: true }).click();
  await expect(page.locator('.library-grid [data-app-id]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Open Spotify', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Favorites', exact: true })).toBeVisible();
});

test('the packaged file app loads offline with CSP, local fonts, no module fetches and no remote requests', async ({
  page,
}, info) => {
  const errors: string[] = [];
  const remote: string[] = [];
  const failed: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) remote.push(request.url());
  });
  page.on('requestfailed', (request) => failed.push(request.url()));
  await page.goto(pathToFileURL(path.resolve('dist/app/index.html')).href);
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeVisible();
  await expect(page.locator('.header-time')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeFocused();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Luma Sans"'))).toBe(true);
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await expect(page.locator('.library-grid .brand-logo')).toHaveCount(9);
  await expect
    .poll(() =>
      page
        .locator('.library-grid .brand-logo')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Inputs', exact: true }).click();
  await expect(page.getByRole('button', { name: /PlayStation 5/ })).toBeVisible();
  await page.screenshot({ path: info.outputPath('luma-inputs.png') });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const thumbnails = await page.locator('.wallpaper-thumbnail > img').evaluateAll((nodes) =>
    Promise.all(
      nodes.map(async (node) => {
        const image = node as HTMLImageElement;
        await image.decode();
        return { src: image.src, width: image.naturalWidth, height: image.naturalHeight };
      }),
    ),
  );
  expect(thumbnails).toHaveLength(12);
  const photos = thumbnails.filter((image) => image.src.endsWith('.jpg'));
  expect(photos).toHaveLength(9);
  for (const photo of photos) {
    expect(photo.src).toContain('/wallpaper-thumbnails/');
    expect([photo.width, photo.height]).toEqual([480, 270]);
  }
  expect(remote).toEqual([]);
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});

async function installMockTV(
  page: Page,
  denied: boolean,
  apps = [{ id: 'com.example.real', title: 'A real TV app', visible: true }],
  devices = [
    { appId: 'com.webos.app.hdmi2', id: 'HDMI_2', port: 2, label: 'Real HDMI', connected: true },
  ],
  // Netflix discovery groups; without them the service answers with an error.
  netflixGroups?: unknown[],
) {
  const manifest = JSON.parse(readFileSync(path.resolve('appinfo.json'), 'utf8'));
  await page.addInitScript(
    ({ denied, requiredACG, apps, devices, netflixGroups }) => {
      const w = window as typeof window & { __calls: { uri: string; payload: any }[] };
      w.__calls = [];
      w.PalmSystem = { identifier: 'com.luma.launcher' };
      w.PalmServiceBridge = class {
        onservicecallback = (_raw: string) => {};
        cancel() {}
        call(uri: string, raw: string) {
          const payload = JSON.parse(raw);
          w.__calls.push({ uri, payload });
          let response: any;
          if (uri.includes('/exec')) {
            if (denied)
              response = { returnValue: false, errorText: 'Mock: service is not elevated.' };
            // Model Homebrew 0.8.0-rc1's webOS 26 access group. The real-inventory
            // test must fail when the packaged caller forgets this permission.
            else if (!requiredACG.includes('lunabus.query'))
              response = {
                returnValue: false,
                errorCode: -1,
                errorText: 'Denied method call "exec" for category "/"',
              };
            else
              response = {
                returnValue: true,
                stdoutString: JSON.stringify(
                  payload.command.includes('netflix.service/discovery')
                    ? netflixGroups
                      ? { returnValue: true, data: { discovery: { groups: netflixGroups } } }
                      : { returnValue: false, errorText: 'Service does not exist' }
                    : payload.command.includes('contentminer')
                      ? // Shaped like webOS 10's contentminer: a title row, then content.
                        payload.command.includes('"appId":"youtube.leanback.v4"')
                        ? {
                            returnValue: true,
                            contents: [
                              { type: 'title', titleText: '', onClick: { contentId: '' } },
                              ...['aaaaaaaaaaa', 'bbbbbbbbbbb'].map((id, index) => ({
                                type: 'content',
                                titleText: `Published video ${index + 1}`,
                                category: '',
                                image: { url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` },
                                image_4k: { url: '' },
                                onClick: {
                                  contentId: `v=${id}&launch=launcher&shelf=1`,
                                  launchParam: null,
                                  targetAppId: 'youtube.leanback.v4',
                                },
                              })),
                            ],
                          }
                        : {
                            returnValue: false,
                            errorText: 'Contents for this app are unsupported',
                          }
                      : payload.command.includes('listApps')
                        ? {
                            returnValue: true,
                            apps,
                          }
                        : {
                            returnValue: true,
                            devices,
                          },
                ),
              };
          } else if (uri.includes('getAppLoadStatus'))
            response = { returnValue: true, exist: true };
          else response = { returnValue: true };
          setTimeout(() => this.onservicecallback(JSON.stringify(response)), 10);
        }
      };
    },
    { denied, requiredACG: manifest.requiredACG as string[], apps, devices, netflixGroups },
  );
}

test('a TV uses its real inventory and launches TV settings separately from Luma settings', async ({
  page,
}) => {
  await installMockTV(page, false);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open A real TV app', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toHaveCount(0);
  await expect(page.getByText('Desktop preview', { exact: true })).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__calls.filter((call: any) => call.uri.endsWith('/launch')).length,
      ),
    )
    .toBe(1);
  const launches = await page.evaluate(() =>
    (window as any).__calls.filter((call: any) => call.uri.endsWith('/launch')),
  );
  expect(launches[0].payload).toEqual({ id: 'com.example.real' });
  await expect(page.getByRole('status')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'TV settings', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__calls
          .filter((call: any) => call.uri.endsWith('/launch'))
          .map((call: any) => call.payload.id),
      ),
    )
    .toEqual(['com.example.real', 'com.palm.app.settings']);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settingsPage = page.getByRole('region', { name: 'Luma settings', exact: true });
  await expect(settingsPage).toBeVisible();
  await expect(settingsPage.getByRole('button', { name: 'TV settings', exact: true })).toHaveCount(
    0,
  );
});

test('home mode starts the TV watcher and keeps Back inside Luma', async ({ page }) => {
  await installMockTV(page, false);
  await page.addInitScript(() => {
    const w = window as any;
    w.__backs = 0;
    w.PalmSystem.platformBack = () => w.__backs++;
  });
  const homeWatch = () =>
    page.evaluate(() =>
      (window as any).__calls
        .filter((call: any) => call.payload.command?.includes('home-watch.sh'))
        .map((call: any) => call.payload.command.split(' ').pop()),
    );
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open A real TV app', exact: true })).toBeVisible();
  expect(await homeWatch()).toEqual([]);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as any).__backs)).toBe(1);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const toggle = page.getByRole('switch', { name: /Use Luma as home/ });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect.poll(homeWatch).toEqual(['enable']);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Favorites', exact: true })).toBeVisible();
  // Back on Home rests on the ambient clock; Back again returns Home.
  await page.keyboard.press('Escape');
  await expect(page.locator('.ambient-screen')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ambient-screen')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open A real TV app', exact: true })).toBeFocused();
  expect(await page.evaluate(() => (window as any).__backs)).toBe(1);

  // The watcher is restarted at launch in case the TV rebooted without it.
  await page.reload();
  await expect.poll(homeWatch).toEqual(['enable']);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect.poll(homeWatch).toEqual(['enable', 'disable']);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as any).__backs)).toBe(1);
});

test('a TV start saves the inventory and shows it at once on the next start', async ({ page }) => {
  await installMockTV(page, false);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open A real TV app', exact: true })).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('luma.inventory.v1') ?? 'null'),
  );
  expect(saved.apps.map((app: { id: string }) => app.id)).toEqual(['com.example.real']);
  expect(saved.inputs.map((input: { title: string }) => input.title)).toEqual(['Real HDMI']);
});

test('a saved inventory stays usable when the live TV inventory fails', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'luma.inventory.v1',
      JSON.stringify({
        apps: [{ id: 'com.example.saved', title: 'A saved TV app' }],
        inputs: [],
      }),
    ),
  );
  await installMockTV(page, true);
  await page.goto('/');
  const saved = page.getByRole('button', { name: 'Open A saved TV app', exact: true });
  await expect(saved).toBeVisible();
  await expect(saved).toBeFocused();
  await expect(page.getByText(/Mock: service is not elevated/)).toBeVisible();
  await expect(page.locator('.skeleton')).toHaveCount(0);
});

test('TV inventory failure is actionable and never becomes a pretend desktop inventory', async ({
  page,
}) => {
  await installMockTV(page, true);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A little help from your TV.' })).toBeVisible();
  await expect(page.getByText(/Mock: service is not elevated/)).toBeVisible();
  await expect(page.locator('[data-app-id]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again', exact: false })).toBeVisible();
});

test('mobile preview remains usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Find an app' })).toBeVisible();
  const navigation = await page.getByRole('navigation', { name: 'Main navigation' }).boundingBox();
  const tvSettings = await page
    .getByRole('button', { name: 'TV settings', exact: true })
    .boundingBox();
  expect(navigation!.y).toBeGreaterThan(tvSettings!.y + tvSettings!.height);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Luma settings', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('ambient mode wakes without launching an app and restores remote focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter ambient mode' }).click();
  await expect(page.getByRole('button', { name: 'Return to Luma' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('one persistent navigation pill slides with native CSS and follows remote input and resizing', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const pill = page.locator('.nav-indicator');
  await pill.evaluate((element) => {
    (window as any).__navigationPill = element;
    (window as any).__navigationTransitions = [];
    element.addEventListener('transitionrun', (event) => {
      (window as any).__navigationTransitions.push((event as TransitionEvent).propertyName);
    });
  });
  const expectAligned = async () => {
    await expect
      .poll(() =>
        pill.evaluate((element) => {
          const actual = element.getBoundingClientRect();
          const selected = document.querySelector('.nav-item.active')!.getBoundingClientRect();
          return Math.max(
            Math.abs(actual.x - selected.x),
            Math.abs(actual.y - selected.y),
            Math.abs(actual.width - selected.width),
            Math.abs(actual.height - selected.height),
          );
        }),
      )
      .toBeLessThan(1.5);
  };
  await expectAligned();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expectAligned();
  expect(await pill.evaluate((element) => element === (window as any).__navigationPill)).toBe(true);
  const transitions = await page.evaluate(
    () => (window as any).__navigationTransitions as string[],
  );
  expect(transitions).toContain('transform');
  expect(transitions).toContain('width');
  await page.keyboard.press('ArrowLeft');
  const inputs = page.getByRole('button', { name: 'Inputs', exact: true });
  await expect(inputs).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(inputs).toHaveAttribute('aria-current', 'page');
  await expectAligned();
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expectAligned();
  await expect(pill).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectAligned();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expectAligned();
});

test('navigation pill respects saved and system reduced-motion preferences', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  const home = page.getByRole('button', { name: 'Home', exact: true });
  const motion = page.getByRole('switch', { name: 'Reduced motion', exact: true });
  const pill = page.locator('.nav-indicator');
  await settings.click();
  await motion.click();
  await home.click();
  expect(await pill.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
  expect(await pill.evaluate((element) => element.getAnimations().length)).toBe(0);
  await settings.click();
  await motion.click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await home.click();
  expect(await pill.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
  expect(await pill.evaluate((element) => element.getAnimations().length)).toBe(0);
});

test('card focus stays the same size and navigation outlines have room beside the selected pill', async ({
  page,
}) => {
  await page.goto('/');
  const netflix = page.getByRole('button', { name: 'Open Netflix', exact: true });
  await expect(netflix).toBeFocused();
  const initial = await netflix.locator('.app-face').boundingBox();
  await page.keyboard.press('ArrowRight');
  const next = await netflix.locator('.app-face').boundingBox();
  expect(next!.width).toBe(initial!.width);
  expect(next!.height).toBe(initial!.height);
  expect(
    await netflix.locator('.app-face').evaluate((element) => getComputedStyle(element).transform),
  ).toBe('none');
  await page.getByRole('button', { name: 'Home', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Apps', exact: true })).toBeFocused();
  const gap = await page.evaluate(() => {
    const selected = document.querySelector<HTMLElement>('.nav-item.active')!;
    const focused = document.activeElement as HTMLElement;
    const styles = getComputedStyle(focused);
    return {
      available: focused.getBoundingClientRect().left - selected.getBoundingClientRect().right,
      required: parseFloat(styles.outlineWidth) + parseFloat(styles.outlineOffset),
    };
  });
  expect(gap.available).toBeGreaterThan(gap.required);
});

test('compact library filters can reset, long names wrap, and inputs stay compact', async ({
  page,
}) => {
  await installMockTV(page, false, [
    { id: 'com.webos.app.lgchannels', title: 'LG Channels', visible: true },
    {
      id: 'com.example.long',
      title: 'An application with a much longer name that should remain completely readable',
      visible: true,
    },
  ]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  const label = page
    .locator('.library-grid .app-label')
    .filter({ hasText: 'An application with a much longer name' });
  const dimensions = await label.evaluate((element) => ({
    width: element.clientWidth,
    scrollWidth: element.scrollWidth,
    height: element.clientHeight,
    scrollHeight: element.scrollHeight,
    whiteSpace: getComputedStyle(element).whiteSpace,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.height);
  expect(dimensions.whiteSpace).toBe('normal');
  await expect(page.getByRole('button', { name: 'Open LG Channels', exact: true })).toBeVisible();
  const toolbar = await page.locator('.library-toolbar').boundingBox();
  const search = await page.getByRole('searchbox', { name: 'Find an app' }).boundingBox();
  expect(search!.y).toBeLessThan(toolbar!.y + toolbar!.height);
  await page.getByRole('button', { name: 'Music', exact: true }).click();
  await expect(page.locator('.library-grid [data-app-id]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Music', exact: true }).click();
  await expect(page.locator('.library-grid [data-app-id]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Inputs', exact: true }).click();
  const input = await page.locator('.full-input-grid .input-card').first().boundingBox();
  expect(input!.height).toBeLessThan(140);
  expect(input!.y).toBeLessThan(250);
});

test('connection artwork follows the reported device labels without changing the input target', async ({
  page,
}) => {
  await installMockTV(page, false, undefined, [
    {
      appId: 'com.webos.app.hdmi1',
      id: 'HDMI_1',
      port: 1,
      label: 'PlayStation 5',
      connected: true,
    },
    { appId: 'com.webos.app.hdmi2', id: 'HDMI_2', port: 2, label: 'USB media', connected: true },
    { appId: 'com.webos.app.hdmi3', id: 'HDMI_3', port: 3, label: 'HDMI 3', connected: true },
    { appId: 'com.webos.app.hdmi4', id: 'HDMI_4', port: 4, label: 'Apple TV', connected: true },
    {
      appId: 'com.webos.app.hdmi5',
      id: 'HDMI_5',
      port: 5,
      label: 'Xuper',
      connected: true,
      spdVendorName: 'Amlogic',
      subList: [{ id: 'SIMPLINK', osdName: 'Xuper', cecpDevType: 4 }],
    },
    { appId: 'com.webos.app.hdmi6', id: 'HDMI_6', port: 6, label: 'Den box', connected: true },
  ] as any[]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Inputs', exact: true }).click();
  const playstation = page.locator('[data-focusable="input-com.webos.app.hdmi1"]');
  await expect(playstation.locator('[data-connection-icon="playstation"]')).toBeVisible();
  await expect(
    page.locator('[data-focusable="input-com.webos.app.hdmi2"] [data-connection-icon="usb"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-focusable="input-com.webos.app.hdmi3"] [data-connection-icon="hdmi"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-focusable="input-com.webos.app.hdmi5"] [data-connection-icon="streamer"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-focusable="input-com.webos.app.hdmi6"] [data-connection-icon="device"]'),
  ).toBeVisible();
  const appleTV = page.locator('[data-focusable="input-com.webos.app.hdmi4"]');
  await expect(appleTV.locator('[data-connection-icon="apple-tv"]')).toBeVisible();
  await playstation.click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__calls
          .filter((call: any) => call.uri.endsWith('/launch'))
          .map((call: any) => call.payload.id),
      ),
    )
    .toEqual(['com.webos.app.hdmi1']);
  await expect(page.getByRole('status')).toHaveCount(0);
  await appleTV.click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__calls
          .filter((call: any) => call.uri.endsWith('/launch'))
          .map((call: any) => call.payload.id),
      ),
    )
    .toEqual(['com.webos.app.hdmi1', 'com.webos.app.hdmi4']);
});

test('Home favorites move inline with hold OK and left/right, and Back keeps the order', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeFocused();
  await page.keyboard.down('Enter');
  await page.waitForTimeout(700);
  await page.keyboard.up('Enter');
  const moving = page.getByRole('button', { name: 'Move Netflix', exact: true });
  await expect(moving).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() =>
      page
        .locator('.favorites-grid [data-app-id]')
        .evaluateAll((nodes) =>
          nodes.slice(0, 2).map((node) => (node as HTMLElement).dataset.appId),
        ),
    )
    .toEqual(['youtube.leanback.v4', 'netflix']);
  await expect(moving).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.toast')).toHaveCount(0);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeFocused();
  await expect(page.locator('.favorites-grid.is-reordering')).toHaveCount(0);
  await page.reload();
  await expect
    .poll(() =>
      page
        .locator('.favorites-grid [data-app-id]')
        .evaluateAll((nodes) =>
          nodes.slice(0, 2).map((node) => (node as HTMLElement).dataset.appId),
        ),
    )
    .toEqual(['youtube.leanback.v4', 'netflix']);
  await page.getByRole('button', { name: 'Open Netflix', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Desktop preview');
});

test('moving up to the Apps categories restores the complete top of the scroller', async ({
  page,
}) => {
  const apps = Array.from({ length: 36 }, (_, index) => ({
    id: `com.example.scroll${index + 1}`,
    title: `App ${String(index + 1).padStart(2, '0')}`,
    visible: true,
  }));
  await installMockTV(page, false, apps);
  await page.goto('/');
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await page.getByRole('button', { name: 'Open App 08', exact: true }).focus();
  await page.locator('main').evaluate((main) => main.scrollTo({ top: 200, behavior: 'instant' }));
  await expect.poll(() => page.locator('main').evaluate((main) => main.scrollTop)).toBe(200);
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('button', { name: 'Open App 02', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('button', { name: 'Utilities', exact: true })).toBeFocused();
  await expect.poll(() => page.locator('main').evaluate((main) => main.scrollTop)).toBe(0);
});

test('Home card captions are opt-in, persist, and do not affect library captions', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeFocused();
  await expect(page.locator('.favorites-grid .app-label').first()).toBeHidden();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const names = page.getByRole('switch', { name: 'Show app names on Home', exact: true });
  await expect(names).toHaveAttribute('aria-checked', 'false');
  await names.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.favorites-grid .app-label').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('.favorites-grid .app-label').first()).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(names).toHaveAttribute('aria-checked', 'true');
  await names.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.favorites-grid .app-label').first()).toBeHidden();
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await expect(page.locator('.library-grid .app-label').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('.favorites-grid .app-label').first()).toBeHidden();
});

test('repeated remote moves reuse geometry instead of measuring the whole library', async ({
  page,
}) => {
  await installMockTV(
    page,
    false,
    Array.from({ length: 120 }, (_, index) => ({
      id: `com.example.fast${index}`,
      title: `App ${String(index + 1).padStart(3, '0')}`,
      visible: true,
    })),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await expect(page.locator('.library-grid [data-app-id]')).toHaveCount(120);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.library-grid [data-app-id]').first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.evaluate(() => {
    const original = Element.prototype.getBoundingClientRect;
    (window as any).__layoutReads = 0;
    Element.prototype.getBoundingClientRect = function () {
      (window as any).__layoutReads++;
      return original.call(this);
    };
  });
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
  }
  await expect(page.locator('.library-grid [data-app-id]').first()).toBeFocused();
  expect(await page.evaluate(() => (window as any).__layoutReads)).toBeLessThan(400);
});

test('cached remote geometry follows disabled controls and resized grids', async ({ page }) => {
  await installMockTV(
    page,
    false,
    Array.from({ length: 36 }, (_, index) => ({
      id: `com.example.resize${index}`,
      title: `App ${String(index + 1).padStart(3, '0')}`,
      visible: true,
    })),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  const cards = page.locator('.library-grid [data-app-id]');
  await expect(cards).toHaveCount(36);
  await cards.first().focus();
  await page.keyboard.press('ArrowRight');
  await cards.first().focus();
  await cards.nth(1).evaluate((node) => ((node as HTMLButtonElement).disabled = true));
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(2)).toBeFocused();
  await cards.nth(1).evaluate((node) => ((node as HTMLButtonElement).disabled = false));
  await cards.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(1)).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await cards.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(3)).toBeFocused();
});

test('clock advances at the minute boundary without re-sorting the app library', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-20T11:59:50') });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Good morning.', exact: true })).toBeVisible();
  await page.clock.fastForward(20000);
  await expect(page.getByRole('heading', { name: 'Good afternoon.', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await page.evaluate(() => {
    const original = String.prototype.localeCompare;
    (window as any).__sorts = 0;
    String.prototype.localeCompare = function (this: string, ...args: Parameters<typeof original>) {
      (window as any).__sorts++;
      return original.apply(this, args);
    };
  });
  await page.clock.fastForward(60000);
  await expect(page.locator('.header-time')).toContainText('12:01');
  expect(await page.evaluate(() => (window as any).__sorts)).toBe(0);
});

test('app-action highlight follows pointer and remote input, and hiding keeps focus nearby', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  const browser = page.getByRole('button', { name: 'Open Web Browser', exact: true });
  const neighbor = await browser.evaluate((node) => {
    const cards = [...document.querySelectorAll<HTMLElement>('.library-grid [data-app-id]')];
    const index = cards.indexOf(node as HTMLElement);
    return (cards[index + 1] ?? cards[index - 1]).dataset.focusable!;
  });
  await browser.hover();
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  const favorite = page.getByRole('button', { name: 'Add to favorites', exact: true });
  const hide = page.getByRole('button', { name: 'Hide app', exact: true });
  await expect(favorite).toBeFocused();
  const ring = await favorite.evaluate((node) => ({
    outline: getComputedStyle(node).outlineStyle,
    shadow: getComputedStyle(node).boxShadow,
  }));
  expect(ring.outline).toBe('none');
  expect(ring.shadow).toContain('inset');
  await hide.hover();
  await expect(hide).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(favorite).toBeFocused();
  expect(
    await page
      .locator('.app-actions .setting-row')
      .evaluateAll(
        (nodes) => nodes.filter((node) => getComputedStyle(node).boxShadow !== 'none').length,
      ),
  ).toBe(1);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(browser).toHaveCount(0);
  const next = page.locator(`[data-focusable="${neighbor}"]`);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(next).toBeFocused();
  await page.keyboard.press('m');
  const close = page.getByRole('button', { name: 'Close', exact: true });
  await close.hover();
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(next).toBeFocused();
});

test('app actions close immediately, keep favorites first, and filter hidden apps in the pills', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  const browser = page.getByRole('button', { name: 'Open Web Browser', exact: true });
  await browser.focus();
  await page.keyboard.press('m');
  const favorite = page.getByRole('button', { name: 'Add to favorites', exact: true });
  await expect(favorite).toBeFocused();
  await expect(page.getByRole('dialog').locator('img')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(browser).toBeFocused();
  const readFavoriteOrder = () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem('luma.preferences.v1')!).favorites as string[],
    );
  const readLibraryOrder = () =>
    page
      .locator('.library-grid [data-app-id]')
      .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.appId));
  let favorites = await readFavoriteOrder();
  expect((await readLibraryOrder()).slice(0, favorites.length)).toEqual(favorites);
  await expect(browser.locator('.favorite-badge')).toBeVisible();
  await page.keyboard.press('m');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: 'Hide app', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(browser).toHaveCount(0);
  await page
    .locator('.filter-tabs')
    .getByRole('button', { name: 'Hidden (1)', exact: true })
    .click();
  await expect(page.locator('.library-grid [data-app-id]')).toHaveCount(1);
  await browser.focus();
  await page.keyboard.press('m');
  await page.getByRole('button', { name: 'Show app', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hidden (1)', exact: true })).toHaveCount(0);
  await expect(browser).toBeVisible();
  favorites = await readFavoriteOrder();
  expect((await readLibraryOrder()).slice(0, favorites.length)).toEqual(favorites);
  await browser.focus();
  await page.keyboard.press('m');
  await expect(
    page.getByRole('button', { name: 'Remove from favorites', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(browser.locator('.favorite-badge')).toHaveCount(0);
  favorites = await readFavoriteOrder();
  expect((await readLibraryOrder()).slice(0, favorites.length)).toEqual(favorites);
});

test('idle Luma rests on the ambient clock, then a city video, and any key returns', async ({
  page,
}) => {
  await page.clock.install();
  await page.route('**/weather-videos/other/*.mp4', () => undefined);
  await page.goto('/');
  const netflix = page.getByRole('button', { name: 'Open Netflix', exact: true });
  await expect(netflix).toBeFocused();
  await page.clock.fastForward('01:50');
  await expect(page.locator('.ambient-screen')).toHaveCount(0);
  await page.clock.fastForward('00:15');
  await expect(page.locator('.ambient-screen')).toBeVisible();
  await expect(page.locator('.is-screensaver')).toHaveCount(0);
  await page.clock.fastForward('05:05');
  await expect(page.locator('.is-screensaver')).toHaveCount(1);
  await expect(page.locator('.background-video')).toHaveAttribute(
    'src',
    /^\.\/weather-videos\/other\/(china|la|sfo)\.mp4$/,
  );
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.ambient-screen')).toHaveCount(0);
  await expect(page.locator('.is-screensaver')).toHaveCount(0);
  await expect(page.locator('.background-video')).toHaveCount(0);
  await expect(netflix).toBeFocused();

  // Activity and typing keep Luma awake.
  await page.clock.fastForward('01:30');
  await page.keyboard.press('ArrowRight');
  await page.clock.fastForward('01:30');
  await expect(page.locator('.ambient-screen')).toHaveCount(0);
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await page.getByRole('searchbox').focus();
  await page.clock.fastForward('03:00');
  await expect(page.locator('.ambient-screen')).toHaveCount(0);
});

test('a focused favorite with highlights opens its preview shelf under a lifted greeting', async ({
  page,
}) => {
  await page.route('https://i.ytimg.com/**', (route) => route.fulfill({ status: 404 }));
  await page.goto('/');
  const netflix = page.getByRole('button', { name: 'Open Netflix', exact: true });
  const youtube = page.locator('[data-focusable="favorite-youtube.leanback.v4"]');
  const shelf = page.locator('.preview-shelf.is-open');
  const hero = page.locator('.hero');
  const focused = page.locator(':focus');
  await expect(netflix).toBeFocused();
  await expect(shelf).toHaveCount(0);
  const favoritesTop = () =>
    page.locator('.favorites-section').evaluate((node) => node.getBoundingClientRect().top);
  const restingTop = await favoritesTop();

  await page.keyboard.press('ArrowRight');
  await expect(youtube).toBeFocused();
  await expect(shelf).toBeVisible();
  await expect(hero).toHaveClass(/has-shelf/);
  // Long titles stay inside their card, ending in an ellipsis.
  const overflow = await page.locator('.preview-card').evaluateAll((cards) =>
    cards.map((card) => {
      const title = card.querySelector('.preview-title') as HTMLElement;
      return title.getBoundingClientRect().right - card.getBoundingClientRect().right;
    }),
  );
  expect(Math.max(...overflow)).toBeLessThanOrEqual(0.5);
  expect(
    await page
      .locator('.preview-title')
      .first()
      .evaluate((title) => title.scrollWidth > title.clientWidth),
  ).toBe(true);
  // The greeting stays readable above the shelf instead of being replaced.
  await expect(page.locator('#greeting')).toBeVisible();

  // Up enters the shelf; the row's ends hold focus; Down returns to the app.
  await page.keyboard.press('ArrowUp');
  await expect(focused).toHaveAttribute('data-focusable', /^preview-/);
  for (let index = 0; index < 10; index++) await page.keyboard.press('ArrowRight');
  await expect(focused).toHaveAttribute('data-focusable', 'preview-dQw4w9WgXcQ');
  for (let index = 0; index < 10; index++) await page.keyboard.press('ArrowLeft');
  await expect(focused).toHaveAttribute('data-focusable', 'preview-kJQP7kiw5Fk');
  await expect(shelf).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(youtube).toBeFocused();

  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('YouTube · ');

  // Back closes the shelf, returns to the app, and keeps it closed until focus moves on.
  await page.keyboard.press('Escape');
  await expect(youtube).toBeFocused();
  await expect(shelf).toHaveCount(0);
  await expect(hero).not.toHaveClass(/has-shelf/);
  await page.waitForTimeout(500);
  await expect(shelf).toHaveCount(0);
  // After its fade-out, a closed shelf leaves no hidden copy on the page.
  await expect(page.locator('.preview-shelf')).toHaveCount(0);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await expect(shelf).toBeVisible();

  // Settings → Interface → Previews on Home: the master switch, then one switch per app.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const row = page.locator('[data-focusable="setting-previews"]');
  await expect(row).toContainText('2 of 2 on');
  await row.focus();
  await page.keyboard.press('Enter');
  const panel = page.getByRole('dialog', { name: 'Previews on Home' });
  const all = panel.getByRole('switch', { name: 'Show app previews on Home', exact: true });
  const youtubeSwitch = panel.getByRole('switch', { name: 'YouTube', exact: true });
  await expect(all).toBeFocused();
  await expect(panel.getByRole('switch')).toHaveCount(3);
  // Only YouTube's shelf turns off; Back closes the panel and stays in Settings.
  await youtubeSwitch.click();
  await expect(youtubeSwitch).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(row).toBeFocused();
  await expect(row).toContainText('1 of 2 on');
  await page.keyboard.press('Escape');
  await expect(netflix).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(youtube).toBeFocused();
  await page.waitForTimeout(500);
  await expect(shelf).toHaveCount(0);
  await page.reload();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  await expect(shelf).toHaveCount(0);

  // The master switch turns every shelf off and keeps each app's own choice.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await row.focus();
  await page.keyboard.press('Enter');
  await youtubeSwitch.click();
  await all.click();
  await expect(all).toHaveAttribute('aria-checked', 'false');
  await expect(youtubeSwitch).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(row).toContainText('Off');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  await expect(shelf).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await row.focus();
  await page.keyboard.press('Enter');
  await all.click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowRight');
  await expect(youtube).toBeFocused();
  await expect(shelf).toBeVisible();

  // Apps without highlights keep the greeting, and the favorites never move.
  await page.keyboard.press('ArrowLeft');
  await expect(netflix).toBeFocused();
  await expect(shelf).toHaveCount(0);
  expect(await favoritesTop()).toBe(restingTop);
});

test('the menu can switch from text labels to round icon buttons', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation.getByText('Apps', { exact: true })).toBeVisible();
  await expect(navigation.locator('svg')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const labels = page.getByRole('switch', { name: 'Menu with labels', exact: true });
  await expect(labels).toHaveAttribute('aria-checked', 'true');
  await labels.click();
  await expect(labels).toHaveAttribute('aria-checked', 'false');
  await expect(navigation).toHaveClass(/is-icons/);
  await expect(navigation.locator('svg')).toHaveCount(4);
  await expect(navigation.getByText('Apps', { exact: true })).toHaveCount(0);
  // The icon buttons keep their names, page state, and remote routes.
  const settings = navigation.getByRole('button', { name: 'Settings', exact: true });
  await expect(settings).toHaveAttribute('aria-current', 'page');
  await settings.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(navigation.getByRole('button', { name: 'Inputs', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(navigation.getByRole('button', { name: 'Inputs', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.reload();
  await expect(navigation).toHaveClass(/is-icons/);
  await navigation.getByRole('button', { name: 'Settings', exact: true }).click();
  await labels.click();
  await expect(navigation).not.toHaveClass(/is-icons/);
  await expect(navigation.getByText('Apps', { exact: true })).toBeVisible();
});

test('on the TV, shelves show the content apps publish to webOS and open it directly', async ({
  page,
}) => {
  await page.route('https://i.ytimg.com/**', (route) => route.fulfill({ status: 404 }));
  await installMockTV(page, false, [
    { id: 'netflix', title: 'Netflix', visible: true },
    { id: 'youtube.leanback.v4', title: 'YouTube', visible: true },
  ]);
  await page.goto('/');
  const netflix = page.getByRole('button', { name: 'Open Netflix', exact: true });
  await expect(netflix).toBeFocused();
  // Favorites' shelves were requested in the background, without any focus: Netflix
  // through its own discovery service, YouTube through webOS's published content.
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__calls
          .map((call: any) => call.payload.command ?? '')
          .filter((command: string) => /contentminer|netflix\.service/.test(command))
          .map((command: string) =>
            command.includes('netflix.service/discovery')
              ? 'netflix discovery'
              : /"appId":"([^"]+)"/.exec(command)![1],
          ),
      ),
    )
    .toEqual(['netflix discovery', 'youtube.leanback.v4']);
  // Netflix's discovery service is unavailable here, so it keeps the greeting.
  await page.waitForTimeout(500);
  await expect(page.locator('.preview-shelf.is-open')).toHaveCount(0);

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.preview-shelf.is-open')).toBeVisible();
  await expect(page.locator('.preview-card')).toHaveCount(2);
  await expect(page.locator('.preview-title').first()).toHaveText('Published video 1');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__calls
          .filter((call: any) => call.uri.endsWith('/launch'))
          .map((call: any) => call.payload),
      ),
    )
    .toEqual([
      {
        id: 'youtube.leanback.v4',
        params: { contentTarget: 'v=bbbbbbbbbbb&launch=launcher&shelf=1' },
      },
    ]);
});

test("Netflix's shelf shows Continue Watching first and resumes a title directly", async ({
  page,
}) => {
  await page.route('https://*.nflxso.net/**', (route) => route.fulfill({ status: 404 }));
  const tile = (title: string, movie: string, context: string) => ({
    title,
    deepLink: `expireAt=1792728398&listContext=${context}&m=${movie}&source_type=27`,
    images: { tile: { url: `https://occ-0.nflxso.net/${movie}.jpg`, width: 390, height: 219 } },
  });
  await installMockTV(
    page,
    false,
    [{ id: 'netflix', title: 'Netflix', visible: true }],
    undefined,
    [
      {
        title: 'Continue watching for Mario',
        tiles: [tile('A family', '70143859', 'continueWatching')],
      },
      {
        title: "Today's picks",
        tiles: [
          tile('A family', '70143859', 'trendingNow'),
          tile('A thriller', '81726799', 'trendingNow'),
        ],
      },
    ],
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeFocused();
  await expect(page.locator('.preview-shelf.is-open')).toBeVisible();
  // Continue Watching leads, and a title in both rows appears once.
  await expect(page.locator('.preview-title')).toHaveText(['A family', 'A thriller']);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__calls
          .filter((call: any) => call.uri.endsWith('/launch'))
          .map((call: any) => call.payload),
      ),
    )
    .toEqual([
      {
        id: 'netflix',
        params: {
          contentTarget:
            'expireAt=1792728398&listContext=continueWatching&m=70143859&source_type=27',
        },
      },
    ]);
});

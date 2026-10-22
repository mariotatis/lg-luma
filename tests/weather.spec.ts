import { test, expect } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const location = {
  name: 'Vienna',
  region: 'State of Vienna',
  country: 'Austria',
  latitude: 48.20849,
  longitude: 16.37208,
};

test('choose a city, show its weather, reuse cached data, and disable weather', async ({
  page,
}) => {
  let forecasts = 0;
  await page.route('https://geocoding-api.open-meteo.com/**', async (route) => {
    expect(new URL(route.request().url()).searchParams.get('name')).toBe('Vienna');
    await route.fulfill({ json: { results: [{ ...location, admin1: location.region }] } });
  });
  await page.route('https://api.open-meteo.com/**', async (route) => {
    forecasts++;
    expect(new URL(route.request().url()).searchParams.get('latitude')).toBe(
      String(location.latitude),
    );
    await route.fulfill({
      json: { current: { temperature_2m: 14.2, weather_code: 2, is_day: 1 } },
    });
  });
  await page.goto('/');
  expect(forecasts).toBe(0);
  await page.getByRole('button', { name: 'Set weather location', exact: true }).click();
  await page.getByRole('searchbox', { name: 'City or postcode' }).fill('Vienna');
  await page.getByRole('button', { name: 'Search locations', exact: true }).click();
  await page.locator('.location-results button').click();
  await expect(page.locator('.saved-location')).toContainText('Vienna');
  await page.keyboard.press('Escape');
  await expect(page.locator('.weather-summary')).toContainText('Vienna');
  await expect(page.locator('.weather-summary')).toContainText('14°C');
  await expect(page.locator('.weather-summary')).toContainText('Partly cloudy');
  await page.reload();
  await expect(page.locator('.weather-summary')).toContainText('14°C');
  expect(forecasts).toBe(1);
  await page.getByRole('button', { name: 'Enter ambient mode' }).click();
  await expect(page.locator('.ambient-hint')).toContainText('Vienna');
  await expect(page.locator('.ambient-hint')).toContainText('14°C');
  await expect(page.locator('.ambient-screen button')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeFocused();
  expect(forecasts).toBe(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const clearLocation = page.getByRole('button', { name: 'Remove weather location' });
  await clearLocation.focus();
  await page.keyboard.press('ArrowRight');
  await clearLocation.focus();
  const focusStyle = await clearLocation.evaluate((element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      width: box.width,
      height: box.height,
      shadow: style.boxShadow,
      outline: style.outlineStyle,
      radius: style.borderRadius,
    };
  });
  expect(focusStyle.width).toBe(focusStyle.height);
  expect(focusStyle.shadow).not.toBe('none');
  expect(focusStyle.outline).toBe('none');
  expect(focusStyle.radius).toBe('50%');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Search locations', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Set weather location', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Set weather location', exact: true }),
  ).toBeVisible();
  expect(forecasts).toBe(1);
});

test('temperature units persist, work with the remote, and convert cached readings on Home and ambient', async ({
  page,
}) => {
  let requests = 0;
  await page.addInitScript((location) => {
    if (!localStorage.getItem('luma.preferences.v1'))
      localStorage.setItem(
        'luma.preferences.v1',
        JSON.stringify({ version: 1, weatherLocation: location }),
      );
  }, location);
  await page.route('https://api.open-meteo.com/**', (route) => {
    requests++;
    expect(new URL(route.request().url()).searchParams.get('temperature_unit')).toBe('celsius');
    return route.fulfill({
      json: { current: { temperature_2m: 14.2, weather_code: 2, is_day: 1 } },
    });
  });
  await page.goto('/');
  await expect(page.locator('.weather-temperature')).toHaveText('14°C');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const celsius = page.getByRole('button', { name: 'Celsius', exact: true });
  const fahrenheit = page.getByRole('button', { name: 'Fahrenheit', exact: true });
  await expect(celsius).toHaveAttribute('aria-pressed', 'true');
  const savedWeather = page.locator('.saved-location-weather');
  await expect(savedWeather).toContainText('14°C');
  await expect(savedWeather).toContainText('Partly cloudy');
  const visibility = page.getByRole('switch', { name: 'Show widget', exact: true });
  const dynamicBackground = page.getByRole('switch', { name: /Dynamic background/ });
  await visibility.focus();
  await page.keyboard.press('ArrowDown');
  await expect(dynamicBackground).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(celsius).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(fahrenheit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(fahrenheit).toHaveAttribute('aria-pressed', 'true');
  await expect(celsius).toHaveAttribute('aria-pressed', 'false');
  await expect(savedWeather).toContainText('58°F');
  await page.keyboard.press('ArrowUp');
  await expect(dynamicBackground).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(visibility).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(fahrenheit).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.weather-temperature')).toHaveText('58°F');
  await page.reload();
  await expect(page.locator('.weather-temperature')).toHaveText('58°F');
  await page.getByRole('button', { name: 'Enter ambient mode' }).click();
  await expect(page.locator('.ambient-hint .weather-temperature')).toHaveText('58°F');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(fahrenheit).toHaveAttribute('aria-pressed', 'true');
  await fahrenheit.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(celsius).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.locator('.weather-temperature')).toHaveText('14°C');
  await page.reload();
  await expect(page.locator('.weather-temperature')).toHaveText('14°C');
  expect(requests).toBe(1);
});

test('a configured city with failed weather remains usable and shows an honest fallback', async ({
  page,
}) => {
  await page.addInitScript(
    (location) =>
      localStorage.setItem(
        'luma.preferences.v1',
        JSON.stringify({ version: 1, weatherLocation: location }),
      ),
    location,
  );
  await page.route('https://api.open-meteo.com/**', (route) => route.fulfill({ status: 503 }));
  await page.goto('/');
  await expect(page.locator('.weather-summary')).toContainText('Vienna');
  await expect(page.locator('.weather-summary')).toContainText('Weather unavailable');
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Open YouTube', exact: true })).toBeFocused();
});

test('packaged file weather works with the restricted CSP and no geolocation lookup', async ({
  page,
}) => {
  const remote: string[] = [];
  await page.addInitScript(
    (location) =>
      localStorage.setItem(
        'luma.preferences.v1',
        JSON.stringify({ version: 1, weatherLocation: location }),
      ),
    location,
  );
  page.on('request', (request) => {
    if (request.url().startsWith('https://')) remote.push(request.url());
  });
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: { current: { temperature_2m: 9.4, weather_code: 0, is_day: 0 } },
    }),
  );
  await page.goto(pathToFileURL(path.resolve('dist/app/index.html')).href);
  await expect(page.locator('.weather-summary')).toContainText('9°C');
  await expect(page.locator('.weather-summary')).toContainText('Clear night');
  expect(remote).toHaveLength(1);
  expect(new URL(remote[0]).hostname).toBe('api.open-meteo.com');
});

test('location search handles no matches and can be retried', async ({ page }) => {
  let requests = 0;
  await page.route('https://geocoding-api.open-meteo.com/**', (route) => {
    requests++;
    return route.fulfill({ json: { results: [] } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('searchbox', { name: 'City or postcode' }).fill('xx');
  await page.getByRole('button', { name: 'Search locations', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('No locations found');
  await page.getByRole('button', { name: 'Search locations', exact: true }).click();
  await expect.poll(() => requests).toBe(2);
});

test('weather visibility preserves the city and prevents requests when the widget is off', async ({
  page,
}) => {
  let requests = 0;
  await page.addInitScript(
    (location) =>
      localStorage.setItem(
        'luma.preferences.v1',
        JSON.stringify({ version: 1, weatherLocation: location, showWeather: false }),
      ),
    location,
  );
  await page.route('https://api.open-meteo.com/**', (route) => {
    requests++;
    return route.fulfill({ json: { current: { temperature_2m: 12, weather_code: 3, is_day: 1 } } });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeFocused();
  await expect(page.locator('.weather-summary')).toHaveCount(0);
  expect(requests).toBe(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const interfaceHeading = await page
    .getByRole('heading', { name: 'Interface', exact: true })
    .boundingBox();
  const weatherHeading = await page
    .getByRole('heading', { name: 'Weather', exact: true })
    .boundingBox();
  expect(interfaceHeading!.y).toBeLessThan(weatherHeading!.y);
  const toggle = page.getByRole('switch', { name: 'Show widget', exact: true });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('.saved-location')).toContainText('Vienna');
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.weather-summary')).toContainText('12°C');
  expect(requests).toBe(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await toggle.click();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open Netflix', exact: true })).toBeFocused();
  await expect(page.locator('.weather-summary')).toHaveCount(0);
  expect(requests).toBe(1);
  await page.getByRole('button', { name: 'Enter ambient mode' }).click();
  await expect(page.locator('.ambient-hint')).toHaveText('Press any button to return');
});

test('Back exits city editing before leaving Settings, including the TV Back key', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const field = page.getByRole('searchbox', { name: 'City or postcode' });
  const search = page.getByRole('button', { name: 'Search locations', exact: true });
  await field.fill('Berlin');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Luma settings', exact: true })).toBeVisible();
  await expect(field).toHaveValue('Berlin');
  await expect(search).toBeFocused();
  await field.focus();
  await field.dispatchEvent('keydown', { key: 'Unidentified', keyCode: 461, bubbles: true });
  await expect(page.getByRole('region', { name: 'Luma settings', exact: true })).toBeVisible();
  await expect(field).toHaveValue('Berlin');
  await expect(search).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Favorites', exact: true })).toBeVisible();
});

test('dynamic background plays the closest weather video and can be turned off', async ({
  page,
}) => {
  await page.addInitScript((location) => {
    if (!localStorage.getItem('luma.preferences.v1'))
      localStorage.setItem(
        'luma.preferences.v1',
        JSON.stringify({ version: 1, weatherLocation: location }),
      );
  }, location);
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: { utc_offset_seconds: 0, current: { temperature_2m: 8, weather_code: 63, is_day: 0 } },
    }),
  );
  const requested: string[] = [];
  await page.route('**/weather-videos/**/*.mp4', (route) => {
    const name = new URL(route.request().url()).pathname.split('/weather-videos/')[1];
    requested.push(name);
    // Leave the any-time rain video pending so it stays selected.
    if (name !== 'rain.mp4') return route.fulfill({ status: 404 });
  });
  await page.goto('/');
  await expect(page.locator('.weather-summary')).toContainText('8°C');
  await expect(page.locator('.background-video')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const toggle = page.getByRole('switch', { name: /Dynamic background/ });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.background-video')).toHaveAttribute(
    'src',
    './weather-videos/rain.mp4',
  );
  expect(requested[0]).toBe('night/rain-night.mp4');
  await page.reload();
  await expect(page.locator('.background-video')).toHaveCount(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await toggle.click();
  await expect(page.locator('.background-video')).toHaveCount(0);
});

test('video backgrounds play, persist, and show behind missing weather videos', async ({
  page,
}) => {
  await page.route('**/weather-videos/other/*.mp4', () => undefined);
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ json: { current: { temperature_2m: 20, weather_code: 0, is_day: 1 } } }),
  );
  await page.goto('/');
  await expect(page.locator('.background-video')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Dynamic background', exact: true }),
  ).toBeVisible();
  const la = page.getByRole('button', { name: 'Los Angeles', exact: true });
  await la.click();
  await expect(la).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.wallpaper')).toHaveClass(/wallpaper-la/);
  await expect(page.locator('.background-video')).toHaveAttribute(
    'src',
    './weather-videos/other/la.mp4',
  );
  await page.reload();
  await expect(page.locator('.background-video')).toHaveAttribute(
    'src',
    './weather-videos/other/la.mp4',
  );
  const paused = () =>
    page.locator('.background-video').evaluate((video: HTMLVideoElement) => video.paused);
  await expect.poll(paused).toBe(false);
  // Another app in front: stop decoding until Luma is visible again.
  const setHidden = (hidden: boolean) =>
    page.evaluate((value) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
  await setHidden(true);
  await expect.poll(paused).toBe(true);
  await setHidden(false);
  await expect.poll(paused).toBe(false);
  // Weather mode without a matching weather video keeps the selected video.
  await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem('luma.preferences.v1')!);
    localStorage.setItem(
      'luma.preferences.v1',
      JSON.stringify({
        ...value,
        dynamicBackground: true,
        weatherLocation: {
          name: 'Vienna',
          region: '',
          country: 'Austria',
          latitude: 48.2,
          longitude: 16.37,
        },
      }),
    );
  });
  await page.route('**/weather-videos/*.mp4', (route) => route.fulfill({ status: 404 }));
  await page.route('**/weather-videos/morning/*.mp4', (route) => route.fulfill({ status: 404 }));
  await page.route('**/weather-videos/evening/*.mp4', (route) => route.fulfill({ status: 404 }));
  await page.reload();
  await expect(page.locator('.weather-summary')).toContainText('20°C');
  await expect(page.locator('.background-video')).toHaveAttribute(
    'src',
    './weather-videos/other/la.mp4',
  );
});

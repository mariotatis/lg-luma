import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePreferences } from '../src/storage.ts';
import { parseWeather } from '../src/weather.ts';
import { dayPeriod, weatherScene, weatherVideoCandidates } from '../src/weather-scenes.ts';

// 2026-10-21 07:30 UTC.
const now = Date.UTC(2026, 9, 21, 7, 30);

test('dynamic background is off unless saved as enabled', () => {
  assert.equal(parsePreferences('{"version":1}').dynamicBackground, false);
  assert.equal(parsePreferences('{"version":1,"dynamicBackground":true}').dynamicBackground, true);
});

test('weather codes map to video scenes', () => {
  assert.equal(weatherScene(0), 'clear');
  assert.equal(weatherScene(2), 'partly-cloudy');
  assert.equal(weatherScene(3), 'cloudy');
  assert.equal(weatherScene(48), 'fog');
  assert.equal(weatherScene(53), 'drizzle');
  assert.equal(weatherScene(66), 'freezing-rain');
  assert.equal(weatherScene(61), 'rain');
  assert.equal(weatherScene(82), 'heavy-rain');
  assert.equal(weatherScene(73), 'snow');
  assert.equal(weatherScene(86), 'heavy-snow');
  assert.equal(weatherScene(99), 'storm');
});

test('the period uses the location offset and night comes from is_day', () => {
  const reading = { temperature: 10, code: 0, isDay: true };
  assert.equal(dayPeriod({ ...reading, utcOffset: 0 }, now), 'morning');
  assert.equal(dayPeriod({ ...reading, utcOffset: 6 * 3600 }, now), 'morning');
  assert.equal(dayPeriod({ ...reading, utcOffset: 10 * 3600 }, now), 'evening');
  assert.equal(dayPeriod({ ...reading, isDay: false, utcOffset: 0 }, now), 'night');
});

test('video candidates go from most specific to related scenes', () => {
  assert.deepEqual(
    weatherVideoCandidates({ temperature: 8, code: 63, isDay: false, utcOffset: 0 }, now),
    [
      './weather-videos/night/rain-night.mp4',
      './weather-videos/rain.mp4',
      './weather-videos/night/drizzle-night.mp4',
      './weather-videos/drizzle.mp4',
      './weather-videos/night/cloudy-night.mp4',
      './weather-videos/cloudy.mp4',
    ],
  );
});

test('the location offset is read from the API and survives the cache', () => {
  const current = { temperature_2m: 5, weather_code: 0, is_day: 1 };
  assert.equal(parseWeather({ utc_offset_seconds: 3600, current }).utcOffset, 3600);
  assert.equal('utcOffset' in parseWeather({ current }), false);
  assert.equal('utcOffset' in parseWeather({ utc_offset_seconds: 'x', current }), false);
});

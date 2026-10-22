import type { WeatherReading } from './types';

export const WEATHER_VIDEO_DIR = './weather-videos';

export type WeatherScene =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'freezing-rain'
  | 'snow'
  | 'heavy-snow'
  | 'storm';
export type DayPeriod = 'morning' | 'evening' | 'night';

// Missing variants fall back through these families before the static wallpaper.
const sceneFallbacks: Record<WeatherScene, WeatherScene[]> = {
  clear: [],
  'partly-cloudy': ['clear'],
  cloudy: ['partly-cloudy'],
  fog: ['cloudy'],
  drizzle: ['rain', 'cloudy'],
  rain: ['drizzle', 'cloudy'],
  'heavy-rain': ['rain', 'storm'],
  'freezing-rain': ['rain', 'snow'],
  snow: ['heavy-snow', 'cloudy'],
  'heavy-snow': ['snow'],
  storm: ['heavy-rain', 'rain'],
};

// Open-Meteo WMO weather codes.
export function weatherScene(code: number): WeatherScene {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ([51, 53, 55].includes(code)) return 'drizzle';
  if ([56, 57, 66, 67].includes(code)) return 'freezing-rain';
  if ([61, 63, 80, 81].includes(code)) return 'rain';
  if (code === 65 || code === 82) return 'heavy-rain';
  if ([71, 73, 77, 85].includes(code)) return 'snow';
  if (code === 75 || code === 86) return 'heavy-snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'cloudy';
}

export function dayPeriod(reading: WeatherReading, now = Date.now()): DayPeriod {
  if (!reading.isDay) return 'night';
  const date = new Date(now);
  const hour =
    reading.utcOffset === undefined
      ? date.getHours()
      : new Date(now + reading.utcOffset * 1000).getUTCHours();
  return hour >= 17 ? 'evening' : 'morning';
}

// Most specific first: exact scene and period, the scene at any time, then the
// related scenes at this period and at any time.
export function weatherVideoCandidates(reading: WeatherReading, now = Date.now()): string[] {
  const period = dayPeriod(reading, now);
  const scene = weatherScene(reading.code);
  return [scene, ...sceneFallbacks[scene]].flatMap((name) => [
    `${WEATHER_VIDEO_DIR}/${period}/${name}-${period}.mp4`,
    `${WEATHER_VIDEO_DIR}/${name}.mp4`,
  ]);
}

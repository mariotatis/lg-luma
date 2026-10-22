import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { WeatherLocation } from '../types';
import { useWeather } from '../use-weather';
import { weatherVideoCandidates } from '../weather-scenes';
import { BackgroundVideo } from './background-video';

const PERIOD_CHECK_MS = 5 * 60 * 1000;

export function WeatherBackground({
  location,
  paused,
  fallback,
}: {
  location: WeatherLocation;
  paused: boolean;
  // Shown while no weather video is available, such as the selected video background.
  fallback: ReactNode;
}) {
  const { reading } = useWeather(location);
  const [now, setNow] = useState(() => Date.now());
  // Videos the player could not load; the next candidate takes over.
  const [missing, setMissing] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), PERIOD_CHECK_MS);
    return () => clearInterval(timer);
  }, []);

  const source = useMemo(
    () =>
      reading ? weatherVideoCandidates(reading, now).find((path) => !missing.has(path)) : undefined,
    [reading, now, missing],
  );
  if (!source) return fallback;
  return (
    <BackgroundVideo
      key={source}
      src={source}
      paused={paused}
      onError={() => setMissing((current) => new Set(current).add(source))}
    />
  );
}

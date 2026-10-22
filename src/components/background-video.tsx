import { useEffect, useRef, useState } from 'react';

// On a cold start the first frame of the interface comes first; the video's
// still image or the wallpaper covers the gap.
const STARTUP_DELAY_MS = 1200;

// A muted, looping full-screen video that fades in once its first frame is decoded.
export function BackgroundVideo({
  src,
  paused,
  onError,
}: {
  src: string;
  paused: boolean;
  onError?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(() => performance.now() >= STARTUP_DELAY_MS);
  const [hidden, setHidden] = useState(() => document.hidden);
  const video = useRef<HTMLVideoElement>(null);
  const playing = started && !paused && !hidden;

  useEffect(() => {
    if (started) return;
    const timer = setTimeout(() => setStarted(true), STARTUP_DELAY_MS - performance.now());
    return () => clearTimeout(timer);
  }, [started]);

  // Stop decoding while another app is in front, so webOS keeps Luma in memory.
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);

  useEffect(() => {
    if (!playing) video.current?.pause();
    else void video.current?.play().catch(() => undefined);
  }, [playing]);

  if (!started) return null;
  return (
    <video
      ref={video}
      className={`background-video${ready ? ' ready' : ''}`}
      src={src}
      autoPlay={playing}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      onLoadedData={() => setReady(true)}
      onError={onError}
    />
  );
}

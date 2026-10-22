# Weather background videos

**Settings → Weather → Dynamic background** replaces the selected background with a looping video that matches the current weather at the saved location. The build leaves this README out of the package.

## Naming

```
<period>/<scene>-<period>.mp4   e.g. morning/rain-morning.mp4, night/clear-night.mp4
<scene>.mp4                     any time of day, at the folder root; used when no period file exists
```

All names are lowercase kebab-case `.mp4` files.

## Periods

| Period    | Folder     | When                                                  |
| --------- | ---------- | ----------------------------------------------------- |
| `morning` | `morning/` | Daylight, from sunrise until 16:59 local time         |
| `evening` | `evening/` | Daylight, from 17:00 until sunset                     |
| `night`   | `night/`   | After sunset and before sunrise (Open-Meteo `is_day`) |

Times use the weather location's time zone.

## Scenes and files

| Scene         | Open-Meteo codes | Morning                             | Evening                             | Night                           | Any time            |
| ------------- | ---------------- | ----------------------------------- | ----------------------------------- | ------------------------------- | ------------------- |
| Clear         | 0                | `morning/clear-morning.mp4`         | `evening/clear-evening.mp4`         | `night/clear-night.mp4`         | `clear.mp4`         |
| Partly cloudy | 1, 2             | `morning/partly-cloudy-morning.mp4` | `evening/partly-cloudy-evening.mp4` | `night/partly-cloudy-night.mp4` | `partly-cloudy.mp4` |
| Cloudy        | 3                | `morning/cloudy-morning.mp4`        | `evening/cloudy-evening.mp4`        | `night/cloudy-night.mp4`        | `cloudy.mp4`        |
| Fog           | 45, 48           | `morning/fog-morning.mp4`           | `evening/fog-evening.mp4`           | `night/fog-night.mp4`           | `fog.mp4`           |
| Drizzle       | 51, 53, 55       | `morning/drizzle-morning.mp4`       | `evening/drizzle-evening.mp4`       | `night/drizzle-night.mp4`       | `drizzle.mp4`       |
| Rain          | 61, 63, 80, 81   | `morning/rain-morning.mp4`          | `evening/rain-evening.mp4`          | `night/rain-night.mp4`          | `rain.mp4`          |
| Heavy rain    | 65, 82           | `morning/heavy-rain-morning.mp4`    | `evening/heavy-rain-evening.mp4`    | `night/heavy-rain-night.mp4`    | `heavy-rain.mp4`    |
| Freezing rain | 56, 57, 66, 67   | `morning/freezing-rain-morning.mp4` | `evening/freezing-rain-evening.mp4` | `night/freezing-rain-night.mp4` | `freezing-rain.mp4` |
| Snow          | 71, 73, 77, 85   | `morning/snow-morning.mp4`          | `evening/snow-evening.mp4`          | `night/snow-night.mp4`          | `snow.mp4`          |
| Heavy snow    | 75, 86           | `morning/heavy-snow-morning.mp4`    | `evening/heavy-snow-evening.mp4`    | `night/heavy-snow-night.mp4`    | `heavy-snow.mp4`    |
| Thunderstorm  | 95, 96, 99       | `morning/storm-morning.mp4`         | `evening/storm-evening.mp4`         | `night/storm-night.mp4`         | `storm.mp4`         |

Any other code is treated as Cloudy.

## Fallbacks

Not every file is required. For each scene the app tries, in order:

1. `<period>/<scene>-<period>.mp4`
2. `<scene>.mp4`
3. The related scenes below, each as `<period>/<related>-<period>.mp4` then `<related>.mp4`
4. The selected static background

| Scene         | Related scenes, in order |
| ------------- | ------------------------ |
| Clear         | —                        |
| Partly cloudy | clear                    |
| Cloudy        | partly-cloudy            |
| Fog           | cloudy                   |
| Drizzle       | rain, cloudy             |
| Rain          | drizzle, cloudy          |
| Heavy rain    | rain, storm              |
| Freezing rain | rain, snow               |
| Snow          | heavy-snow, cloudy       |
| Heavy snow    | snow                     |
| Thunderstorm  | heavy-rain, rain         |

A useful minimum set is the `clear`, `cloudy`, `rain`, and `snow` files for each period (12 videos). Only give an any-time file (`rain.mp4`) footage that looks right both day and night.

## Encoding

- H.264 (High profile) in MP4, 1920×1080, 24–30 fps, no audio track
- Loops seamlessly, ideally 10–30 seconds long
- About 4–8 Mbps; keep each file under ~15 MB, because every video is packaged into the IPK
- Avoid bright text or detail in the lower half, where the Favorites and Inputs rows sit

Example conversion:

```sh
ffmpeg -i source.mov -an -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30" \
  -c:v libx264 -profile:v high -preset slow -crf 23 -maxrate 8M -bufsize 16M \
  -pix_fmt yuv420p -movflags +faststart rain-night.mp4
```

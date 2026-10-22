# Luma agent context

## Checks

Use pnpm, Oxlint, and Oxfmt. Node.js 22+ and pnpm 10 are required; `package.json` pins the pnpm version.

```sh
pnpm check
pnpm format:check
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:browser
```

`pnpm check` runs Oxlint and TypeScript. Run `pnpm lint:fix` to apply automatic lint fixes. Oxlint checks TypeScript, React, hooks, and accessibility rules; generated output is excluded. Formatting uses Oxfmt: `pnpm format` writes formatting changes and `pnpm format:check` verifies them.

Build before running browser tests so packaged `file://` tests exercise the current code. Browser checks cover remote navigation, hold-OK options, favorites, settings, search, persistence, focus restoration, weather configuration, temperature units, caching, and TV-service failure behavior with a mock bridge. Weather APIs are mocked; tests do not connect to a TV. On Linux, install Chromium's dependencies with `pnpm exec playwright install --with-deps chromium`.

## Structure

`src/` contains React/TypeScript UI, spatial navigation, local preferences, and the webOS bridge. `public/` contains locally bundled assets. `tools/` builds a classic-script app and IPK. `tv/autostart.sh` is the optional boot hook.

Project filenames use lowercase kebab-case, including React components (for example, `app-tile.tsx`). Keep `package.json` and `appinfo.json` versions synchronized; change the version only when requested.

## Collecting app icons from a webOS TV

The optional installed-app artwork prototype can collect icons from a developer's own rooted TV over SSH. Set `TV_IP` to the TV's address and run these commands from the repository root:

```sh
ssh root@TV_IP node < tools/collect-tv-icons.js
ssh root@TV_IP 'tar -cf - -C /tmp/luma-artwork .' > icons.tar
mkdir -p public/app-icons
tar -xf icons.tar -C public/app-icons
mv public/app-icons/app-icons.json src/app-icons.json
node tools/icon-colours.mjs
pnpm build
```

The collector checks `/media/developer/apps/usr/palm/applications`, `/media/cryptofs/apps/usr/palm/applications`, and `/usr/palm/applications`, preferring each app's `largeIcon`, then `icon`, then `icon.png`. It copies image files into `/tmp/luma-artwork` on the TV and writes an app-ID-to-image map. After copying that output into `public/app-icons/`, the map points to the bundled paths and `tools/icon-colours.mjs` generates matching tile background colors in `src/icon-colours.css`. Only icons found in those locations are collected; no icon set is supplied by the repository, so `src/app-icons.json` can be empty until collection is run. The collector requires SSH/root access to the developer's own TV.

## Performance

Keep focus feedback immediate. Spatial navigation caches control geometry and invalidates it on DOM/layout changes, scrolling, resizing, and font loads; fully visible targets do not call `scrollIntoView`. New focusable controls must use `data-focusable` and explicit routes where appropriate.

`data-focus-scroll-top="true"` normalizes the Apps toolbar's scroll position only during remote navigation. Do not scroll the toolbar from a generic focus handler: pointer-down focuses a button before pointer-up, so moving it at that point can swallow the click.

On the TV, the last successful app and input inventory is saved (`luma.inventory.v1`) and shown at once on a cold start, then replaced by the live inventory; the desktop preview never reads or writes it. Background videos start 1.2 seconds after page load, so the first frame of the interface comes first. They pause while the document is hidden, which lowers Luma's footprint so webOS is less likely to close it. In home mode, the watcher closes LG Channels about every 30 seconds when it runs in the background. LG's home is left alone, because webOS restarts it immediately.

Clock components update at minute boundaries and pause while hidden, independently of the launcher and app sorting. Library filtering/sorting is memoized and only runs on the Apps page. Concurrent inventory refreshes are deduplicated. Use small CSS opacity animations instead of a JavaScript animation runtime, and avoid live backdrop blur or full-screen filter textures in foreground controls. Reduced-motion preferences apply through CSS.

The top navigation uses one persistent selection pill. CSS transitions animate its transform and width; JavaScript measures the selected tab only on selection changes and resize/font-size changes. Initial positioning and resizing are immediate. Both the saved and system reduced-motion preferences disable the pill transition.

Settings uses bundled 480×270 photo thumbnails rather than decoding the full wallpapers for every gallery card. `pnpm assets` regenerates thumbnails. Run `pnpm benchmark` after installing Playwright Chromium to measure a 120-app library with 6× desktop CPU throttling; compare bundle size, keyboard-handler timings, geometry reads, and scroll calls. These measurements are a desktop proxy, not TV frame-rate claims.

Gallery previews use clipped image elements with an inset border, avoiding repeated background-image strips at fractional-sized edges. Neutral interface text, surfaces, icons, and focus rings use gray rather than cream/gold tints. App-action rows have contained focus rings and synchronize pointer hover with keyboard focus; closing the menu restores the selected app, or its nearest surviving neighbor after hiding, after the React commit.

## CI and releases

`.github/workflows/ci.yml` checks pull requests and pushes to `main` on Ubuntu with Node.js 24. It checks formatting, runs unit tests, builds and verifies the IPK, and runs Chromium browser tests. Successful builds upload the release files as a workflow artifact. Successful `main` builds publish new versions using `GITHUB_TOKEN`, automatically creating the version tag at the tested commit. Published versions are skipped; a draft can be resumed when its tag matches that commit. An existing tag pointing elsewhere stops publication. `workflow_dispatch` on `main` provides a manual retry without a tag input. Main runs are serialized so new pushes do not interrupt publication; outdated PR runs can be cancelled.

`tools/repository.mjs` runs after packaging. It creates `dist/repo.json` in Homebrew Channel's paginated package format and copies the native large icon into `dist/`. The feed uses version-specific release URLs and the SHA-256 and size of the normalized IPK. It rejects mismatched package/app versions and release tags, and exposes its validated version tag through `GITHUB_OUTPUT` for the release job. The install URL is `https://github.com/ecklf/lg-luma/releases/latest/download/repo.json`; it requires public repository/release access and an initial published release. Publishing the feed as a release asset avoids bot commits to the default branch.

## Remote and pointer controls

| Input                  | Action                                                   |
| ---------------------- | -------------------------------------------------------- |
| Arrow keys             | Spatial navigation between tiles and controls            |
| OK / Enter             | Open the focused app, input, or control                  |
| Hold OK                | Home favorite: move mode; library app: options           |
| Menu / right-click / M | Options for the focused app                              |
| Back / Escape          | Close the current panel; return from Apps/Inputs to Home |
| Back on Home           | Platform Back; ambient clock when Luma is home           |
| Magic Remote pointer   | Point, click, or hold a tile for options                 |

On Home, hold OK on a favorite to enter move mode, press Left/Right to change its position, then press Back to finish. The new order is saved immediately and the selected app stays focused. Apps → select an app → hold OK to add/remove favorites or hide apps. The action menu shows the app name and category, and closes after either action. Favorites have a filled-heart badge and sort first in the saved Home order; other apps sort alphabetically. Hidden apps remain installed and can be restored from the **Hidden (count)** category pill, which shows only hidden apps. Choose a category beside search to filter the library; select it again or use the × button to clear the filter. Long app names wrap instead of being truncated.

**Settings → Interface → Use Luma as home** (off by default) makes Luma the TV's home screen. Back on Home opens the ambient clock instead of leaving, and Back again returns Home; and the app runs `tv/home-watch.sh enable` or `disable` through Homebrew Channel's root exec. The script links `/var/lib/webosbrew/init.d/66-luma-home` and runs a watcher that polls the power state and foreground app twice a second. It reopens Luma when the TV returns to `Active` from standby or when `com.webos.app.home` (the remote's Home button) comes to the front, and never launches while the screen is off. Luma re-runs `enable` at launch while the setting is on, so a watcher that stopped is restarted. Root shells on webOS 10+ need `luna-send -t`; `-n` returns nothing.

Home shows Favorites and Inputs without a recent-app section or permanent control hints. App names beneath Home cards are hidden by default; enable **Settings → Interface → Show app names on Home** to display them. The Apps library always shows names. The header clock is at the top left.

The top navigation includes a full-page **Settings** view, with **Background** on the left and **Interface** above **Weather** on the right. The sliders icon at the top right opens **TV settings** directly. Interface controls Home app names, 12/24-hour time, reduced motion, and refresh. Back returns to Home, and the version number appears at the bottom right of Settings. The moon button in the footer opens the ambient clock on the other pages. After 2 minutes without remote, pointer, or wheel activity, Luma opens the ambient clock on its own; after 5 more minutes there, it switches to a random city video (Great Wall, Los Angeles, or San Francisco Bay) at full opacity with a small corner clock. Any button or pointer movement returns to Luma. Idle time does not accumulate while another app is in front or while a text field has focus.

The nine bundled backgrounds are Slate, Midnight, Prism (saturated red, yellow, and purple), Monument Valley, San Francisco, Summit, Forest, Yosemite, and Northern lights. Below them, a **Dynamic background** subsection offers looping video backgrounds (Great Wall, Los Angeles, San Francisco Bay) from `public/weather-videos/other/`, with thumbnails in `public/wallpaper-thumbnails/` and first-frame posters in `public/wallpapers/`. When the weather **Dynamic background** switch has a matching weather video, it covers the selected background; otherwise the selected background, including a video, shows. From the Settings tab, Down enters Interface and continues into Weather; Left reaches the background gallery.

Apple TV, Prime Video, Disney+, Jellyfin, Netflix, YouTube, ARTE, ZDF, and Das Erste use bundled SVG logos. Input cards choose connection artwork from the reported device name, the HDMI-CEC device type and name in the input's `subList`, and the source description (`spdVendorName`, `spdProductDescription`): PlayStation and Apple TV use their supplied marks, USB uses the USB symbol, consoles use a gamepad, streaming boxes and CEC playback, tuner, and recorder devices use a TV, CEC audio systems use a speaker, other named devices use a box, and only unnamed ports use an HDMI connector. Icon selection does not change the input's launch target.

## Weather

Open **Settings → Weather**, enter a city or postcode, press Search, and select the matching place. **Show widget** controls visibility on Home and the ambient screen; turning it off keeps your saved city. Choose **°C** or **°F** under **Temperature** to save your preferred unit for both screens. Switching units converts the cached reading immediately without another weather request. When enabled, the widget shows the chosen city, temperature, and current conditions. Nothing uses browser geolocation or automatic IP-based location lookup.

**Dynamic background** (off by default) replaces the selected background with a muted, looping video from `public/weather-videos/` chosen by weather scene and local time of day: `morning/` (daylight before 17:00), `evening/` (17:00 until sunset), and `night/` subfolders, plus any-time files at the folder root. `src/weather-scenes.ts` maps Open-Meteo codes to scenes and lists candidate files from most to least specific; a file that fails to load moves to the next candidate, and the static background shows when none load. `public/weather-videos/README.md` lists the file names and encoding guidance; the build leaves that README out of the package. Reduced motion pauses the video.

Back while editing the city/postcode field leaves the field and keeps Settings open. Press Back again from a button to return Home.

Weather refreshes every 15 minutes while Home or the ambient clock is visible. The ambient clock shows weather in place of the return hint when a location is configured. Recent readings are cached locally and reused after reopening the app. If the connection fails, an available cached reading is labeled as saved; otherwise the widget says weather is unavailable. Remove the weather location in Settings to turn it off. API and cached temperatures stay in Celsius; `formatTemperature` converts the unrounded value for display.

Location search calls `geocoding-api.open-meteo.com`, and weather calls `api.open-meteo.com`. Those are the only network origins allowed by the packaged app's Content Security Policy. No API key or account is required. Data attribution: [Open-Meteo](https://open-meteo.com/) / [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

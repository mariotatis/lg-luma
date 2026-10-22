# Luma: working notes

Project conventions, checks, and feature behavior are in @AGENTS.md. This file tracks the state of this fork's work, the developer's TV setup, and what is still open.

## Repository state

- Fork: `git@github.com:mariotatis/lg-luma.git` (remote `fork`). Upstream: `ecklf/lg-luma` (remote `origin`); never push there.
- Work branch: `luma-home-dynamic-backgrounds`, based on upstream `8600526`.
  - `8f8e02e`: weather and city background videos (~122 MB).
  - `dc1c6fb`: dynamic backgrounds, home mode, screensaver, inventory cache, input artwork, language menu fix.
  - Later commits: Spanish, notes.
- Branch `youtube-preview-shelf`, stacked on `luma-home-dynamic-backgrounds`: app preview shelves on Home, the previews and menu-style settings, and two focus fixes.
- `fork/main` is upstream v1.1.1 (17 commits ahead of our base: Settings redesign, per-input visibility in `src/inputs.ts` and `input-settings.tsx`). Merging our branch onto it is **not done yet**; expect conflicts in `settings.tsx`, `app.tsx`, `styles.css`, `settings.css`, and the tests, and our Settings rows need to move into the redesigned page.
- The version is still `1.0.3` in `package.json` and `appinfo.json`. Bump only when asked.

## Local environment

The Mac's system Node is 20 and pnpm is not installed globally; the project needs Node 22+ and pnpm 10. Either install them (`brew install node@22`, then `corepack enable`) or put a Node 22 toolchain first on `PATH` and run pnpm through corepack. Playwright Chromium is installed in `~/Library/Caches/ms-playwright`.

Run `pnpm build` before `pnpm test:browser`; the packaged-file test reads `dist/`.

## The TV

- LG webOS **10.3.2** (Rockhopper), rooted with Homebrew Channel, at `192.168.1.82`.
- Root SSH: `ssh -i ~/.ssh/lgtv_root -o IdentitiesOnly=yes root@192.168.1.82`. In zsh, pass ssh options directly; a `$OPTS` variable is not word-split.
- Developer Mode device `lgtv` (port 9922) is usually closed because the session expires, so `pnpm deploy` / `ares-install` usually fail. Use root SSH instead.
- On webOS 10, a root shell must call `luna-send -t 1 …`; `-n` returns nothing and does nothing useful.
- The TV is unreachable while off or in deep standby. It is also unreachable when the Mac is on another network, such as an iPhone hotspot (`172.20.10.x`); check `ifconfig` for a `192.168.1.x` address.

### Installing a build on the TV

1. `pnpm run package`
2. Copy: `ssh … 'cat > /tmp/luma.ipk' < dist/com.luma.launcher_1.0.3_all.ipk`
3. Install: `luna-send -t 1 -w 15000 luna://com.webos.appInstallService/dev/install '{"id":"com.luma.launcher","ipkUrl":"/tmp/luma.ipk","subscribe":false}'`
4. Wait until `sha256sum` of `/media/developer/apps/usr/palm/applications/com.luma.launcher/app.js` matches `dist/app/app.js`. **Do not delete `/tmp/luma.ipk` before that**; deleting it early makes the install fail silently.
5. Relaunch: `luna-send -t 1 -w 5000 luna://com.webos.service.applicationmanager/launch '{"id":"com.luma.launcher"}'`. Retry for a few seconds if it returns `app is locked`.
6. Check `sh …/com.luma.launcher/home-watch.sh status`. Opening Luma restarts the watcher while home mode is on.

Never unpack the IPK by hand into `/media/developer/apps`. That skips the installer's permission files in `/var/luna-service2-dev/{roles.d,client-permissions.d,manifests.d}/com.luma.launcher.json`, and every Homebrew Channel call then times out ("The TV did not respond"). If that ever happens, reinstall through `appInstallService` as above.

### TV-side configuration (not in the repository)

- **Home mode on:** Settings → Interface → Use Luma as home. It links `/var/lib/webosbrew/init.d/66-luma-home`, and the watcher's PID is in `/tmp/luma-home.pid`.
- **LG Input Hook** (`org.webosbrew.inputhook`) is installed and maps the remote's Home key, code **773** (seen in `micomservice`), to launch Luma:
  `/home/root/.config/lginputhook/keybinds.json` = `{"773":{"action":"launch","id":"com.luma.launcher"}}`. The original empty config is in `keybinds.json.before-luma`. Logs: `/tmp/lginput-hook-{lginput2,micomservice}.log`.
- **Inputs:** HDMI 1 is connected but sends no name. HDMI 2 is "Xuper", an Amlogic Android TV box (CEC playback device). HDMI 3 is for the kid's Nintendo Switch.
- **Removed apps:** the user deleted unused developer apps, including `com.mario.tvhome`.

## What this branch adds

- **Weather videos:** Settings → Weather → Dynamic background, using `public/weather-videos/{morning,evening,night}/<scene>-<period>.mp4` plus optional root-level `<scene>.mp4`. Scene mapping and fallbacks are in `src/weather-scenes.ts`, and the naming guide is in `public/weather-videos/README.md`. Morning is daylight until 16:59, evening is 17:00 to sunset, and night comes from Open-Meteo `is_day`. Weather refreshes every 15 minutes and the period every 5 minutes, both only while Luma is visible.
- **City backgrounds:** Settings → Background → Dynamic background offers Great Wall, Los Angeles, and San Francisco Bay from `public/weather-videos/other/`.
- **Saved city row:** shows the current temperature and conditions.
- **Home mode:** see "TV-side configuration" above; implemented in `tv/home-watch.sh`. Back on Home opens the ambient clock while home mode is on.
- **Screensaver:** after 2 idle minutes, the ambient clock; after 5 more, a random city video with a corner clock.
- **Performance:** the last TV inventory is cached (`luma.inventory.v1`), background videos start 1.2 s after load and pause while hidden, and the watcher closes LG Channels in the background.
- **Input artwork:** also uses HDMI-CEC `subList[].cecpDevType`/`osdName` and `spdVendorName`/`spdProductDescription`.
- **Spanish:** Latin American Spanish (`es`, locale `es-419`) is a display language, listed second in the menu. Language names come from one `languageNames` map in `settings.tsx`.
- **Language menu:** Down passes the Display language selector, OK opens it, and the ends of the menu lead out instead of wrapping.

### `youtube-preview-shelf` branch

- **Preview shelves** (`src/previews.ts`, `src/components/preview-shelf.tsx`): like Apple TV's top shelf. A favorite focused for 250 ms opens a row of its highlighted content under the Home greeting, which lifts and shrinks to 70% with a CSS transform (`--shelf-lift` is measured from `offsetTop` on open). Up enters the row, Left/Right follow explicit routes and hold at the ends, Down returns to the app, and Back closes the shelf and keeps it closed until focus leaves that favorite. OK opens the content.
- **Data source on the TV:** webOS's internal `luna://com.webos.service.contentminer/getContentData {"appId":…}`, which feeds LG's home screen, read through Homebrew Channel's root exec (`readAppContent` in `bridge.ts`). Entries have `type` (`title`, then `content`), `titleText`, `image`/`image_4k` URLs, and `onClick.{contentId,targetAppId}`.
  - On this TV, YouTube publishes about 14 personalized videos (from the account used on the TV, apparently the kid's) and LG Channels about 9 channels. Apple TV, Spotify, and others are supported but empty. Netflix, Disney+, and Prime Video return "Contents for this app are unsupported".
  - **Deep link verified for YouTube:** `applicationManager/launch {"id":"youtube.leanback.v4","params":{"contentTarget":"<contentId>"}}` plays that video. LG Channels uses the same shape with a URL-encoded JSON `contentId`; not yet verified on the TV.
  - Shelves are cached, refreshed after 10 minutes, and favorites are prefetched in the background once the inventory loads. The desktop preview uses sample YouTube videos; the TV never does.
  - The packaged CSP allows images from `https://*.ytimg.com`, `http://ngfts.lge.com`, and `http(s)://aic.imagesvc.lgtvcommon.com`. Another app's shelf may need its image host added in `tools/build.mjs`.
- **Settings → Interface → Show app previews on Home** (`showPreviews`, on by default) turns shelves off.
- **Settings → Interface → Menu with labels** (`textNavigation`, on by default). Off turns Home/Apps/Inputs/Settings into round icon buttons (house, grid, cable, gear) lined up at the right beside the TV settings button; the current page is filled.
- **Focus fixes:** cards take focus only on real pointer movement (a resting cursor no longer steals focus when the shelf appears), and Back from another page no longer re-focuses the first app after a quick remote press.

## Open items

The TV runs the `youtube-preview-shelf` build (YouTube shelf with live data), installed 2026-10-21.

- **Real-content alternatives for Netflix and others:** none official. Only unofficial catalogs (such as JustWatch) could provide titles and IDs; not recommended.
- **Verify the LG Channels deep link** on the TV, and add LG Channels to favorites if its shelf should show.

- **Full-restart test.** LG Input Hook's boot script `/var/lib/webosbrew/init.d/inputhook` uses `luna-send -n`, so after a full restart the Home mapping may need Input Hook to be opened once. If it fails, have `home-watch.sh` start `org.webosbrew.inputhook.service` at boot, without editing Input Hook's files.
- **Merge onto upstream v1.1.1** (`fork/main`) in a separate branch, run all checks, and open a PR on the fork.
- **Wake flash:** LG's home shows for about a second after waking from standby. Suggest turning off the TV's Home Auto Launch, or shorten the watcher's 3-second post-wake wait.
- **Ideas offered, not built:** a crossfade between weather videos; settings for the screensaver delays or turning it off; rotating cities during one screensaver session; automatic input renaming from CEC `osdName` plus manual input rename in Luma.
- **Loop seams:** some weather clips loop with a visible cut (shorter clips were left untrimmed). Originals were only in a temporary folder and are gone.

#!/bin/sh
# Luma's optional home mode. Settings → Interface → Use Luma as home runs
# `enable`/`disable` through Homebrew Channel; nothing runs until then.
# While enabled, a watcher reopens Luma when the TV wakes from standby and
# whenever LG's home screen comes to the front (the remote's Home button).
APP_DIR=/media/developer/apps/usr/palm/applications/com.luma.launcher
HOOK=/var/lib/webosbrew/init.d/66-luma-home
PID_FILE=/tmp/luma-home.pid
LUMA=com.luma.launcher
LG_HOME=com.webos.app.home
INTERVAL=0.5
# Background apps that only cost memory here. Closed when running but not on screen,
# so webOS has room to keep Luma alive. LG's home is a system app webOS restarts at
# once, so it is left alone.
IDLE_APPS="com.webos.app.lgchannels"
TIDY_EVERY=60 # loops, about 30 seconds

# webOS 10+ root-shell calls use -t; older releases use -n.
case "$(cat /etc/starfish-release 2>/dev/null)" in
  *" 10."* | *" 11."*) MODE=-t ;;
  *) MODE=-n ;;
esac
call() { /usr/bin/luna-send "$MODE" 1 -w 3000 "$1" "$2" 2>&1; }
launch() { call luna://com.webos.service.applicationmanager/launch "{\"id\":\"$LUMA\"}" >/dev/null; }

running() { [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; }

tidy() {
  foreground="$1"
  apps="$(call luna://com.webos.applicationManager/running '{}')"
  for app in $IDLE_APPS; do
    case "$foreground" in *"\"appId\":\"$app\""*) continue ;; esac
    case "$apps" in
      *"\"id\":\"$app\""*) call luna://com.webos.applicationManager/closeByAppId "{\"id\":\"$app\"}" >/dev/null ;;
    esac
  done
}

stop() {
  if running; then kill "$(cat "$PID_FILE")" 2>/dev/null; fi
  rm -f "$PID_FILE"
}

watch() {
  # One watcher per boot, even when enable runs twice in quick succession.
  exec 9>/tmp/luma-home.lock
  flock -n 9 || exit 0
  echo $$ >"$PID_FILE"
  trap 'rm -f "$PID_FILE"; exit 0' TERM INT
  awake=yes
  loops=0
  while [ -f "$APP_DIR/appinfo.json" ] && [ -L "$HOOK" ]; do
    case "$(call luna://com.webos.service.tvpower/power/getPowerState '{}')" in
      *'"state": "Active"'* | *'"state":"Active"'*)
        if [ "$awake" = no ]; then
          # Back from standby: give the TV's own startup app a moment, then take over.
          awake=yes
          sleep 3
          launch
          sleep 2
          continue
        fi
        foreground="$(call luna://com.webos.applicationManager/getForegroundAppInfo '{}')"
        case "$foreground" in
          *"\"appId\":\"$LG_HOME\""*)
            launch
            sleep 2
            continue
            ;;
        esac
        loops=$((loops + 1))
        if [ "$loops" -ge "$TIDY_EVERY" ]; then
          loops=0
          tidy "$foreground"
        fi
        ;;
      *'"state"'*) awake=no ;; # Standby, screen off, or powering down: never wake the screen.
    esac
    sleep "$INTERVAL"
  done
  rm -f "$PID_FILE"
}

start() {
  running && return 0
  # A separate process (so $$ is the watcher), detached from Homebrew Channel's
  # exec call so it returns immediately.
  sh "$APP_DIR/home-watch.sh" __watch </dev/null >/tmp/luma-home.log 2>&1 &
}

case "${1:-}" in
  enable)
    [ "$(id -u)" = 0 ] || { printf '%s\n' 'Run as root.' >&2; exit 1; }
    [ -f "$APP_DIR/appinfo.json" ] || { printf '%s\n' 'Install Luma first.' >&2; exit 1; }
    mkdir -p /var/lib/webosbrew/init.d
    if [ -e "$HOOK" ] || [ -L "$HOOK" ]; then
      [ "$(readlink "$HOOK")" = "$APP_DIR/home-watch.sh" ] || { printf '%s\n' '66-luma-home is already used by another file.' >&2; exit 1; }
    fi
    chmod 755 "$APP_DIR/home-watch.sh"
    ln -sf "$APP_DIR/home-watch.sh" "$HOOK"
    start
    printf '%s\n' 'Luma home mode enabled.'
    ;;
  disable)
    [ "$(id -u)" = 0 ] || exit 1
    if [ "$(readlink "$HOOK")" = "$APP_DIR/home-watch.sh" ]; then rm -f "$HOOK"; fi
    stop
    printf '%s\n' 'Luma home mode disabled.'
    ;;
  __watch) watch ;;
  status)
    if [ -L "$HOOK" ] && running; then echo enabled; else echo disabled; fi
    ;;
  *)
    # Boot: Homebrew Channel runs init.d hooks without arguments.
    [ -L "$HOOK" ] || exit 0
    (sleep 25; launch) </dev/null >/dev/null 2>&1 &
    start
    ;;
esac

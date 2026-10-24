#!/usr/bin/env bash
# Runs the end to end checks on a booted Android emulator. Called by .github/workflows/android.yml.
set -euo pipefail
APK="$1"
OUT="$2"
PKG=com.philipnader.nuzzle
mkdir -p "$OUT"
cd "$OUT"
E2E="$(cd "$(dirname "$0")" && pwd)"
log() { echo "::group::$*"; }
end() { echo "::endgroup::"; }

adb install -r "$APK"
adb root >/dev/null 2>&1 || true
adb shell settings put global auto_time 0 || true

jump() { # move the phone's clock forward by $1 minutes
  local now; now=$(adb shell date +%s | tr -d '\r')
  local target=$((now + $1 * 60))
  adb shell "date @$target" >/dev/null 2>&1 || adb shell "toybox date $(date -u -d "@$target" +%m%d%H%M%Y.%S)"
  echo "clock moved on $1 minutes: $(adb shell date)"
}

log "1. main flow: start, switch, pause, stop, undo, reminder"
maestro test "$E2E/01-main-flow.yaml"
end

log "2. a reminder alarm is scheduled with the app closed"
adb shell am force-stop $PKG
adb shell dumpsys alarm | grep -i "$PKG" | head -5
adb shell dumpsys alarm | grep -qi "$PKG" && echo "PASS reminder alarm scheduled" || { echo "FAIL no reminder alarm"; exit 1; }
end

log "3. kill the app mid feed, an hour passes, reopen: timer still right"
maestro test "$E2E/02-kill-mid-feed.yaml"
adb shell am force-stop $PKG
jump 61
maestro test "$E2E/03-after-an-hour.yaml"
end

log "4. the reminder fires on time with the app closed"
adb shell am force-stop $PKG
adb shell dumpsys notification --noredact | grep -c "It has been" || true
jump 62
sleep 20
adb shell dumpsys notification --noredact | grep "It has been" | head -3 || true
adb shell dumpsys notification --noredact | grep -q "It has been" && echo "PASS reminder fired" || { echo "FAIL reminder did not fire"; exit 1; }
adb shell cmd statusbar expand-notifications || true
sleep 2
adb exec-out screencap -p > night-14-reminder-notification.png || true
adb shell cmd statusbar collapse || true
end

log "5. history, edit, delete with undo, add a feed, settings, day theme"
maestro test "$E2E/04-history-edit-delete.yaml"
end

ls -1 "$OUT"

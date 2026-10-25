#!/usr/bin/env bash
# Runs the end to end checks on an iPhone simulator. Called by .github/workflows/nuzzle.yml.
set -euo pipefail
APP="$1"
OUT="$2"
E2E="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT"
cd "$OUT"

# the newest iPhone simulator this Xcode has
UDID=$(xcrun simctl list devices available -j | python3 -c '
import json, sys
devs = json.load(sys.stdin)["devices"]
best = None
for runtime, items in devs.items():
    if "iOS" not in runtime: continue
    for d in items:
        if d["name"].startswith("iPhone") and "SE" not in d["name"]:
            best = (runtime, d["name"], d["udid"]) if best is None or runtime >= best[0] else best
print(best[2]); print(best[1], best[0], file=sys.stderr)
')
xcrun simctl boot "$UDID" || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl ui "$UDID" appearance dark || true
xcrun simctl install "$UDID" "$APP"
export MAESTRO_DRIVER_STARTUP_TIMEOUT=180000

echo "::group::1. main flow: start, switch, pause, stop, undo, reminder"
maestro --device "$UDID" test "$E2E/01-main-flow.yaml"
echo "::endgroup::"

echo "::group::2. close the app mid feed and reopen: timer still right, reminder queued"
maestro --device "$UDID" test "$E2E/ios-02-kill-mid-feed.yaml"
echo "::endgroup::"

echo "::group::3. history, edit by typing, delete with undo, add a feed, settings, day theme"
maestro --device "$UDID" test "$E2E/04-history-edit-delete.yaml"
echo "::endgroup::"

ls -1 "$OUT"

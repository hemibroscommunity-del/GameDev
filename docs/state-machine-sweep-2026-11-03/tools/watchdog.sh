#!/bin/bash
# Exits (re-invoking the main session) when a running sweep agent has written nothing to its transcript for 15 min.
SP=/tmp/claude-0/-home-user-GameDev/1ce7f958-f168-5491-938e-aa5095f58949/scratchpad
T=/tmp/claude-0/-home-user-GameDev/1ce7f958-f168-5491-938e-aa5095f58949/tasks
end=$(( $(date +%s) + ${1:-6600} ))
while [ "$(date +%s)" -lt "$end" ]; do
  now=$(date +%s)
  while IFS=$'\t' read -r sl id; do
    grep -qx "$sl" "$SP/sm/done.txt" && continue
    f="$T/$id.output"; [ -f "$f" ] || continue
    age=$(( now - $(stat -L -c %Y "$f") ))
    if [ "$age" -gt 900 ]; then echo "STALL $sl ($id) quiet ${age}s; out files: $(ls $SP/sm/out | grep -c "^$sl\.")"; exit 0; fi
  done < "$SP/sm/agents.tsv"
  sleep 60
done
echo "WATCHDOG TIMEOUT (no stall seen)"

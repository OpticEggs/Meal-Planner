#!/usr/bin/env bash
# (f, part 1) Does the shell that runs the Start Command stay in the process tree?
# Compares bash (5.2) and dash (/bin/sh on Debian/Ubuntu) with and without `exec`, using sleep as the server.
ls -la /bin/sh
bash --version | head -1
for sh in bash dash; do
  for c in 'true && sleep 2' 'true && exec sleep 2'; do
    setsid "$sh" -c "$c" &
    p=$!
    sleep 0.3
    echo "== $sh -c '$c'   (pid returned by the launcher: $p)"
    ps -o pid,ppid,pgid,args -s "$p"
    wait "$p"
  done
done

#!/bin/sh
V="$RAILWAY_VOLUME_MOUNT_PATH"
if [ -n "$V" ] && [ -d "$V" ]; then
  for d in data session-tempest; do
    if [ ! -e "$V/$d" ] && [ -e "./$d" ]; then
      echo "[boot] semeando $d no volume"
      cp -a "./$d" "$V/$d"
    fi
    if [ -e "$V/$d" ]; then
      rm -rf "./$d"
      ln -s "$V/$d" "./$d"
    fi
  done
fi
exec node src/index.js

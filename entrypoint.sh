#!/bin/sh

# nginx'in sunduğu dosyayla script'in yazdığı dosya AYNI path olsun diye
# OUTPUT_FILE'ı burada, nginx'in html klasörüne sabitliyoruz.
export OUTPUT_FILE="/usr/share/nginx/html/tfs-versions.yaml"

fetch_once() {
  if [ -z "$TFS_REPO_URL" ]; then
    echo "[entrypoint] TFS_REPO_URL tanımlı değil, veri çekme adımı atlanıyor."
    return
  fi

  echo "[entrypoint] TFS'ten veri çekiliyor..."
  if node /app/scripts/fetch-tfs-versions.mjs; then
    echo "[entrypoint] Veri çekme tamamlandı."
  else
    echo "[entrypoint] Veri çekme başarısız oldu, mevcut dosya (varsa) korunuyor."
  fi
}

# Container ayağa kalkar kalkmaz bir kere çek. Sonrasında tekrar
# çekmiyoruz; yeni veri istendiğinde container'ı yeniden başlatmak yeterli
# ("docker restart <isim>").
fetch_once

# nginx'i ön planda başlat; container'ın ana process'i bu olsun ki
# "docker stop" sinyalleri doğrudan nginx'e ulaşsın.
exec nginx -g "daemon off;"

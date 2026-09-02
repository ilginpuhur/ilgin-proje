# --- 1. AŞAMA: build ---
# Node imajını kullanıyoruz çünkü "npm install" ve "vite build" için Node.js gerekiyor.
FROM node:20-alpine AS build

WORKDIR /app

# Önce sadece package*.json kopyalanıyor ki "npm ci" adımı,
# kaynak kod değişse bile (bağımlılıklar değişmediyse) Docker'ın
# katman önbelleğinden (cache) faydalanıp tekrar çalışmasın.
COPY package.json package-lock.json ./
RUN npm ci

# Şimdi projenin geri kalanını kopyalayıp derliyoruz.
COPY . .
RUN npm run build

# --- 2. AŞAMA: serve ---
# nginx:alpine küçük bir imaj; ama artık fetch-tfs-versions.mjs script'ini de
# bu container içinde çalıştıracağımız için üzerine node ve git kuruyoruz.
FROM nginx:alpine

RUN apk add --no-cache nodejs git ca-certificates

WORKDIR /app

# 1. aşamada üretilen "dist" klasörünü, nginx'in varsayılan
# statik dosya sunduğu klasöre kopyalıyoruz.
COPY --from=build /app/dist /usr/share/nginx/html

# Script'in kendisi ve ihtiyaç duyduğu paketler (js-yaml vb.),
# build aşamasında zaten "npm ci" ile kurulmuştu; tekrar npm install
# çalıştırmak yerine doğrudan oradan kopyalıyoruz.
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/node_modules ./node_modules

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]

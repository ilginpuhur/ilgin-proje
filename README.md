# Ilgin Versions

Ilgin Helm chart sürümlerini ve her sürümdeki servis (BE / FE / Infra / GIS ...) versiyonlarını
tek ekranda gösteren React + Vite arayüzü.


## Çalıştırma

cd C:\Users\hakim\ilgin-proje
$env:TFS_REPO_URL="https://github.com/ilginpuhur/ilgin-charts2.git"
node scripts/fetch-tfs-versions.mjs


```bash
npm install
npm run dev             # geliştirme sunucusu
npm run build           # üretim derlemesi
npm run lint             # eslint
npm run fetch-versions   # TFS'ten public/tfs-versions.yaml üretir (TFS_REPO_URL gerekir)
```

## Veri kaynakları

Uygulama açılışta şu sırayla veri arar (`src/hooks/useIlginVersions.js`):

1. **localStorage** — daha önce yüklenmiş veri varsa doğrudan onu gösterir, üzerine yazmaz.
   Tazelemek için arayüzdeki **Yenile**, sıfırlamak için **Temizle** butonu kullanılır.
2. **`?dataUrl=` query parametresi** — belirtilen URL'deki YAML'ı çeker.
   `target`, `url` ve `v` de aynı işi görür.
   Örnek: `http://localhost:5173/?dataUrl=https://raw.githubusercontent.com/.../Chart.yaml`
3. **`public/tfs-versions.yaml`** — hiçbiri yoksa gösterilen varsayılan dosya.
   `scripts/fetch-tfs-versions.mjs` ile TFS'teki chart reposunun tag'lerinden üretilir
   (bkz. aşağıdaki "TFS'ten versiyon üretme" bölümü).

Ayrıca arayüzden elle YAML yüklenebilir; yüklenen dosya mevcut listeye eklenir
(aynı chart + sürüm varsa üzerine yazılır).

## TFS'ten versiyon üretme

`public/tfs-versions.yaml` elle güncellenmez; `scripts/fetch-tfs-versions.mjs` scripti
TFS'teki chart reposundaki her tag'i tarayıp içindeki Chart.yaml'ları toplar ve tek bir
YAML dosyası olarak yazar:

```bash
TFS_REPO_URL="https://tfs.sirket.com/.../ilgin-charts" npm run fetch-versions
```

Opsiyonel: `OUTPUT_FILE` (varsayılan `public/tfs-versions.yaml`), `WORK_DIR`
(varsayılan `.tfs-cache`, geçici clone klasörü).

## Desteklenen YAML formatları

**Helm chart formatı** (asıl kullanım):

```yaml
apiVersion: v2
name: Ilgin
version: "2.0.0"
dependencies:
  - name: Ilgin-backend
    version: 2.0.0
```

`version` alanı `"@application-version@"` gibi bir placeholder ise sürüm sırasıyla
release tag'inden ve dosya adından okunur.

**Eski liste formatı** da desteklenir:

```yaml
versions:
  - name: Ilgin 1.75.0
    Ilgin-backend: 1.75.0
    Ilgin-ui: 5.12.0
```

## Dosya düzeni

| Yol | Görev |
| --- | --- |
| `src/hooks/useIlginVersions.js` | Tüm veri yükleme, saklama, sıralama ve filtreleme mantığı |
| `src/utils/yamlParser.js` | YAML → `{ name, chartVersion, services: [...] }` normalizasyonu |
| `src/utils/semver.js` | Sürüm ayıklama ve azalan sıralama |
| `scripts/fetch-tfs-versions.mjs` | TFS chart reposunun tag'lerinden `public/tfs-versions.yaml` üretir |
| `src/components/` | Toolbar, ServiceFilter, VersionAccordion, ServiceCard, EmptyState |

# Ilgin Versions

Ilgin Helm chart sürümlerini ve her sürümdeki servis (BE / FE / Infra / GIS ...) versiyonlarını
tek ekranda gösteren React + Vite arayüzü.

## Çalıştırma

```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # üretim derlemesi
npm run lint     # eslint
```

## Veri kaynakları

Uygulama açılışta şu sırayla veri arar (`src/hooks/useIlginVersions.js`):

1. **localStorage** — daha önce yüklenmiş veri varsa doğrudan onu gösterir, üzerine yazmaz.
   Tazelemek için arayüzdeki **Yenile**, sıfırlamak için **Temizle** butonu kullanılır.
2. **`?dataUrl=` query parametresi** — belirtilen URL'deki YAML'ı çeker.
   `target`, `url` ve `v` de aynı işi görür.
   Örnek: `http://localhost:5173/?dataUrl=https://raw.githubusercontent.com/.../Chart.yaml`
3. **GitHub Releases** — `ilginpuhur/ilgin-charts` deposundaki en yeni 30 release taranır.
   Her release için önce `.yaml`/`.yml` asset'i, yoksa tag altındaki bilinen dosya adları denenir.
4. **`public/ilgin-versions.yaml`** — GitHub'a ulaşılamazsa gösterilen yerel örnek.

Ayrıca arayüzden elle YAML yüklenebilir; yüklenen dosya mevcut listeye eklenir
(aynı chart + sürüm varsa üzerine yazılır).

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
| `src/utils/githubReleases.js` | GitHub Releases'ten chart YAML'larını indirme |
| `src/utils/semver.js` | Sürüm ayıklama ve azalan sıralama |
| `src/components/` | Toolbar, ServiceFilter, VersionAccordion, ServiceCard, EmptyState |

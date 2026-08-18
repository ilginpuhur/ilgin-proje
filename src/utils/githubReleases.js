export const GITHUB_OWNER = "ilginpuhur";
export const GITHUB_REPO = "ilgin-charts";

// Kimlik doğrulamasız GitHub API saatte 60 istek veriyor.
// Her release için en az 1 istek attığımız için listeyi bilinçli olarak sınırlıyoruz.
const MAX_RELEASES = 30;

const formatDate = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("tr-TR");
};

// Bir release için indirilecek muhtemel URL'ler, öncelik sırasına göre.
//
// ÖNEMLİ: Release asset adresleri (github.com/.../releases/download/...) CORS başlığı
// göndermediği için tarayıcıdan fetch edilemez. raw.githubusercontent.com ise
// "access-control-allow-origin: *" döner. Bu yüzden asset'in ADINI kullanıp
// indirmeyi raw üzerinden yapıyoruz; asset adresi yalnızca son çare olarak duruyor.
const candidateUrls = (release, owner, repo) => {
  const tag = release.tag_name;
  const versionNum = tag.replace(/^v/, "");
  const raw = (fileName) =>
    `https://raw.githubusercontent.com/${owner}/${repo}/${tag}/${fileName}`;

  const yamlAsset = release.assets?.find(
    (a) => a.name.endsWith(".yaml") || a.name.endsWith(".yml")
  );

  const urls = [];

  // 1. Asset'in adı repodaki dosya adıyla eşleşiyorsa ilk denemede buluruz.
  if (yamlAsset) urls.push(raw(yamlAsset.name));

  // 2. Bilinen dosya adları.
  urls.push(
    raw(`ilgin-chart-${versionNum}.yaml`),
    raw("Chart.yaml"),
    raw("chart.yaml"),
    raw("ilgin-chart.yaml")
  );

  // 3. Son çare: asset'in kendi adresi (CORS'un sorun olmadığı ortamlar için).
  if (yamlAsset) urls.push(yamlAsset.browser_download_url);

  return [...new Set(urls)];
};

const looksLikeChartYaml = (text) =>
  text.includes("apiVersion") || text.includes("name:") || text.includes("dependencies:");

/**
 * GitHub Releases üzerinden chart YAML'larını indirir.
 * { items: [{ text, tag, fileName, releaseDate }], skipped: [tag], hasMore: boolean } döner.
 * Ağ/limit hatasında exception fırlatır.
 */
export async function fetchReleaseYamls({
  owner = GITHUB_OWNER,
  repo = GITHUB_REPO,
  max = MAX_RELEASES,
} = {}) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${max}`
  );

  if (res.status === 403 || res.status === 429) {
    throw new Error(
      "GitHub API istek limitine takıldı. Bir süre sonra tekrar deneyin veya YAML dosyasını elle yükleyin."
    );
  }
  if (!res.ok) {
    throw new Error(`GitHub release listesi alınamadı (HTTP ${res.status}).`);
  }

  // per_page listeyi zaten kırptığı için "daha var mı" bilgisini Link header'ından okuyoruz.
  const hasMore = (res.headers.get("link") || "").includes('rel="next"');

  const releases = await res.json();
  if (!Array.isArray(releases) || releases.length === 0) {
    return { items: [], skipped: [], hasMore: false };
  }

  const results = await Promise.all(
    releases.map(async (release) => {
      const tag = release.tag_name;
      const releaseDate = formatDate(release.published_at || release.created_at);

      for (const url of candidateUrls(release, owner, repo)) {
        try {
          const fileRes = await fetch(url);
          if (!fileRes.ok) continue;
          const text = await fileRes.text();
          // Yanlışlıkla HTML hata sayfası indirmeyelim.
          if (!looksLikeChartYaml(text)) continue;
          return { text, tag, fileName: url.split("/").pop(), releaseDate };
        } catch {
          // Sonraki URL seçeneğine geç
        }
      }

      return { tag, failed: true };
    })
  );

  return {
    items: results.filter((r) => r && !r.failed),
    skipped: results.filter((r) => r && r.failed).map((r) => r.tag),
    hasMore,
  };
}

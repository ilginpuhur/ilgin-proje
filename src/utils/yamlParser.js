import { load as loadYaml } from "js-yaml";

const VERSION_PATTERN = /\d+\.\d+(?:\.\d+)?/;

// "@application-version@" gibi placeholder'ları eleyip geçerli bir sürüm yakalar.
const pickVersion = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const text = String(candidate).trim();
    if (!text) continue;
    const match = text.match(VERSION_PATTERN);
    if (match) return match[0];
  }
  return "";
};

// Repo "hakim" -> "ilgin" olarak yeniden adlandırıldı. Yeniden adlandırmadan önce
// yayınlanmış eski GitHub release'leri hâlâ o commit'teki "Hakim-*" isimlerini
// taşıyor; bu isimleri güncel "Ilgin-*" ismine eşleyerek servis listesinde ve
// filtrede tek bir servis olarak görünmelerini sağlıyoruz.
const NAME_ALIASES = [[/^hakim\b/i, "Ilgin"]];

const normalizeName = (rawName) => {
  const trimmed = String(rawName).trim();
  for (const [pattern, replacement] of NAME_ALIASES) {
    if (pattern.test(trimmed)) return trimmed.replace(pattern, replacement);
  }
  return trimmed;
};

const toServiceList = (dependencies) =>
  dependencies
    .filter((dep) => dep && dep.name)
    .map((dep) => ({
      name: normalizeName(dep.name),
      version: dep.version ? String(dep.version) : "belirtilmedi",
      repository: dep.repository ? String(dep.repository) : "",
    }));

// Eski format: { versions: [{ name, version, "Ilgin-backend": "1.75.0", ... }] }
const normalizeLegacyEntry = (entry) => {
  if (!entry || typeof entry !== "object") return null;

  const { name, version, releaseDate, description, appVersion, services, ...rest } = entry;

  const flatServices = Object.entries(rest)
    .filter(([, value]) => value != null && typeof value !== "object")
    .map(([serviceName, value]) => ({
      name: normalizeName(serviceName),
      version: String(value),
      repository: "",
    }));

  const chartVersion = pickVersion(version, name);
  const chartName = name ? normalizeName(name) : "";

  return {
    name: chartName || `Chart ${chartVersion}`.trim(),
    chartName,
    chartVersion,
    appVersion: appVersion ? String(appVersion) : "",
    description: description || "",
    releaseDate: releaseDate ? String(releaseDate) : "",
    services: Array.isArray(services) ? toServiceList(services) : flatServices,
  };
};

/**
 * Ham YAML metnini parse edip { versions: [...] } formatına çevirir.
 * State'e dokunmaz; başarı durumunda { data, error: null },
 * hata durumunda { data: null, error: "mesaj" } döner.
 *
 * meta: { releaseDate, tag } - GitHub release'inden gelen gerçek yayın bilgisi.
 */
export const parseYamlText = (rawText, sourceName = "dosya", meta = {}) => {
  if (!rawText || typeof rawText !== "string" || rawText.trim() === "") {
    return { data: null, error: `"${sourceName}" dosyası boş veya okunamadı.` };
  }

  try {
    const cleanText = rawText
      .replace(/\t/g, "  ")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n/g, "\n");

    const parsedData = loadYaml(cleanText);

    // 1. HELM CHART FORMATI
    if (parsedData && Array.isArray(parsedData.dependencies)) {
      const chartName = parsedData.name ? normalizeName(parsedData.name) : "Ilgin";
      // Chart içindeki sürüm bir placeholder olabilir; sırasıyla tag ve dosya adına düşeriz.
      const chartVersion = pickVersion(parsedData.version, meta.tag, sourceName);

      const formattedVersion = {
        name: chartVersion ? `${chartName} - Chart ${chartVersion}` : `${chartName} - Chart`,
        chartName,
        chartVersion,
        appVersion: parsedData.appVersion ? String(parsedData.appVersion) : "",
        description: parsedData.description ? String(parsedData.description) : "",
        releaseDate: meta.releaseDate || "",
        services: toServiceList(parsedData.dependencies),
      };

      return { data: { versions: [formattedVersion] }, error: null };
    }

    // 2. ESKİ FORMAT DESTEĞİ
    if (parsedData && Array.isArray(parsedData.versions)) {
      const versions = parsedData.versions.map(normalizeLegacyEntry).filter(Boolean);
      return { data: { versions }, error: null };
    }

    return {
      data: null,
      error: "YAML dosyasında 'dependencies' veya 'versions' adında bir liste bulunamadı!",
    };
  } catch (err) {
    console.error("YAML Parse Hatası Detayı:", err);
    return { data: null, error: `YAML dosyası okunamadı: ${err.message}` };
  }
};

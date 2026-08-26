// TFS'teki chart reposunun tag'lerinden Chart.yaml içeriklerini toplayıp
// public/ altına tek bir YAML dosyası olarak yazar.
//
// Repo yapısı sabit: her tag'de chart dosyası her zaman
// "helm-chart/Chart.yaml" yolunda bulunuyor. Bu yüzden dosya aramaya/
// içerikten tahmin etmeye gerek yok, doğrudan bu yoldan okunuyor.
//
// Kullanım:
//   TFS_REPO_URL="https://tfs.sirket.com/.../ilgin-charts" node scripts/fetch-tfs-versions.mjs
//
// Opsiyonel env değişkenleri:
//   OUTPUT_FILE  - çıktı dosyası (varsayılan: "public/tfs-versions.yaml")
//   WORK_DIR     - TFS'in clone edileceği geçici klasör (varsayılan: ".tfs-cache")

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { load as loadYaml, dump as dumpYaml } from "js-yaml";

const TFS_REPO_URL = process.env.TFS_REPO_URL;
const OUTPUT_FILE = process.env.OUTPUT_FILE || "public/tfs-versions.yaml";
const WORK_DIR = process.env.WORK_DIR || ".tfs-cache";

// Chart dosyasının repo içindeki sabit yolu.
const CHART_PATH = "helm-chart/Chart.yaml";

if (!TFS_REPO_URL) {
  console.error("TFS_REPO_URL tanımlı değil. Örnek:");
  console.error('  TFS_REPO_URL="https://tfs.sirket.com/.../ilgin-charts" node scripts/fetch-tfs-versions.mjs');
  process.exit(1);
}

// WORK_DIR içinde git komutlarını çalıştırmak için küçük yardımcı.
const git = (args) =>
  execFileSync("git", args, { cwd: WORK_DIR, encoding: "utf8" }).trim();

function ensureRepo() {
  // mkdirSync ve git init zaten var olan bir repo/klasör için no-op'tur,
  // ayrıca varlık kontrolüne gerek yok.
  mkdirSync(WORK_DIR, { recursive: true });
  execFileSync("git", ["init", "-q"], { cwd: WORK_DIR });

  // "secondary" zaten varsa add hata verir; o durumda URL'i güncelleriz.
  // Bu sayede TFS_REPO_URL sonradan değişse bile eski remote'a takılı kalmaz.
  // stdio: "pipe" ile git'in "already exists" hatasının konsola sızması engelleniyor.
  try {
    execFileSync("git", ["remote", "add", "secondary", TFS_REPO_URL], {
      cwd: WORK_DIR,
      stdio: "pipe",
    });
  } catch {
    git(["remote", "set-url", "secondary", TFS_REPO_URL]);
  }

  console.log(`TFS'e bağlanılıyor: ${TFS_REPO_URL}`);
  git(["fetch", "secondary", "--tags"]);
}

function listTags() {
  const raw = git(["tag", "-l"]);
  return raw ? raw.split("\n").filter(Boolean) : [];
}

// Annotated ya da lightweight tag fark etmeksizin, tag'in işaret ettiği
// commit'in tarihini ve yazarını okur.
function tagMeta(tag) {
  const format = "%an|%aI";
  const out = git(["log", "-1", `--format=${format}`, tag]);
  const [taggerName, isoDate] = out.split("|");
  return {
    taggerName: taggerName || "",
    releaseDate: isoDate ? isoDate.slice(0, 10) : "",
  };
}

// Belirli bir tag'deki belirli bir dosyayı okuyup JS objesine çevirmeye çalışır.
function readYamlAt(tag, filePath) {
  try {
    const text = git(["show", `${tag}:${filePath}`]);
    return loadYaml(text);
  } catch (err) {
    console.warn(`[atlandı] ${tag}:${filePath} parse edilemedi (${err.message})`);
    return null;
  }
}

function buildVersionEntry(tag) {
  const chart = readYamlAt(tag, CHART_PATH);
  if (!chart) {
    console.warn(`[atlandı] ${tag}: ${CHART_PATH} bulunamadı ya da parse edilemedi.`);
    return { tag, failed: true };
  }

  const { taggerName, releaseDate } = tagMeta(tag);
  const chartVersion = String(chart.version || tag.replace(/^v/, ""));
  const chartName = chart.name || "Ilgin";

  const services = (chart.dependencies || [])
    .filter((d) => d && d.name)
    .map((d) => ({
      name: d.name,
      version: d.version ? String(d.version) : "belirtilmedi",
      repository: d.repository || "",
    }));

  return {
    entry: {
      tag,
      name: `${chartName} - Chart ${chartVersion}`,
      chartName,
      chartVersion,
      appVersion: chart.appVersion ? String(chart.appVersion) : "",
      description: chart.description || "",
      releaseDate,
      taggerName,
      sourceFile: CHART_PATH,
      services,
    },
  };
}

// Önceki çalıştırmada yazılmış OUTPUT_FILE varsa okur. Bu dosya, daha önce
// işlenmiş tag'ler için bir "önbellek" görevi görür: aynı tag'i tekrar
// git show/git log ile işlemeye gerek kalmaz, doğrudan buradan okunur.
function loadExistingVersions() {
  try {
    const raw = readFileSync(path.resolve(OUTPUT_FILE), "utf8");
    const data = loadYaml(raw);
    return Array.isArray(data?.versions) ? data.versions : [];
  } catch {
    return [];
  }
}

function main() {
  ensureRepo(); //mkdir WORK_DIR, git init, git remote add secondary <TFS_REPO_URL>, git fetch secondary --tags

  const tags = listTags(); //git tag -l çalışturır
  console.log(`${tags.length} tag bulundu.`);

  const existingByTag = new Map(
    loadExistingVersions()
      .filter((v) => v && v.tag)
      .map((v) => [v.tag, v])
  );

  const newTagCount = tags.filter((t) => !existingByTag.has(t)).length;
  console.log(
    `${newTagCount} yeni tag işlenecek, ${tags.length - newTagCount} tanesi önceki çıktıdan okunacak.`
  );

  const versions = [];
  const skipped = [];

  for (const tag of tags) {
    const cached = existingByTag.get(tag);
    if (cached) {
      versions.push(cached);
      continue;
    }

    const result = buildVersionEntry(tag);
    if (result.failed) {
      skipped.push(tag);
      continue;
    }
    versions.push(result.entry);
  }
//resolve ile OUTPUT_FILE yolunu absolute path'e çeviriyoruz, sonra dumpYaml ile versiyonları yaml formatına çevirip writeFileSync ile dosyaya yazıyoruz.
  const outPath = path.resolve(OUTPUT_FILE);
  writeFileSync(outPath, dumpYaml({ versions }), "utf8");

  console.log(`Yazıldı: ${outPath} (${versions.length} versiyon)`);
  if (skipped.length) {
    console.warn(`${CHART_PATH} bulunamadığı için atlanan tag'ler: ${skipped.join(", ")}`);
  }
}

main();

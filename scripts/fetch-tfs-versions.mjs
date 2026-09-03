// TFS'teki chart reposunun tag'lerinden Chart.yaml içeriklerini toplayıp
// public/ altına tek bir YAML dosyası olarak yazar.
//
// Repo yapısı sabit: her tag'de chart dosyası her zaman
// "helm-chart/Chart.yaml" yolunda bulunuyor. Tag adları da doğrudan
// sürüm numarasıdır (örn. "1.76.0").
//
// Kullanım:
//   TFS_REPO_URL="https://tfs.sirket.com/.../hakim-charts" node scripts/fetch-tfs-versions.mjs
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

// Chart dosyasının repo içindeki sabit yolu (her tag'de aynı).
const CHART_PATH = "helm-chart/Chart.yaml";

if (!TFS_REPO_URL) {
  console.error("TFS_REPO_URL tanımlı değil. Örnek:");
  console.error('  TFS_REPO_URL="https://tfs.sirket.com/.../hakim-charts" node scripts/fetch-tfs-versions.mjs');
  process.exit(1);
}

// WORK_DIR içinde git komutlarını çalıştırmak için küçük yardımcı.
const git = (args, options = {}) =>
  execFileSync("git", args, { cwd: WORK_DIR, encoding: "utf8", ...options }).trim();

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
  // --force: repodaki bir tag silinip aynı isimle farklı bir commit'e yeniden
  // oluşturulmuşsa (repo sadece okunduğu için burada güvenli), git normalde
  // "would clobber existing tag" diyip fetch'in tamamını reddediyordu.
  // --prune --prune-tags: GitHub'da silinen bir tag lokal .tfs-cache'te
  // kalmaya devam etmesin; cache her zaman uzak repoyla birebir eşit kalsın.
  git(["fetch", "secondary", "--tags", "--force", "--prune", "--prune-tags"]);
}

function listTags() {
  const raw = git(["tag", "-l"]);
  return raw ? raw.split("\n").filter(Boolean) : [];
}

// Annotated ya da lightweight tag fark etmeksizin, tag'in işaret ettiği
// commit'in hash'ini, tarihini ve yazarını okur.
function tagMeta(tag) {
  const format = "%H|%an|%aI";
  const out = git(["log", "-1", `--format=${format}`, tag]);
  const [commit, taggerName, isoDate] = out.split("|");
  return {
    commit: commit || "",
    taggerName: taggerName || "",
    releaseDate: isoDate ? isoDate.slice(0, 10) : "",
  };
}

// Belirli bir tag'deki belirli bir dosyayı okuyup JS objesine çevirmeye çalışır.
// silent: true iken git'in "path does not exist" hatası konsola sızmaz
// (yedek yollar denenirken bu beklenen bir durum, hata gibi görünmemeli).
function readYamlAt(tag, filePath, { silent = false } = {}) {
  if (!silent) console.log(`  dosya çekiliyor: ${tag}:${filePath}`);
  try {
    const text = git(["show", `${tag}:${filePath}`], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (!silent) console.log(`  dosya çekildi (${text.length} karakter), parse ediliyor...`);
    return loadYaml(text);
  } catch (err) {
    if (!silent) console.warn(`[atlandı] ${tag}:${filePath} parse edilemedi (${err.message})`);
    return null;
  }
}

// Çoğu tag "helm-chart/Chart.yaml" kullanıyor; bazı eski tag'ler (örn. 1.74.3)
// repo standart klasör düzenine geçmeden önce oluşturulmuş ve dosyayı
// "<tag>/HelmChart.yaml" yolunda tutuyor. Önce standart yol denenir, o yoksa
// eski düzen denenir.
function chartCandidatePaths(tag) {
  return [CHART_PATH, `${tag}/HelmChart.yaml`];
}

function buildVersionEntry(tag) {
  console.log(`[${tag}] işleniyor...`);

  const candidates = chartCandidatePaths(tag);
  let chart = null;
  let usedPath = null;
  for (let i = 0; i < candidates.length; i++) {
    const filePath = candidates[i];
    const isLastCandidate = i === candidates.length - 1;
    chart = readYamlAt(tag, filePath, { silent: !isLastCandidate });
    if (chart) {
      usedPath = filePath;
      break;
    }
  }

  if (!chart) {
    console.warn(`[atlandı] ${tag}: denenen yollarda (${candidates.join(", ")}) chart bulunamadı.`);
    return { tag, failed: true };
  }

  const { commit, taggerName, releaseDate } = tagMeta(tag);
  // (tag'ler TFS'te her zaman temiz sürüm numarasıdır "1.75.0" gibi).
  const chartVersion = tag.replace(/^v/, "");
  const chartName = chart.name || "";

  const services = (chart.dependencies || [])
    .filter((d) => d && d.name)
    .map((d) => ({
      name: d.name,
      version: d.version ? String(d.version) : "belirtilmedi",
      repository: d.repository || "",
    }));

  const name = [chartName, `Chart ${chartVersion}`].filter(Boolean).join(" - ");

  return {
    entry: {
      tag,
      commit,
      name,
      chartName,
      chartVersion,
      appVersion: chart.appVersion ? String(chart.appVersion) : "",
      description: chart.description || "",
      releaseDate,
      taggerName,
      sourceFile: usedPath,
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
    console.warn(`Chart dosyası bulunamadığı için atlanan tag'ler: ${skipped.join(", ")}`);
  }
  console.log
}

main();

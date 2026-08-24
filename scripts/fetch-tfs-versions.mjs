// TFS'teki chart reposunun tag'lerinden Chart.yaml içeriklerini toplayıp
// public/ altına tek bir YAML dosyası olarak yazar.
//
// Repo içinde chart dosyasının adı/yolu tag'den tag'e değişiyor
// (Chart.yaml, HelmChart.yaml, ilgin-chart-1.74.3.yaml, vb.).
// Dosya adına güvenmek yerine İÇERİĞE bakıyoruz: apiVersion/version/
// dependencies alanları olan her .yaml dosyası bir "chart adayı" sayılır.
// Bir tag'de birden fazla aday varsa (örn. eski sürümlerin dosyaları
// yeni tag'lerde de repoda kalmaya devam ediyor), tag adıyla eşleşen
// versiyon tercih edilir.
//
// Kullanım:
//   TFS_REPO_URL="https://tfs.sirket.com/.../ilgin-charts" node scripts/fetch-tfs-versions.mjs
//
// Opsiyonel env değişkenleri:
//   OUTPUT_FILE  - çıktı dosyası (varsayılan: "public/tfs-versions.yaml")
//   WORK_DIR     - TFS'in clone edileceği geçici klasör (varsayılan: ".tfs-cache")

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { load as loadYaml, dump as dumpYaml } from "js-yaml";

const TFS_REPO_URL = process.env.TFS_REPO_URL;
const OUTPUT_FILE = process.env.OUTPUT_FILE || "public/tfs-versions.yaml";
const WORK_DIR = process.env.WORK_DIR || ".tfs-cache";

if (!TFS_REPO_URL) {
  console.error("TFS_REPO_URL tanımlı değil. Örnek:");
  console.error('  TFS_REPO_URL="https://tfs.sirket.com/.../ilgin-charts" node scripts/fetch-tfs-versions.mjs');
  process.exit(1);
}

// WORK_DIR içinde git komutlarını çalıştırmak için küçük yardımcı.
const git = (args) =>
  execFileSync("git", args, { cwd: WORK_DIR, encoding: "utf8" }).trim();

function ensureRepo() {
  if (!existsSync(WORK_DIR)) {
    mkdirSync(WORK_DIR, { recursive: true });
    execFileSync("git", ["init"], { cwd: WORK_DIR });
  }

  const remotes = (() => {
    try {
      return execFileSync("git", ["remote"], { cwd: WORK_DIR, encoding: "utf8" });
    } catch {
      return "";
    }
  })();

  if (!remotes.includes("secondary")) {
    git(["remote", "add", "secondary", TFS_REPO_URL]);
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

function readYamlAt(tag, filePath) {
  try {
    const text = git(["show", `${tag}:${filePath}`]);
    return loadYaml(text);
  } catch (err) {
    console.warn(`[atlandı] ${tag}:${filePath} parse edilemedi (${err.message})`);
    return null;
  }
}

// Bir YAML objesinin Helm chart şemasına benzeyip benzemediğini içeriğe
// bakarak anlar (dosya adına bakmaz).
function looksLikeChart(obj) {
  if (!obj || typeof obj !== "object") return false;
  return Array.isArray(obj.dependencies) || (Boolean(obj.apiVersion) && Boolean(obj.version));
}

// Chart içeriği .yaml/.yml uzantısıyla olabildiği gibi hiç uzantısız da
// olabiliyor (örn. dosya adı direkt "1.76.0" — versiyon numarası, içinde
// nokta var ama uzantı değil). Bu yüzden ".yaml" uzantısına göre ya da
// "nokta var mı" diye filtrelemek yanıltıcı; bunun yerine kesinlikle
// chart olamayacak bilinen uzantıları (görsel, doküman, kilit dosyası
// vb.) hariç tutup geri kalan her dosyayı aday sayıyoruz. Gerçek filtre
// zaten looksLikeChart() ile içerik üzerinden yapılıyor.
const NON_CANDIDATE_EXT =
  /\.(png|jpe?g|gif|svg|ico|webp|zip|gz|tgz|tar|7z|pdf|woff2?|ttf|eot|lock|md|markdown|txt|json|jsonc|js|mjs|cjs|ts|tsx|jsx|css|scss|html?)$/i;
const isCandidateFile = (filePath) => !NON_CANDIDATE_EXT.test(filePath);

// Tag'in tüm dosya ağacını tarayıp içerik olarak chart şemasına
// uyanları "aday" olarak döner.
function findChartCandidates(tag) {
  let tree;
  try {
    tree = git(["ls-tree", "-r", "--name-only", tag]);
  } catch {
    return [];
  }

  const files = tree.split("\n").filter(isCandidateFile);

  return files
    .map((filePath) => ({ filePath, chart: readYamlAt(tag, filePath) }))
    .filter(({ chart }) => looksLikeChart(chart));
}

// Tag'in işaret ettiği (dereference edilmiş) commit'in SHA'sı.
function tagCommitSha(tag) {
  try {
    return git(["rev-list", "-n", "1", tag]);
  } catch {
    return null;
  }
}

// O commit'te değişen/eklenen dosya yollarının seti. Bir sürümün kendi
// chart dosyası genelde tam o release'in commit'inde değişir; eski
// sürümlerden kalan dosyalar ise repoda dursa da o commit'te değişmez.
function filesChangedInCommit(commitSha) {
  try {
    const out = git(["show", "--name-only", "--format=", commitSha]);
    return new Set(out.split("\n").filter(Boolean));
  } catch {
    return new Set();
  }
}

// "1.76.0-test" gibi metinleri karşılaştırılabilir parçalara ayırır.
function versionSortKey(v) {
  return String(v)
    .replace(/^v/, "")
    .split(/[.\-]/)
    .map((p) => (p !== "" && !isNaN(Number(p)) ? Number(p) : p));
}

function compareVersionsDesc(a, b) {
  const pa = versionSortKey(a);
  const pb = versionSortKey(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return y - x;
    return String(y).localeCompare(String(x));
  }
  return 0;
}

const candidateVersionLabel = (c) => c.chart.version || c.filePath;

// Aynı tag içinde birden fazla aday bulunabiliyor çünkü önceki sürümlerin
// dosyaları repoda kalmaya devam ediyor. Öncelik sırası:
//   1) Bu tag'in kendi commit'inde asıl değişen dosya (en güvenilir sinyal)
//   2) İçerikteki "version" alanı tag adıyla birebir eşleşen dosya
//   3) Dosya adında tag'in versiyonu geçen dosya
//   4) Hiçbiri netleşmezse en yüksek versiyonlu aday (uyarı basılır)
function pickMainCandidate(tag, candidates) {
  const targetVersion = tag.replace(/^v/, "");

  const tagSha = tagCommitSha(tag);
  if (tagSha) {
    const changed = filesChangedInCommit(tagSha);
    const touched = candidates.filter((c) => changed.has(c.filePath));
    if (touched.length === 1) return touched[0];
    if (touched.length > 1) {
      return [...touched].sort((a, b) =>
        compareVersionsDesc(candidateVersionLabel(a), candidateVersionLabel(b))
      )[0];
    }
  }

  const byContentVersion = candidates.find((c) => String(c.chart.version || "") === targetVersion);
  if (byContentVersion) return byContentVersion;

  const byFileName = candidates.find((c) => c.filePath.includes(targetVersion));
  if (byFileName) return byFileName;

  const sorted = [...candidates].sort((a, b) =>
    compareVersionsDesc(candidateVersionLabel(a), candidateVersionLabel(b))
  );
  if (candidates.length > 1) {
    console.warn(
      `${tag}: ${candidates.length} chart adayı var, netleşmedi, "${sorted[0].filePath}" seçildi (adaylar: ${candidates
        .map((c) => c.filePath)
        .join(", ")})`
    );
  }
  return sorted[0];
}

// Helm'in resmi subchart konvansiyonu: bir "charts/" klasörünün altında
// her servisin kendi klasörü ve kendi chart dosyası olur
// (örn. charts/ilgin-backend/Chart.yaml). Yol içinde herhangi bir
// seviyede "charts/" geçen dosyalar subchart sayılır, ana chart sayılmaz.
const isSubchartPath = (filePath) => /(^|\/)charts\//i.test(filePath);

function buildVersionEntry(tag) {
  const candidates = findChartCandidates(tag);
  if (!candidates.length) {
    console.warn(`[atlandı] ${tag}: ağaçta chart şemasına uyan bir .yaml bulunamadı.`);
    return { tag, failed: true };
  }

  const rootCandidates = candidates.filter((c) => !isSubchartPath(c.filePath));
  const subchartCandidates = candidates.filter((c) => isSubchartPath(c.filePath));

  // Kök chart yoksa (hepsi charts/ altındaysa) elimizdeki adaylardan seçeriz.
  const main = pickMainCandidate(tag, rootCandidates.length ? rootCandidates : candidates);
  const { chart, filePath } = main;

  const { taggerName, releaseDate } = tagMeta(tag);
  const chartVersion = String(chart.version || tag.replace(/^v/, ""));
  const chartName = chart.name || "Ilgin";

  // charts/<servis>/Chart.yaml dosyaları varsa servis listesi doğrudan
  // oradan (gerçek dosya içeriğinden) kurulur; yoksa eski davranışa
  // dönüp ana chart'ın "dependencies" alanı kullanılır.
  const services = subchartCandidates.length
    ? subchartCandidates
        .filter((c) => c.filePath !== filePath)
        .map((c) => ({
          name: c.chart.name || path.basename(path.dirname(c.filePath)),
          version: c.chart.version ? String(c.chart.version) : "belirtilmedi",
          repository: c.filePath,
        }))
    : (chart.dependencies || [])
        .filter((d) => d && d.name)
        .map((d) => ({
          name: d.name,
          version: d.version ? String(d.version) : "belirtilmedi",
          repository: d.repository || "",
        }));

  return {
    entry: {
      name: `${chartName} - Chart ${chartVersion}`,
      chartName,
      chartVersion,
      appVersion: chart.appVersion ? String(chart.appVersion) : "",
      description: chart.description || "",
      releaseDate,
      taggerName,
      sourceFile: filePath,
      services,
    },
  };
}

function main() {
  ensureRepo(); //mkdir WORK_DIR, git init, git remote add secondary <TFS_REPO_URL>, git fetch secondary --tags


  const tags = listTags(); //git tag -l çalışturır
  console.log(`${tags.length} tag bulundu.`);

  const versions = [];
  const skipped = [];

  for (const tag of tags) {
    const result = buildVersionEntry(tag);
    if (result.failed) {
      skipped.push(tag);
      continue;
    }
    versions.push(result.entry);
  }

  const outPath = path.resolve(OUTPUT_FILE);
  writeFileSync(outPath, dumpYaml({ versions }), "utf8");

  console.log(`Yazıldı: ${outPath} (${versions.length} versiyon)`);
  if (skipped.length) {
    console.warn(`Chart şemasına uyan dosya bulunamadığı için atlanan tag'ler: ${skipped.join(", ")}`);
  }
}

main();

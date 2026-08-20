// TFS'teki chart reposunun tag'lerinden Chart.yaml içeriklerini toplayıp
// public/ altına tek bir YAML dosyası olarak yazar.
//
// Kullanım:
//   TFS_REPO_URL="https://tfs.sirket.com/.../ilgin-charts" node scripts/fetch-tfs-versions.mjs
//
// Opsiyonel env değişkenleri:
//   CHART_PATH   - repo içindeki Chart.yaml yolu (varsayılan: "Chart.yaml")
//   OUTPUT_FILE  - çıktı dosyası (varsayılan: "public/tfs-versions.yaml")
//   WORK_DIR     - TFS'in clone edileceği geçici klasör (varsayılan: ".tfs-cache")

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { load as loadYaml, dump as dumpYaml } from "js-yaml";

const TFS_REPO_URL = process.env.TFS_REPO_URL;
const CHART_PATH = process.env.CHART_PATH || "Chart.yaml";
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

function readChartYaml(tag) {
  try {
    return git(["show", `${tag}:${CHART_PATH}`]);
  } catch {
    return null;
  }
}

function buildVersionEntry(tag) {
  const text = readChartYaml(tag);
  if (!text) return { tag, failed: true };

  let chart;
  try {
    chart = loadYaml(text);
  } catch (err) {
    console.warn(`[atlandı] ${tag}: Chart.yaml parse edilemedi (${err.message})`);
    return { tag, failed: true };
  }

  const { taggerName, releaseDate } = tagMeta(tag);
  const chartVersion = String(chart.version || tag.replace(/^v/, ""));
  const chartName = chart.name || "Ilgin";

  return {
    entry: {
      name: `${chartName} - Chart ${chartVersion}`,
      chartName,
      chartVersion,
      appVersion: chart.appVersion ? String(chart.appVersion) : "",
      description: chart.description || "",
      releaseDate,
      taggerName,
      services: (chart.dependencies || [])
        .filter((d) => d && d.name)
        .map((d) => ({
          name: d.name,
          version: d.version ? String(d.version) : "belirtilmedi",
          repository: d.repository || "",
        })),
    },
  };
}

function main() {
  ensureRepo();

  const tags = listTags();
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
    console.warn(`Chart.yaml bulunamadığı için atlanan tag'ler: ${skipped.join(", ")}`);
  }
}

main();

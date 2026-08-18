// Gecici dogrulama betigi - GitHub zincirini uctan uca calistirir.
import { fetchReleaseYamls } from "./src/utils/githubReleases.js";
import { parseYamlText } from "./src/utils/yamlParser.js";
import { compareSemVerDesc } from "./src/utils/semver.js";

const { items, skipped, hasMore } = await fetchReleaseYamls();
console.log(`indirilen: ${items.length} | atlanan: ${skipped.length} | hasMore: ${hasMore}`);

const merged = [];
const seen = new Set();
for (const { text, tag, fileName, releaseDate } of items) {
  const { data, error } = parseYamlText(text, fileName || tag, { tag, releaseDate });
  if (error) {
    console.log("PARSE HATASI", tag, error);
    continue;
  }
  for (const v of data.versions) {
    const key = `${v.name}@${v.chartVersion || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(v);
  }
}

merged.sort(compareSemVerDesc);
console.log("\nEKRANDA GORUNECEKLER:");
for (const v of merged) {
  console.log(`  ${v.name} | tarih: ${v.releaseDate || "-"} | ${v.services.length} servis`);
  for (const s of v.services) console.log(`      - ${s.name}: ${s.version}`);
}

const map = new Map();
merged.forEach((v) => v.services.forEach((d) => {
  if (!map.has(d.name)) map.set(d.name, new Set());
  map.get(d.name).add(d.version);
}));
console.log("\nSERVIS FILTRESI:");
[...map.keys()].sort().forEach((k) => console.log(`  ${k} -> ${[...map.get(k)].join(", ")}`));

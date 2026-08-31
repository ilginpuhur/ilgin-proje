// Performans testi için sahte, büyük ölçekli bir tfs-versions.yaml üretir.
// Gerçek veriye dokunmaz; public/test-large.yaml'a yazar.
//
// Kullanım:
//   node scripts/gen-test-data.mjs [adet]
//
// Sonra tarayıcıda:
//   http://localhost:5173/?dataUrl=/test-large.yaml

import { writeFileSync } from "node:fs";
import path from "node:path";
import { dump as dumpYaml } from "js-yaml";

const COUNT = Number(process.argv[2]) || 300;
const OUTPUT_FILE = "public/test-large.yaml";

const versions = Array.from({ length: COUNT }, (_, i) => {
  const n = COUNT - i; // en yüksek numara en üstte olsun
  const chartVersion = `1.${n}.0`;
  return {
    tag: chartVersion,
    name: `hakim - Chart ${chartVersion}`,
    chartName: "hakim",
    chartVersion,
    appVersion: "",
    description: "hakim helm chart (test verisi)",
    releaseDate: "2026-08-24",
    taggerName: "test",
    sourceFile: `${chartVersion}/HelmChart.yaml`,
    services: [
      { name: "hakim-backend", version: `${chartVersion}`, repository: "@hakim-helm" },
      { name: "hakim-ui", version: `${1}.${(n % 20) + 1}.0`, repository: "@hakim-helm" },
      { name: "hakim-infra", version: `1.${(n % 30) + 1}.0`, repository: "@hakim-helm" },
      { name: "pirireis-gis", version: `0.${(n % 10) + 1}.${n % 5}`, repository: "@hakim-helm" },
    ],
  };
});

const outPath = path.resolve(OUTPUT_FILE);
writeFileSync(outPath, dumpYaml({ versions }), "utf8");
console.log(`Yazıldı: ${outPath} (${versions.length} versiyon)`);

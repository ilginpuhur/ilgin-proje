import * as yaml from "js-yaml";

/**
 * Ham YAML metnini parse edip { versions: [...] } formatına çevirir.
 * State'e dokunmaz; başarı durumunda { data, error: null },
 * hata durumunda { data: null, error: "mesaj" } döner.
 */
export const parseYamlText = (rawText, sourceName = "dosya") => {
  if (!rawText || typeof rawText !== "string" || rawText.trim() === "") {
    return { data: null, error: `"${sourceName}" dosyası boş veya okunamadı.` };
  }

  try {
    const cleanText = rawText
      .replace(/\t/g, "  ")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n/g, "\n");

    const parseFn = yaml.load || yaml.default?.load;
    const parsedData = parseFn(cleanText);

    // 1. HELM CHART FORMATI KONTROLÜ
    if (parsedData && Array.isArray(parsedData.dependencies)) {
      const formattedVersion = {
        name: `${parsedData.name || "Hakim"} - Chart ${parsedData.version || ""}`.trim(),
        releaseDate: new Date().toLocaleDateString("tr-TR"),
      };

      // 2. DEPENDENCIES DIZISINI GEZ
      parsedData.dependencies.forEach((dep) => {
        if (!dep || !dep.name) return;
        const rawName = String(dep.name).trim();
        const serviceVersion = dep.version ? String(dep.version) : "belirtilmedi";
        formattedVersion[rawName] = serviceVersion;
      });

      return { data: { versions: [formattedVersion] }, error: null };
    }

    // 2. ESKİ FORMAT DESTEĞİ
    if (parsedData && Array.isArray(parsedData.versions)) {
      return { data: parsedData, error: null };
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

import { useState, useEffect, useMemo, useCallback } from "react";
import { compareSemVerDesc } from "../utils/semver";
import { parseYamlText } from "../utils/yamlParser";

const STORAGE_KEY_DATA = "Ilgin_versions_data";
const STORAGE_KEY_FILE_NAME = "Ilgin_versions_filename";

export function useIlginVersions() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DATA);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("localStorage okuma hatası:", e);
      }
    }
    return { versions: [] };
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [fileName, setFileName] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_FILE_NAME) || "Ilgin-versions.yaml";
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [urlLoading, setUrlLoading] = useState(false);

  const updateDataAndStore = useCallback((newData, newFileName) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(newData));

    if (newFileName) {
      setFileName(newFileName);
      localStorage.setItem(STORAGE_KEY_FILE_NAME, newFileName);
    }
  }, []);

  // YAML Objesini Standart Versiyon Formatına Çeviren Yardımcı
  const normalizeYamlToVersions = (parsedData, fallbackTag = "") => {
    if (!parsedData) return [];
    
    // Eğer dosya içinde 'versions' dizisi varsa onu kullan
    if (Array.isArray(parsedData.versions)) {
      return parsedData.versions;
    }
    
    // Standart Helm Chart yapısındaysa (name, version vs.) tekil versiyon objesi oluştur
    if (parsedData.name || parsedData.version) {
      return [{
        name: parsedData.name || "ilgin-chart",
        version: parsedData.version || fallbackTag || "1.0.0",
        appVersion: parsedData.appVersion || parsedData.version || "",
        description: parsedData.description || "GitHub Tag/Release Sürümü",
        ...parsedData
      }];
    }
    return [];
  };

  // Birden fazla GitHub Release / Tag metnini birleştirip ekrana basan fonksiyon
  const loadMultipleYamlTexts = useCallback((yamlItems) => {
    setLoading(true);
    setError(null);

    const mergedVersions = [];

    yamlItems.forEach(({ text, tag, fileName: sourceFile }) => {
      const { data: parsed } = parseYamlText(text, sourceFile || tag);
      if (parsed) {
        const extracted = normalizeYamlToVersions(parsed, tag);
        extracted.forEach((newVer) => {
          // Aynı versiyon numarası varsa çakışmayı önle/güncelle
          const exists = mergedVersions.some(
            (v) => v.name === newVer.name && v.version === newVer.version
          );
          if (!exists) {
            mergedVersions.push(newVer);
          }
        });
      }
    });

    if (mergedVersions.length > 0) {
      updateDataAndStore({ versions: mergedVersions }, `GitHub'dan ${mergedVersions.length} Sürüm Yüklendi`);
    } else {
      setError("GitHub dosyaları parse edilemedi veya geçerli versiyon bulunamadı.");
    }
    setLoading(false);
  }, [updateDataAndStore]);

  const applyParsedResult = useCallback((rawText, sourceName) => {
    const { data: parsed, error: parseError } = parseYamlText(rawText, sourceName);
    if (parseError) {
      setError(parseError);
      return;
    }
    const versions = normalizeYamlToVersions(parsed);
    updateDataAndStore({ versions }, sourceName);
    setError(null);
  }, [updateDataAndStore]);

  useEffect(() => {
    const hasStoredData = localStorage.getItem(STORAGE_KEY_DATA);
    if (hasStoredData) return;

    setLoading(true);
    fetch("/Ilgin-versions.yaml")
      .then((res) => {
        if (!res.ok) throw new Error("Varsayılan Ilgin-versions.yaml bulunamadı.");
        return res.text();
      })
      .then((text) => applyParsedResult(text, "Ilgin-versions.yaml"))
      .catch((err) => {
        console.warn("Otomatik dosya okuma uyarısı:", err.message);
      })
      .finally(() => setLoading(false));
  }, [applyParsedResult]);

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawText = e.target?.result;
      if (typeof rawText !== "string") return;

      const { data: parsed, error: parseError } = parseYamlText(rawText, file.name);
      if (parseError) {
        setError(parseError);
        return;
      }

      const newVersions = normalizeYamlToVersions(parsed);
      const existing = Array.isArray(data?.versions) ? data.versions : [];
      const merged = [...existing];

      newVersions.forEach((nv) => {
        const idx = merged.findIndex((v) => v.name === nv.name && v.version === nv.version);
        if (idx >= 0) merged[idx] = nv;
        else merged.push(nv);
      });

      updateDataAndStore({ versions: merged }, `Son eklenen: ${file.name}`);
    };
    reader.readAsText(file);
  };

  const fetchFromUrl = useCallback(async (targetUrl) => {
    if (!targetUrl) return;

    setUrlLoading(true);
    setError(null);

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      
      const fileNameOnly = targetUrl.split("/").pop();
      const { data: parsed, error: parseError } = parseYamlText(text, fileNameOnly);

      if (parseError) {
        setError(parseError);
      } else {
        const extracted = normalizeYamlToVersions(parsed);
        if (extracted.length > 0) {
          updateDataAndStore({ versions: extracted }, "URL'den yüklendi");
        } else {
          setError("YAML okundu fakat geçerli versiyon verisi çıkarılamadı.");
        }
      }
    } catch (err) {
      console.error("URL'den çekme hatası:", err.message);
      setError("Dosya çekilirken hata oluştu: " + err.message);
    } finally {
      setUrlLoading(false);
    }
  }, [updateDataAndStore]);

  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEY_DATA);
    localStorage.removeItem(STORAGE_KEY_FILE_NAME);
    setData({ versions: [] });
    setFileName("Ilgin-versions.yaml");
  };

  const sortedVersions = useMemo(() => {
    const list = Array.isArray(data?.versions) ? [...data.versions] : [];
    return list.sort(compareSemVerDesc);
  }, [data]);

  const filteredVersions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sortedVersions;

    return sortedVersions.filter((v) => {
      const valuesToSearch = Object.values(v || {}).flatMap((val) =>
        typeof val === "object" && val !== null ? Object.values(val) : val
      );
      return valuesToSearch.some((val) =>
        val != null && String(val).toLowerCase().includes(term)
      );
    });
  }, [sortedVersions, searchTerm]);

  return {
    loading,
    error,
    fileName,
    searchTerm,
    setSearchTerm,
    sortedVersions,
    filteredVersions,
    handleFileUpload,
    fetchFromUrl,
    loadMultipleYamlTexts,
    urlLoading,
    clearStorage,
  };
}
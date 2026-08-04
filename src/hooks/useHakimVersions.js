import { useState, useEffect, useMemo, useCallback } from "react";
import { compareSemVerDesc } from "../utils/semver";
import { parseYamlText } from "../utils/yamlParser";

const STORAGE_KEY_DATA = "hakim_versions_data";
const STORAGE_KEY_FILE_NAME = "hakim_versions_filename";

/**
 * Hakim versiyon verisinin okunması, yüklenmesi, sıralanması,
 * aranması ve localStorage ile kalıcı saklanması mantığını barındıran hook.
 */
export function useHakimVersions() {
  // 1. İlk açılışta veriyi localStorage'dan oku
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
    return localStorage.getItem(STORAGE_KEY_FILE_NAME) || "hakim-versions.yaml";
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [urlLoading, setUrlLoading] = useState(false);

  // Veriyi hem React State'e hem de localStorage'a kaydeden yardımcı fonksiyon
  const updateDataAndStore = useCallback((newData, newFileName) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(newData));

    if (newFileName) {
      setFileName(newFileName);
      localStorage.setItem(STORAGE_KEY_FILE_NAME, newFileName);
    }
  }, []);

  const applyParsedResult = useCallback((rawText, sourceName) => {
    const { data: parsed, error: parseError } = parseYamlText(rawText, sourceName);
    if (parseError) {
      setError(parseError);
      return;
    }
    updateDataAndStore(parsed, sourceName);
    setError(null);
  }, [updateDataAndStore]);

  // İlk açılış kontrolü: Eğer localStorage boşsa 'public/hakim-versions.yaml' dosyasını yükle
  useEffect(() => {
    const hasStoredData = localStorage.getItem(STORAGE_KEY_DATA);
    if (hasStoredData) return; // Zaten saklanmış veri varsa dışarıdan tekrar çekme

    setLoading(true);
    fetch("/hakim-versions.yaml")
      .then((res) => {
        if (!res.ok) throw new Error("Varsayılan hakim-versions.yaml bulunamadı.");
        return res.text();
      })
      .then((text) => applyParsedResult(text, "hakim-versions.yaml"))
      .catch((err) => {
        console.warn("Otomatik dosya okuma uyarısı:", err.message);
        setError("Varsayılan dosya yüklenemedi. Lütfen 'Farklı YAML Yükle' butonu ile dosyanızı seçin.");
      })
      .finally(() => setLoading(false));
  }, [applyParsedResult]);

  // Kullanıcının dosya yüklemesi -> mevcut listeyle birleştirir ve localStorage'a yazar
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawText = e.target?.result;
      if (typeof rawText !== "string") return;

      const { data: parsed, error: parseError } = parseYamlText(rawText, file.name);

      if (parseError || !parsed?.versions) {
        setError(parseError || `"${file.name}" dosyasından versiyon okunamadı.`);
        return;
      }

      // Yeni gelen versiyonları aynı isimli olanların üzerine yazıp listeye ekle
      const existing = Array.isArray(data?.versions) ? data.versions : [];
      const merged = [...existing];

      parsed.versions.forEach((newVersion) => {
        const idx = merged.findIndex((v) => v.name === newVersion.name);
        if (idx >= 0) {
          merged[idx] = newVersion;
        } else {
          merged.push(newVersion);
        }
      });

      const updatedData = { versions: merged };
      const updatedFileName = `Son eklenen: ${file.name}`;
      
      updateDataAndStore(updatedData, updatedFileName);
    };
    reader.readAsText(file);
  };

  // Verilen URL'den YAML içeriğini çekme ve kaydetme
  const fetchFromUrl = async (url) => {
    if (!url || !url.trim()) {
      setError("Lütfen geçerli bir URL girin.");
      return;
    }

    setUrlLoading(true);
    setError(null);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`URL ${res.status} koduyla döndü.`);
      }
      const text = await res.text();
      applyParsedResult(text, url);
    } catch (err) {
      console.error("URL'den çekme hatası:", err.message);
      setError(
        `URL'den veri çekilemedi: ${err.message}. Hedef site CORS'a izin vermiyor olabilir.`
      );
    } finally {
      setUrlLoading(false);
    }
  };

  // Saklanan verileri sıfırlayıp varsayılana dönme fonksiyonu
  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEY_DATA);
    localStorage.removeItem(STORAGE_KEY_FILE_NAME);
    setData({ versions: [] });
    setFileName("hakim-versions.yaml");
  };

  // Versiyonları sırala
  const sortedVersions = useMemo(() => {
    const list = Array.isArray(data?.versions) ? [...data.versions] : [];
    return list.sort(compareSemVerDesc);
  }, [data]);

  // Arama filtresi
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
    urlLoading,
    clearStorage,
  };
}
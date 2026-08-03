import { useState, useEffect, useMemo } from "react";
import { compareSemVerDesc } from "../utils/semver";
import { parseYamlText } from "../utils/yamlParser";

/**
 * Hakim versiyon verisinin okunması, yüklenmesi, sıralanması
 * ve aranmasıyla ilgili tüm mantığı barındıran hook.
 */
export function useHakimVersions() {
  const [data, setData] = useState({ versions: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [fileName, setFileName] = useState("hakim-versions.yaml");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [urlLoading, setUrlLoading] = useState(false);

  const applyParsedResult = (rawText, sourceName) => {
    const { data: parsed, error: parseError } = parseYamlText(rawText, sourceName);
    if (parseError) {
      setError(parseError);
      return;
    }
    setData(parsed);
    setError(null);
  };

  // İlk açılışta 'public/hakim-versions.yaml' okuma
  useEffect(() => {
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
  }, []);

// Kullanıcının dosya yüklemesi -> mevcut listeye ekler, üzerine yazmaz
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

    // Yeni gelen versiyonları, aynı isimli olanların üzerine yazarak,
    // mevcut listeyle birleştir
    setData((prevData) => {
      const existing = Array.isArray(prevData?.versions) ? prevData.versions : [];
      const merged = [...existing];

      parsed.versions.forEach((newVersion) => {
        const idx = merged.findIndex((v) => v.name === newVersion.name);
        if (idx >= 0) {
          merged[idx] = newVersion; // aynı isimli versiyon varsa güncelle
        } else {
          merged.push(newVersion); // yoksa yeni ekle
        }
      });

      return { versions: merged };
    });

    setFileName(`Son eklenen: ${file.name}`);
  };
  reader.readAsText(file);
};
  // Verilen URL'den YAML içeriğini çekme
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
      setFileName(url);
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
  };
}

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { compareSemVerDesc } from "../utils/semver";
import { parseYamlText } from "../utils/yamlParser";

// v2: versiyon objesi { name, chartVersion, services: [...] } şeklinde saklanıyor.
// Eski (düzleştirilmiş) v1 verisi bu anahtarla otomatik olarak devre dışı kalıyor.
const STORAGE_KEY_DATA = "ilgin_versions_data_v2";
const STORAGE_KEY_FILE_NAME = "ilgin_versions_filename_v2";

// scripts/fetch-tfs-versions.mjs tarafından TFS'teki tag'lerden üretiliyor.
const DEFAULT_FILE = "/tfs-versions.yaml";
const DEFAULT_FILE_LABEL = "tfs-versions.yaml";

const readStoredData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DATA);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed?.versions) ? parsed : null;
  } catch (e) {
    console.error("localStorage okuma hatası:", e);
    return null;
  }
};

export function useIlginVersions() {
  const [data, setData] = useState(() => readStoredData() || { versions: [] });

  // Kayıtlı veri yoksa ilk yükleme hemen başlayacağı için spinner'la açılıyoruz.
  const [loading, setLoading] = useState(() => !readStoredData());
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Servis bazlı filtreleme state'leri.
  // selectedService "" ise "Genel Sürüm  modundayız: selectedServiceVersion
  // o durumda tag'den gelen chartVersion'ı, servis seçiliyken ise o servisin
  // sürümünü tutar.
  const [selectedService, setSelectedService] = useState("");
  const [selectedServiceVersion, setSelectedServiceVersion] = useState("");

  // StrictMode'un effect'i iki kez çalıştırmasına karşı koruma.
  const didInitRef = useRef(false);

  const updateDataAndStore = useCallback((newData, newFileName) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(newData));

    if (newFileName) {
      localStorage.setItem(STORAGE_KEY_FILE_NAME, newFileName);
    }
  }, []);

  const fetchFromUrl = useCallback(
    async (targetUrl) => {
      if (!targetUrl) return false;

      setError(null);

      try {
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();

        const fileNameOnly = targetUrl.split("/").pop();
        const { data: parsed, error: parseError } = parseYamlText(text, fileNameOnly);

        if (parseError) {
          setError(parseError);
          return false;
        }
        if (!parsed.versions.length) {
          setError("YAML okundu fakat geçerli versiyon verisi çıkarılamadı.");
          return false;
        }

        updateDataAndStore({ versions: parsed.versions }, fileNameOnly || "URL'den yüklendi");
        return true;
      } catch (err) {
        console.error("URL'den çekme hatası:", err.message);
        setError("Dosya çekilirken hata oluştu: " + err.message);
        return false;
      }
    },
    [updateDataAndStore]
  );

  const loadDefaultFile = useCallback(async () => {
    try {
      const res = await fetch(DEFAULT_FILE);
      if (!res.ok) throw new Error(`Varsayılan ${DEFAULT_FILE_LABEL} bulunamadı.`);
      const text = await res.text();

      const { data: parsed, error: parseError } = parseYamlText(text, DEFAULT_FILE_LABEL);
      if (parseError || !parsed.versions.length) return false;

      updateDataAndStore({ versions: parsed.versions }, DEFAULT_FILE_LABEL);
      return true;
    } catch (err) {
      console.warn("Varsayılan dosya okuma uyarısı:", err.message);
      return false;
    }
  }, [updateDataAndStore]);

  // Tek giriş noktası: ?dataUrl= -> TFS'ten üretilen varsayılan dosya.
  // Yükleme bayrağının tek sahibi burası, alt fonksiyonlar ona dokunmuyor.
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fileUrl =
        urlParams.get("dataUrl") ||
        urlParams.get("target") ||
        urlParams.get("url") ||
        urlParams.get("v");

      if (fileUrl) {
        await fetchFromUrl(fileUrl);
        return;
      }

      if (!(await loadDefaultFile())) {
        setError(`Varsayılan ${DEFAULT_FILE_LABEL} bulunamadı veya okunamadı.`);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFromUrl, loadDefaultFile]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    // Kayıtlı veri varsa üzerine yazmıyoruz; kullanıcı "Yenile" ile tazeleyebilir.
    if (readStoredData()) return;

    loadInitialData();
  }, [loadInitialData]);

  const refresh = useCallback(() => {
    setSelectedService("");
    setSelectedServiceVersion("");
    return loadInitialData();
  }, [loadInitialData]);

  // 1. Sürümleri sıralama
  const sortedVersions = useMemo(() => {
    const list = Array.isArray(data?.versions) ? [...data.versions] : [];
    return list.sort(compareSemVerDesc);
  }, [data]);

  // 2. Tüm sürümlerden benzersiz servis adları ve sürümleri
  const availableServices = useMemo(() => {
    const serviceMap = new Map();

    sortedVersions.forEach((v) => {
      (v.services || []).forEach((dep) => {
        if (!dep?.name) return;
        if (!serviceMap.has(dep.name)) serviceMap.set(dep.name, new Set());
        if (dep.version) serviceMap.get(dep.name).add(dep.version);
      });
    });

    const result = {};
    [...serviceMap.keys()].sort().forEach((srv) => {
      result[srv] = [...serviceMap.get(srv)].sort((a, b) =>
        b.localeCompare(a, undefined, { numeric: true })
      );
    });
    return result;
  }, [sortedVersions]);

  // 3. "Genel Sürüm  seçilebilecek, doğrudan tag'den gelen chartVersion'lar.
  const availableGeneralVersions = useMemo(() => {
    const versions = new Set();
    sortedVersions.forEach((v) => {
      if (v.chartVersion) versions.add(v.chartVersion);
    });
    return [...versions].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [sortedVersions]);

  // Seçili servis listeden kalkarsa filtreyi kilitli bırakmayalım.
  useEffect(() => {
    if (selectedService && !availableServices[selectedService]) {
      setSelectedService("");
      setSelectedServiceVersion("");
    }
  }, [availableServices, selectedService]);

  // 4. Servis (veya genel tag sürümü) seçimine göre filtre
  const filteredVersions = useMemo(() => {
    return sortedVersions.filter((v) => {
      if (!selectedService) {
        return !selectedServiceVersion || (v.chartVersion || "").startsWith(selectedServiceVersion);
      }

      const foundDep = (v.services || []).find((d) => d.name === selectedService);
      if (!foundDep) return false;
      if (selectedServiceVersion && !(foundDep.version || "").startsWith(selectedServiceVersion)) return false;

      return true;
    });
  }, [sortedVersions, selectedService, selectedServiceVersion]);

  return {
    loading,
    error,
    notice,
    sortedVersions,
    filteredVersions,
    refresh,
    availableServices,
    availableGeneralVersions,
    selectedService,
    setSelectedService,
    selectedServiceVersion,
    setSelectedServiceVersion,
  };
}

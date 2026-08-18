import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { compareSemVerDesc } from "../utils/semver";
import { parseYamlText } from "../utils/yamlParser";
import { fetchReleaseYamls } from "../utils/githubReleases";

// v2: versiyon objesi { name, chartVersion, services: [...] } şeklinde saklanıyor.
// Eski (düzleştirilmiş) v1 verisi bu anahtarla otomatik olarak devre dışı kalıyor.
const STORAGE_KEY_DATA = "ilgin_versions_data_v2";
const STORAGE_KEY_FILE_NAME = "ilgin_versions_filename_v2";

const DEFAULT_FILE = "/ilgin-versions.yaml";
const DEFAULT_FILE_LABEL = "ilgin-versions.yaml";

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

const versionKey = (v) => `${v.name}@${v.chartVersion || ""}`;

// Arama kutusu için versiyonun tüm metinsel içeriğinden tek bir havuz oluşturur.
const buildHaystack = (v) =>
  [
    v.name,
    v.chartName,
    v.chartVersion,
    v.appVersion,
    v.description,
    v.releaseDate,
    ...(v.services || []).flatMap((s) => [s.name, s.version]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export function useIlginVersions() {
  const [data, setData] = useState(() => readStoredData() || { versions: [] });
  const [fileName, setFileName] = useState(
    () => localStorage.getItem(STORAGE_KEY_FILE_NAME) || DEFAULT_FILE_LABEL
  );

  const [searchTerm, setSearchTerm] = useState("");
  // Kayıtlı veri yoksa ilk yükleme hemen başlayacağı için spinner'la açılıyoruz.
  const [loading, setLoading] = useState(() => !readStoredData());
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Servis bazlı filtreleme state'leri
  const [selectedService, setSelectedService] = useState("");
  const [selectedServiceVersion, setSelectedServiceVersion] = useState("");

  // StrictMode'un effect'i iki kez çalıştırmasına karşı koruma.
  const didInitRef = useRef(false);

  const updateDataAndStore = useCallback((newData, newFileName) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(newData));

    if (newFileName) {
      setFileName(newFileName);
      localStorage.setItem(STORAGE_KEY_FILE_NAME, newFileName);
    }
  }, []);

  // Birden fazla YAML metnini tekilleştirip tek listeye indirger.
  const mergeYamlItems = useCallback((yamlItems) => {
    const merged = [];
    const seen = new Set();

    yamlItems.forEach(({ text, tag, fileName: sourceFile, releaseDate }) => {
      const { data: parsed } = parseYamlText(text, sourceFile || tag, { tag, releaseDate });
      if (!parsed) return;

      parsed.versions.forEach((newVer) => {
        const key = versionKey(newVer);
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(newVer);
      });
    });

    return merged;
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

  // { ok, reason } döner; reason yerel dosyaya düşerken kullanıcıya gösterilir.
  const loadFromGithub = useCallback(async () => {
    setError(null);
    setNotice(null);

    try {
      const { items, skipped, hasMore } = await fetchReleaseYamls();
      const merged = mergeYamlItems(items);

      if (!merged.length) {
        return {
          ok: false,
          reason: skipped.length
            ? `${skipped.length} release bulundu fakat hiçbirinden YAML indirilemedi.`
            : "GitHub'da yayınlanmış release bulunamadı.",
        };
      }

      updateDataAndStore(
        { versions: merged },
        `GitHub · ${merged.length} sürüm`
      );

      // Kapsam dışında kalan release'leri sessizce yutmuyoruz.
      const notes = [];
      if (skipped.length) notes.push(`${skipped.length} release'te YAML bulunamadı`);
      if (hasMore) notes.push("yalnızca en yeni release'ler gösteriliyor");
      setNotice(notes.length ? notes.join(" · ") : null);

      if (skipped.length) {
        console.warn("[YAML bulunamadı] Atlanan tag'ler:", skipped.join(", "));
      }
      return { ok: true };
    } catch (err) {
      console.warn("GitHub yükleme hatası:", err);
      return { ok: false, reason: err.message };
    }
  }, [mergeYamlItems, updateDataAndStore]);

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

  // Tek giriş noktası: ?dataUrl= -> GitHub Releases -> yerel varsayılan dosya.
  // Yükleme bayrağının tek sahibi burası, alt fonksiyonlar ona dokunmuyor.
  const loadInitialData = useCallback(async () => {
    setLoading(true);

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

      const github = await loadFromGithub();
      if (github.ok) return;

      // GitHub'dan veri gelmediyse yerel örnek dosyaya düşüyoruz.
      if (await loadDefaultFile()) {
        setError(null);
        setNotice(`Yerel örnek dosya gösteriliyor — GitHub: ${github.reason}`);
      } else {
        setError(github.reason);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFromUrl, loadFromGithub, loadDefaultFile]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    // Kayıtlı veri varsa üzerine yazmıyoruz; kullanıcı "Yenile" ile tazeleyebilir.
    if (readStoredData()) return;

    loadInitialData();
  }, [loadInitialData]);

  const refresh = useCallback(() => loadInitialData(), [loadInitialData]);

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

      const existing = Array.isArray(data?.versions) ? data.versions : [];
      const merged = [...existing];

      parsed.versions.forEach((nv) => {
        const idx = merged.findIndex((v) => versionKey(v) === versionKey(nv));
        if (idx >= 0) merged[idx] = nv;
        else merged.push(nv);
      });

      updateDataAndStore({ versions: merged }, `Son eklenen: ${file.name}`);
    };

    reader.onerror = () => setError(`"${file.name}" okunamadı.`);
    reader.readAsText(file);

    // Aynı dosyayı tekrar seçebilmek için input'u sıfırla.
    event.target.value = "";
  };

  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_DATA);
    localStorage.removeItem(STORAGE_KEY_FILE_NAME);
    setData({ versions: [] });
    setFileName(DEFAULT_FILE_LABEL);
    setError(null);
    setNotice(null);
    setSelectedService("");
    setSelectedServiceVersion("");
  }, []);

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

  // Seçili servis listeden kalkarsa filtreyi kilitli bırakmayalım.
  useEffect(() => {
    if (selectedService && !availableServices[selectedService]) {
      setSelectedService("");
      setSelectedServiceVersion("");
    }
  }, [availableServices, selectedService]);

  // 3. Arama metni + servis seçimi birleşik filtresi
  const filteredVersions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return sortedVersions.filter((v) => {
      const matchesSearch = !term || buildHaystack(v).includes(term);
      if (!matchesSearch) return false;

      if (!selectedService) return true;

      const foundDep = (v.services || []).find((d) => d.name === selectedService);
      if (!foundDep) return false;
      if (selectedServiceVersion && foundDep.version !== selectedServiceVersion) return false;

      return true;
    });
  }, [sortedVersions, searchTerm, selectedService, selectedServiceVersion]);

  return {
    loading,
    error,
    notice,
    fileName,
    searchTerm,
    setSearchTerm,
    sortedVersions,
    filteredVersions,
    handleFileUpload,
    refresh,
    clearStorage,
    availableServices,
    selectedService,
    setSelectedService,
    selectedServiceVersion,
    setSelectedServiceVersion,
  };
}

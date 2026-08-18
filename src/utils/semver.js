// SemVer Ayiklama
export const extractSemVer = (value = "") => {
  const match = String(value).match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3] || 0)];
};

// Once chartVersion, yoksa baslik metni uzerinden surum okunur.
const versionOf = (item) => extractSemVer(item?.chartVersion || item?.name);

// SemVer Siralama (Buyukten kucuge)
export const compareSemVerDesc = (a, b) => {
  const va = versionOf(a);
  const vb = versionOf(b);
  for (let i = 0; i < 3; i++) {
    if (vb[i] !== va[i]) return vb[i] - va[i];
  }
  return 0;
};

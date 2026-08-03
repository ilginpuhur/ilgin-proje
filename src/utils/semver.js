// SemVer Ayıklama
export const extractSemVer = (name = "") => {
  const match = String(name).match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3] || 0)];
};

// SemVer Sıralama (Büyükten küçüğe)
export const compareSemVerDesc = (a, b) => {
  const va = extractSemVer(a?.name);
  const vb = extractSemVer(b?.name);
  for (let i = 0; i < 3; i++) {
    if (vb[i] !== va[i]) return vb[i] - va[i];
  }
  return 0;
};

const ROMAJI_ALIASES: Array<[string, string]> = [
  ["shi", "si"],
  ["chi", "ti"],
  ["tsu", "tu"],
  ["fu", "hu"],
  ["ji", "zi"],
];

export function normalizeRomaji(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[._'-]/g, "");
}

export function romajiVariants(value: string): string[] {
  const base = normalizeRomaji(value);
  if (!base) return [];

  const variants = new Set<string>([base]);
  for (const [modern, alternate] of ROMAJI_ALIASES) {
    for (const current of [...variants]) {
      variants.add(current.replaceAll(modern, alternate));
      variants.add(current.replaceAll(alternate, modern));
    }
  }

  for (const current of [...variants]) {
    variants.add(current.replaceAll("ou", "oo"));
    variants.add(current.replaceAll("oo", "ou"));
  }

  return [...variants].filter(Boolean);
}

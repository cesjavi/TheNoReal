export type Fingerprint = {
  escenario: string;
  epoca: string;
  protagonista: string;
  dispositivo: string;
  tono: string;
  firstSentence?: string;
};

type BuildMetaArgs = {
  optionsCount: number;
  targetWords?: number;
  recentFingerprints?: Fingerprint[];
  bannedCliches?: string[];
  bannedKeywords?: string[];
  isFirstTurn?: boolean;
};

function collectFrequentValues(
  recentFingerprints: Fingerprint[] | undefined,
  key: keyof Fingerprint,
  {
    minCount = 2,
    limit = 5,
    disallowValues = new Set(["desconocido", "desconocida", "ninguno", "neutro"]),
  }: {
    minCount?: number;
    limit?: number;
    disallowValues?: Set<string>;
  } = {}
): string[] {
  if (!recentFingerprints?.length) return [];

  const counts = new Map<string, number>();
  for (const fp of recentFingerprints) {
    const raw = fp[key];
    if (!raw) continue;
    const value = String(raw).toLowerCase().trim();
    if (!value || disallowValues.has(value)) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

export function buildMeta({
  optionsCount,
  targetWords,
  recentFingerprints,
  bannedCliches,
  bannedKeywords,
  isFirstTurn = false,
}: BuildMetaArgs): string {
  const lines: string[] = [];
  lines.push(`options_count=${optionsCount}`);
  if (typeof targetWords === "number") {
    lines.push(`target_words=${targetWords}`);
  }
  if (recentFingerprints && recentFingerprints.length > 0) {
    lines.push("recent_fingerprints:");
    for (const fp of recentFingerprints) {
      const esc = (fp.escenario ?? "desconocido").replace(/"/g, '\"');
      const epo = (fp.epoca ?? "desconocida").replace(/"/g, '\"');
      const pro = (fp.protagonista ?? "desconocido").replace(/"/g, '\"');
      const dis = (fp.dispositivo ?? "desconocido").replace(/"/g, '\"');
      const ton = (fp.tono ?? "neutro").replace(/"/g, '\"');
      lines.push(`- escenario:"${esc}", epoca:"${epo}", protagonista:"${pro}", dispositivo:"${dis}", tono:"${ton}"`);
    }
  }
  if (bannedCliches && bannedCliches.length > 0) {
    const list = bannedCliches.map(s => `"${(s || "").replace(/"/g, '\"')}"`).join(", ");
    lines.push(`cliches_prohibidos:[${list}]`);
  }
  if (bannedKeywords && bannedKeywords.length > 0) {
    const list = bannedKeywords.map(s => `"${(s || "").replace(/"/g, '\"')}"`).join(", ");
    lines.push(`banned_keywords:[${list}]`);
  }

  if (isFirstTurn && recentFingerprints && recentFingerprints.length > 0) {
    const protagonists = collectFrequentValues(recentFingerprints, "protagonista");
    const escenarios = collectFrequentValues(recentFingerprints, "escenario");
    const dispositivos = collectFrequentValues(recentFingerprints, "dispositivo");

    if (protagonists.length > 0) {
      const list = protagonists.map((p) => `"${p.replace(/"/g, '\"')}"`).join(", ");
      lines.push(`rotate_protagonists:[${list}]`);
    }
    if (escenarios.length > 0) {
      const list = escenarios.map((p) => `"${p.replace(/"/g, '\"')}"`).join(", ");
      lines.push(`rotate_escenarios:[${list}]`);
    }
    if (dispositivos.length > 0) {
      const list = dispositivos.map((p) => `"${p.replace(/"/g, '\"')}"`).join(", ");
      lines.push(`rotate_dispositivos:[${list}]`);
    }
  }

  return lines.join("\n");
}

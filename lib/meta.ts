export type Fingerprint = {
  escenario: string;
  epoca: string;
  protagonista: string;
  dispositivo: string;
  tono: string;
  firstSentence?: string;
};

export function buildMeta({
  optionsCount,
  targetWords,
  recentFingerprints,
  bannedCliches,
}: {
  optionsCount: number;
  targetWords?: number;
  recentFingerprints?: Fingerprint[];
  bannedCliches?: string[];
}): string {
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
  return lines.join("\n");
}

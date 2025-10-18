export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function limitTemperature(temperature?: number): number | undefined {
  return typeof temperature === "number" ? clamp01(temperature) : undefined;
}

export function limitTopP(top_p?: number): number | undefined {
  return typeof top_p === "number" ? clamp01(top_p) : undefined;
}

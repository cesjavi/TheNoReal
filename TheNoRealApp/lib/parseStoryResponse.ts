export function parseStoryResponse(text: string, numOptions: number) {
  console.log("📩 Texto completo recibido:", text);
  const [storyPart, optionsPartRaw] = text.split(/\n\s*---\s*\n/, 2);
  const hasSeparator = optionsPartRaw !== undefined;
  const story = hasSeparator ? storyPart.trim() : '';
  const optionsPart = hasSeparator ? optionsPartRaw : text;
  console.log("✂️ Parte historia:", story);
  console.log("✂️ Parte opciones (raw):", optionsPart);
  const options = optionsPart
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\d+[\.\)\-:]/.test(l))
    .slice(0, numOptions);

  console.log("✅ Opciones parseadas:", options);
  return { story, options };
}

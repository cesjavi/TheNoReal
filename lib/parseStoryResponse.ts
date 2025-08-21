export function parseStoryResponse(text: string, numOptions: number) {
  console.log("📩 Texto completo recibido:", text);
  const [storyPart, optionsPartRaw] = text.split(/\n\s*---\s*\n/, 2);
  const hasSeparator = optionsPartRaw !== undefined;
  let story = hasSeparator ? storyPart.trim() : '';
  const optionsPart = hasSeparator ? optionsPartRaw : text;
  const linesAll = optionsPart
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  let lines = linesAll;
  if (!hasSeparator && linesAll.length > 0) {
    if (/^\d+[\.\)\-:]/.test(linesAll[0])) {
      // first line is an option
      story = '';
    } else {
      story = linesAll[0];
      lines = linesAll.slice(1);
    }
  }
  console.log("✂️ Parte historia:", story);
  console.log("✂️ Parte opciones (raw):", lines.join('\n'));
  let options = lines.filter((l) => /^\d+[\.\)\-:]/.test(l));
  if (options.length === 0) options = lines;
  options = options.slice(0, numOptions);

  console.log("✅ Opciones parseadas:", options);
  return { story, options };
}

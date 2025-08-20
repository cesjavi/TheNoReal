export function parseStoryResponse(text: string, numOptions: number) {
   console.log("📩 Texto completo recibido:", text);
  const [storyPart, optionsPart] = text.includes('---')
    ? text.split('---', 2)
    : ['', text];
     console.log("✂️ Parte historia:", storyPart.trim());
  console.log("✂️ Parte opciones (raw):", optionsPart);
  const story = storyPart.trim();
  const options = optionsPart
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\d+\./.test(l))
    .slice(0, numOptions);
    
  console.log("✅ Opciones parseadas:", options);
  return { story, options };
}

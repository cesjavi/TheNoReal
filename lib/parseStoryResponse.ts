export function parseStoryResponse(text: string, numOptions: number) {
  const [storyPart, optionsPart] = text.includes('---')
    ? text.split('---', 2)
    : ['', text];
  const story = storyPart.trim();
  const options = optionsPart
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\d+\./.test(l))
    .slice(0, numOptions);
  return { story, options };
}

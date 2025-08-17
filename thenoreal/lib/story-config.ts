export interface StoryConfig {
  title: string;
  content: string;
}

export function validateStoryConfig(data: unknown): data is StoryConfig {
  if (typeof data !== 'object' || data === null) return false;
  const { title, content } = data as Record<string, unknown>;
  return typeof title === 'string' && typeof content === 'string';
}

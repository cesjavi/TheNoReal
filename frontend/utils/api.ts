function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';
  return base.replace(/\/$/, '');
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.replace(/^\//, '');
  return `${getApiBase()}/${normalized}`;
}

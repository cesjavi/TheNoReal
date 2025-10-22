function getApiBase(): string {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase && envBase.trim()) {
    return envBase.trim().replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin.replace(/\/$/, '')}/api`;
  }

  return '/api';
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.replace(/^\//, '');
  return `${getApiBase()}/${normalized}`;
}

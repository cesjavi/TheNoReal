const LOCAL_BACKEND_FALLBACK = 'http://localhost:4000/api';

function removeTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function isLocalhostOrigin(origin: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
}

function getApiBase(): string {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase && envBase.trim()) {
    return removeTrailingSlash(envBase.trim());
  }

  if (typeof window !== 'undefined' && window.location) {
    const origin = removeTrailingSlash(window.location.origin);
    if (isLocalhostOrigin(origin)) {
      return LOCAL_BACKEND_FALLBACK;
    }
    return `${origin}/api`;
  }

  if (process.env.NODE_ENV !== 'production') {
    return LOCAL_BACKEND_FALLBACK;
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

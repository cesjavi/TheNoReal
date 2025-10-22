import { resolveApiUrl } from '@/utils/api';

describe('resolveApiUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalWindow = global.window;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    if (originalWindow) {
      global.window = originalWindow;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).window;
    }
  });

  it('prefers the configured API base when available', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com/v1';
    expect(resolveApiUrl('story')).toBe('https://api.example.com/v1/story');
    expect(resolveApiUrl('/options')).toBe('https://api.example.com/v1/options');
  });

  it('falls back to the current origin when running in the browser', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = '';
    global.window = {
      location: {
        origin: 'https://frontend.example',
      },
    } as unknown as Window & typeof globalThis;

    expect(resolveApiUrl('story')).toBe('https://frontend.example/api/story');
  });

  it('uses a relative /api prefix when no origin is available', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window;

    expect(resolveApiUrl('story')).toBe('/api/story');
  });
});

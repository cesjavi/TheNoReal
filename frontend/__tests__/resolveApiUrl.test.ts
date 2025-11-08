import { resolveApiUrl } from '@/utils/api';

describe('resolveApiUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalWindow = global.window;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
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

  it('uses the localhost backend when running without window in non-production mode', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = undefined;
    process.env.NODE_ENV = 'development';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window;

    expect(resolveApiUrl('story')).toBe('http://localhost:4000/api/story');
  });

  it('falls back to /api when running without window in production', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = undefined;
    process.env.NODE_ENV = 'production';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window;

    expect(resolveApiUrl('story')).toBe('/api/story');
  });

  it('prefers the localhost backend when the browser origin is localhost', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = undefined;
    global.window = {
      location: {
        origin: 'http://localhost:3000',
      },
    } as unknown as Window & typeof globalThis;

    expect(resolveApiUrl('story')).toBe('http://localhost:4000/api/story');
  });
});

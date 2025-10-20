process.env.NEXT_PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

class MockIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});
   
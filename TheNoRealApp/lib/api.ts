const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:3000';

export async function postStory(payload: Record<string, unknown>) {
  const res = await fetch(`${API_BASE_URL}/api/story`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Error fetching story: ${res.status}`);
  }
  return res.json() as Promise<{ text?: string; truncated?: boolean }>;
}

export async function createStory(payload: Record<string, unknown>) {
  const res = await fetch(`${API_BASE_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Error creating story: ${res.status}`);
  }
  return res.json();
}

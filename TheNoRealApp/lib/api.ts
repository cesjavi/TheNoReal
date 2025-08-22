const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:3000';

export async function postStory(payload: Record<string, unknown>) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Error fetching story: ${res.status} ${errorText}`);
    }

    return res.json() as Promise<{ text?: string; truncated?: boolean }>;
  } catch (error) {
    console.error('Failed to post story', error);
    throw error;
  }
}

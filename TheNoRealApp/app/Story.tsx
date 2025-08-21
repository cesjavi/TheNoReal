import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

interface StoryResponse {
  text: string;
  options: string[];
}

export default function Story() {
  const [story, setStory] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStory = async (option?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option }),
      });
      const data: StoryResponse = await res.json();
      setStory((prev) => (prev ? prev + '\n\n' : '') + data.text);
      setOptions(data.options);
    } catch (e) {
      console.error(e);
      setError('Failed to load story');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStory();
  }, []);

  return (
    <View style={styles.container}>
      <Text>{story}</Text>
      {loading && <Text>Loading...</Text>}
      {error && <Text>{error}</Text>}
      {options.map((opt, idx) => (
        <Button
          key={idx}
          title={opt}
          onPress={() => fetchStory(opt)}
          disabled={loading}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
});


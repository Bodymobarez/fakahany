import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../../src/lib/api';

type Post = {
  titleEn: string;
  bodyEn?: string | null;
  publishedAt?: string | null;
};

export default function BlogPostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/content/blog/${slug}`);
      setPost(data.post);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!post && !error) {
    return (
      <View style={styles.container}>
        <Text style={styles.meta}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {post ? (
        <>
          <Text style={styles.title}>{post.titleEn}</Text>
          {post.publishedAt ? (
            <Text style={styles.meta}>{new Date(post.publishedAt).toLocaleDateString()}</Text>
          ) : null}
          <Text style={styles.body}>{post.bodyEn || ''}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#14532d' },
  meta: { marginTop: 8, color: '#64748b' },
  body: { marginTop: 16, color: '#334155', lineHeight: 22 },
  error: { color: '#b91c1c', marginBottom: 8 },
});

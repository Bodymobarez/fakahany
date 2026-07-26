import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { fetchCmsPage } from '../../src/lib/catalog';
import { colors, spacing } from '../../src/theme';

/** CMS content pages — parallel to web `/pages/[slug]`. */
export default function CmsPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    void fetchCmsPage(String(slug))
      .then((page) => {
        setTitle(page.titleEn);
        setBody(page.bodyEn);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Page not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error ? (
        <>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '800', color: colors.brandDark, marginBottom: 16 },
  body: { fontSize: 16, lineHeight: 24, color: colors.ink },
  error: { color: colors.danger },
});

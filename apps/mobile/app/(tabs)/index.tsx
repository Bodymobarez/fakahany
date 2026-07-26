import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ProductCard } from '../../src/components/ProductCard';
import {
  fetchBanners,
  fetchFlashSale,
  fetchRecommendations,
  mediaUrl,
  type Banner,
  type FlashItem,
  type Product,
} from '../../src/lib/catalog';
import { colors, spacing } from '../../src/theme';

/** Marketing home — parallel to web landing; catalog lives on Shop tab. */
export default function HomeScreen() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [flashItems, setFlashItems] = useState<FlashItem[]>([]);
  const [flashName, setFlashName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [bannerRes, flashRes, recRes] = await Promise.all([
        fetchBanners(),
        fetchFlashSale(),
        fetchRecommendations(),
      ]);
      setBanners(bannerRes);
      setFlashName(flashRes.name);
      setFlashItems(flashRes.items);
      setRecommended(recRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load home');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.brand}>Fresh Harvest</Text>
      <Text style={styles.sub}>Farm-fresh produce · UAE delivery</Text>

      {banners.slice(0, 3).map((b) => {
        const src = mediaUrl(b.imageUrl);
        return (
          <View key={b.id} style={styles.banner}>
            {src ? <Image source={{ uri: src }} style={styles.bannerImage} /> : null}
            <View style={styles.bannerOverlay}>
              <Text style={styles.bannerTitle}>{b.titleEn}</Text>
            </View>
          </View>
        );
      })}

      <View style={styles.quickRow}>
        <Link href="/(tabs)/shop" asChild>
          <Pressable style={styles.quickPrimary}>
            <Text style={styles.quickPrimaryText}>Shop now</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.quickRow}>
        <Link href="/recipes" asChild>
          <Pressable style={styles.quick}>
            <Text style={styles.quickText}>Recipes</Text>
          </Pressable>
        </Link>
        <Link href="/vendors" asChild>
          <Pressable style={styles.quick}>
            <Text style={styles.quickText}>Vendors</Text>
          </Pressable>
        </Link>
        <Link href="/blog" asChild>
          <Pressable style={styles.quick}>
            <Text style={styles.quickText}>Blog</Text>
          </Pressable>
        </Link>
      </View>

      {recommended.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          {recommended.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </View>
      ) : null}

      {flashItems.length > 0 ? (
        <View style={styles.flashBox}>
          <Text style={styles.flashTitle}>{flashName || 'Flash sale'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {flashItems.map((item) => (
              <Link
                key={item.product.id}
                href={`/product/${item.product.slug || item.product.id}`}
                asChild
              >
                <Pressable style={styles.flashCard}>
                  <Text style={styles.flashName} numberOfLines={2}>
                    {item.product.nameEn}
                  </Text>
                  <Text style={styles.flashPrice}>
                    {Number(item.salePrice).toFixed(2)} AED
                  </Text>
                </Pressable>
              </Link>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.brandSoft },
  brand: { fontSize: 26, fontWeight: '800', color: colors.brandDark },
  sub: { marginTop: 4, marginBottom: 12, color: '#4d7c0f' },
  banner: {
    backgroundColor: colors.brandDark,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    minHeight: 120,
  },
  bannerImage: { width: '100%', height: 120 },
  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: 'rgba(20,83,45,0.55)',
  },
  bannerTitle: { color: '#fff', fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickPrimary: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  quickPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  quick: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quickText: { color: colors.brandDark, fontWeight: '700' },
  section: { marginBottom: 12 },
  sectionTitle: { fontWeight: '800', color: colors.brandDark, marginBottom: 8, fontSize: 16 },
  flashBox: {
    backgroundColor: colors.flashBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.flashBorder,
    padding: 12,
    marginBottom: 12,
  },
  flashTitle: { fontWeight: '800', color: colors.flashText, marginBottom: 8 },
  flashCard: {
    width: 120,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  flashName: { fontWeight: '700', color: colors.ink, fontSize: 13, minHeight: 36 },
  flashPrice: { marginTop: 6, color: '#c2410c', fontWeight: '700' },
  error: { color: colors.danger, marginBottom: 8 },
});

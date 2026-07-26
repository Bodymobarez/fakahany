import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { colors, spacing } from '../../src/theme';

const links = [
  { href: '/orders', label: 'My orders' },
  { href: '/addresses', label: 'Addresses' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/gift-cards', label: 'Gift cards' },
  { href: '/wishlist', label: 'Wishlist' },
  { href: '/subscriptions', label: 'Subscriptions' },
  { href: '/loyalty', label: 'Loyalty' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/pages/about', label: 'About us' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/support', label: 'Support' },
  { href: '/security', label: 'Security (2FA)' },
  { href: '/privacy', label: 'Privacy (PDPL)' },
] as const;

export default function AccountScreen() {
  const router = useRouter();
  const { token, user, ready, signOut, refresh } = useAuth();

  const label = !ready
    ? 'Loading…'
    : user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        user.email ||
        user.phone ||
        'Customer'
      : token
        ? 'Signed in'
        : 'Not signed in';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.body}>{label}</Text>
      {token ? (
        <>
          {links.map((l) => (
            <Pressable key={l.href} style={styles.btn} onPress={() => router.push(l.href)}>
              <Text style={styles.btnText}>{l.label}</Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.btnSecondary}
            onPress={() => {
              void signOut().then(() => router.push('/login'));
            }}
          >
            <Text style={styles.btnSecondaryText}>Sign out</Text>
          </Pressable>
          <Pressable style={styles.link} onPress={() => void refresh()}>
            <Text style={styles.linkText}>Refresh profile</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={styles.btn} onPress={() => router.push('/login')}>
            <Text style={styles.btnText}>Sign in</Text>
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={() => router.push('/register')}>
            <Text style={styles.btnSecondaryText}>Create account</Text>
          </Pressable>
        </>
      )}
      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink },
  body: { marginTop: 10, color: colors.muted, marginBottom: 8 },
  btn: {
    marginTop: 10,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  btnSecondary: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSecondaryText: { color: colors.ink, fontWeight: '600' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: colors.brand, fontWeight: '600' },
});

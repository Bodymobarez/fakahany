import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { registerForPushNotifications } from '../src/lib/push';
import { colors } from '../src/theme';

function RootNavigator() {
  const { ready } = useAuth();

  useEffect(() => {
    void registerForPushNotifications();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product/[id]" options={{ headerShown: true, title: 'Product' }} />
        <Stack.Screen name="checkout" options={{ headerShown: true, title: 'Checkout' }} />
        <Stack.Screen name="bnpl" options={{ headerShown: true, title: 'BNPL payment' }} />
        <Stack.Screen name="orders" options={{ headerShown: true, title: 'Orders' }} />
        <Stack.Screen name="order/[id]" options={{ headerShown: true, title: 'Order' }} />
        <Stack.Screen name="wallet" options={{ headerShown: true, title: 'Wallet' }} />
        <Stack.Screen name="gift-cards" options={{ headerShown: true, title: 'Gift cards' }} />
        <Stack.Screen name="wishlist" options={{ headerShown: true, title: 'Wishlist' }} />
        <Stack.Screen name="addresses" options={{ headerShown: true, title: 'Addresses' }} />
        <Stack.Screen name="track/[id]" options={{ headerShown: true, title: 'Track order' }} />
        <Stack.Screen name="loyalty" options={{ headerShown: true, title: 'Loyalty' }} />
        <Stack.Screen name="subscriptions" options={{ headerShown: true, title: 'Subscriptions' }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
        <Stack.Screen name="support" options={{ headerShown: true, title: 'Support' }} />
        <Stack.Screen name="support/[id]" options={{ headerShown: true, title: 'Ticket' }} />
        <Stack.Screen name="recipes/index" options={{ headerShown: true, title: 'Recipes' }} />
        <Stack.Screen name="recipes/[slug]" options={{ headerShown: true, title: 'Recipe' }} />
        <Stack.Screen name="vendors/index" options={{ headerShown: true, title: 'Vendors' }} />
        <Stack.Screen name="vendors/[slug]" options={{ headerShown: true, title: 'Vendor' }} />
        <Stack.Screen name="blog/index" options={{ headerShown: true, title: 'Blog' }} />
        <Stack.Screen name="blog/[slug]" options={{ headerShown: true, title: 'Post' }} />
        <Stack.Screen name="faq" options={{ headerShown: true, title: 'FAQ' }} />
        <Stack.Screen name="pages/[slug]" options={{ headerShown: true, title: 'Page' }} />
        <Stack.Screen name="security" options={{ headerShown: true, title: 'Security' }} />
        <Stack.Screen name="register" options={{ headerShown: true, title: 'Register' }} />
        <Stack.Screen name="forgot" options={{ headerShown: true, title: 'Reset password' }} />
        <Stack.Screen name="privacy" options={{ headerShown: true, title: 'Privacy' }} />
        <Stack.Screen name="login" options={{ presentation: 'modal', headerShown: true, title: 'Login' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

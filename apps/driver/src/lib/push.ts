import { Platform } from 'react-native';
import { apiFetch, getToken } from './auth';

/** Register Expo push token for the driver app. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!getToken()) return null;

  try {
    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');

    if (!Device.isDevice) {
      console.info('[push] Skipping — not a physical device');
      return null;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const Constants = (await import('expo-constants')).default;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;

    const tokenRes = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenRes.data;
    if (!token) return null;

    await apiFetch('/api/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        app: 'driver',
      }),
    });
    return token;
  } catch (err) {
    console.info('[push] registration skipped', err);
    return null;
  }
}

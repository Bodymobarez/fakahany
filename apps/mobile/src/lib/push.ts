import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiFetch, getToken } from './auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Register Expo push token with API when notifications are available. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!getToken()) return null;

  try {
    if (!Device.isDevice) {
      console.info('[push] Skipping — not a physical device');
      return null;
    }

    const existing = await Notifications.getPermissionsAsync();
    let granted = Boolean((existing as { granted?: boolean }).granted);
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = Boolean((requested as { granted?: boolean }).granted);
    }
    if (!granted) return null;

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
        app: 'mobile',
      }),
    });
    return token;
  } catch (err) {
    console.info('[push] registration skipped', err);
    return null;
  }
}

import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { UserService } from '../api/services';

let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch {
  // Graceful fallback if native notifications module is unavailable
}

export function usePushNotifications(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated || !Notifications) return;

    let isMounted = true;
    let responseSubscription: any = null;

    async function registerForPushNotificationsAsync() {
      if (Platform.OS === 'web' || !Device.isDevice || !Notifications) {
        return;
      }

      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const pushToken = tokenData.data;

        if (pushToken && isMounted) {
          await UserService.updatePushToken(pushToken).catch(() => {});
        }
      } catch {
        // Silent catch if push permission or project ID is unconfigured
      }
    }

    registerForPushNotificationsAsync();

    if (Notifications && Notifications.addNotificationResponseReceivedListener) {
      responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {});
    }

    return () => {
      isMounted = false;
      if (responseSubscription && responseSubscription.remove) {
        responseSubscription.remove();
      }
    };
  }, [isAuthenticated]);
}

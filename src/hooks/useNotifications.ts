import { useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  scheduleMedicationNotifications,
  startNotificationLoop,
  getPermissionStatus,
} from '@/lib/notifications';
import { store } from '@/lib/store';
import { App as CapApp } from '@capacitor/app';

const FIRST_RUN_KEY = 'dawaa_notif_prompted_v1';

export function useNotifications() {
  useEffect(() => {
    const init = async () => {
      const settings = store.getSettings();
      const alreadyPrompted = localStorage.getItem(FIRST_RUN_KEY) === '1';

      // First launch: auto-request permission and enable notifications if granted
      if (!alreadyPrompted) {
        localStorage.setItem(FIRST_RUN_KEY, '1');
        const granted = await requestNotificationPermission();
        if (granted) {
          store.saveSettings({ ...settings, notifications: true });
          await startNotificationLoop();
        }
        return;
      }

      if (!settings.notifications) return;
      const granted = await requestNotificationPermission();
      if (granted) {
        await startNotificationLoop();
      }
    };

    init();

    // Re-schedule when app returns to foreground (e.g. user opens app at night)
    let resumeListener: { remove: () => void } | undefined;
    CapApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        const s = store.getSettings();
        if (s.notifications) {
          await scheduleMedicationNotifications();
        }
      }
    }).then(handle => {
      resumeListener = handle;
    }).catch(() => {
      // Web fallback: use visibilitychange
      const handleVisibility = async () => {
        if (document.visibilityState === 'visible') {
          const s = store.getSettings();
          if (s.notifications) {
            await scheduleMedicationNotifications();
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      resumeListener = { remove: () => document.removeEventListener('visibilitychange', handleVisibility) };
    });

    return () => {
      resumeListener?.remove();
    };
  }, []);

  const reschedule = useCallback(async () => {
    await scheduleMedicationNotifications();
  }, []);

  return { reschedule, getPermissionStatus };
}

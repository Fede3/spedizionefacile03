/**
 * COMPOSABLE: usePushNotifications (F09)
 *
 * API:
 *   const { isSupported, permission, isSubscribed, subscribe, unsubscribe,
 *           refresh, sendTest } = usePushNotifications();
 *
 * Flusso UX:
 *   1. Mount -> refresh() determina permission corrente + subscription esistente.
 *   2. Toggle "Attiva push" -> subscribe(): chiede permesso, crea subscription
 *      e POST /api/push/subscribe.
 *   3. Toggle "Disattiva push" -> unsubscribe(): rimuove subscription locale e
 *      DELETE /api/push/unsubscribe.
 *
 * Errori comuni mostrati come stringa in `lastError`:
 *   - 'unsupported': browser non supporta Push o SW.
 *   - 'permission_denied': l'utente ha bloccato le notifiche.
 *   - 'no_vapid_key': il backend non ha generato VAPID.
 *   - 'network': errore HTTP nella registrazione.
 */

type PermissionLike = 'default' | 'granted' | 'denied' | 'unsupported';

export const usePushNotifications = () => {
  const sanctum = useSanctumClient();

  const isSupported = ref<boolean>(false);
  const permission = ref<PermissionLike>('default');
  const isSubscribed = ref<boolean>(false);
  const lastError = ref<string>('');
  const isBusy = ref<boolean>(false);
  const publicKey = ref<string>('');

  function detectSupport() {
    isSupported.value = typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window;

    if (!isSupported.value) {
      permission.value = 'unsupported';
    } else {
      permission.value = (Notification.permission as PermissionLike) || 'default';
    }
  }

  async function fetchPublicKey(): Promise<string> {
    if (publicKey.value) return publicKey.value;
    try {
      const res: any = await sanctum('/api/push/public-key', { method: 'GET' });
      const key = res?.public_key || '';
      publicKey.value = key;
      return key;
    } catch {
      lastError.value = 'no_vapid_key';
      return '';
    }
  }

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!isSupported.value) return null;
    try {
      let reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg) reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      // Attendi attivo
      if (reg.installing || reg.waiting) await navigator.serviceWorker.ready;
      return reg;
    } catch {
      return null;
    }
  }

  async function refresh() {
    detectSupport();
    if (!isSupported.value) return;
    const reg = await getRegistration();
    if (!reg) {
      isSubscribed.value = false;
      return;
    }
    const sub = await reg.pushManager.getSubscription();
    isSubscribed.value = Boolean(sub);
  }

  async function requestPermission(): Promise<boolean> {
    if (!isSupported.value) {
      lastError.value = 'unsupported';
      return false;
    }
    if (Notification.permission === 'granted') {
      permission.value = 'granted';
      return true;
    }
    if (Notification.permission === 'denied') {
      permission.value = 'denied';
      lastError.value = 'permission_denied';
      return false;
    }
    const result = await Notification.requestPermission();
    permission.value = result as PermissionLike;
    if (result !== 'granted') {
      lastError.value = 'permission_denied';
      return false;
    }
    return true;
  }

  async function subscribe(): Promise<boolean> {
    lastError.value = '';
    isBusy.value = true;
    try {
      const ok = await requestPermission();
      if (!ok) return false;

      const reg = await getRegistration();
      if (!reg) {
        lastError.value = 'unsupported';
        return false;
      }

      const key = await fetchPublicKey();
      if (!key) {
        lastError.value = 'no_vapid_key';
        return false;
      }

      // Ricicla la subscription esistente quando combacia con la chiave attuale.
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }

      const subJson: any = sub.toJSON();
      await sanctum('/api/push/subscribe', {
        method: 'POST',
        body: {
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        },
      });

      isSubscribed.value = true;
      return true;
    } catch (err: any) {
      lastError.value = err?.message ? `network: ${err.message}` : 'network';
      return false;
    } finally {
      isBusy.value = false;
    }
  }

  async function unsubscribe(): Promise<boolean> {
    lastError.value = '';
    isBusy.value = true;
    try {
      const reg = await getRegistration();
      if (!reg) return true;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        isSubscribed.value = false;
        return true;
      }
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      try {
        await sanctum('/api/push/unsubscribe', {
          method: 'DELETE',
          body: { endpoint },
        });
      } catch {
        // anche se il delete fallisce, locale e' gia' annullato
      }
      isSubscribed.value = false;
      return true;
    } catch (err: any) {
      lastError.value = err?.message ? `network: ${err.message}` : 'network';
      return false;
    } finally {
      isBusy.value = false;
    }
  }

  async function sendTest(): Promise<boolean> {
    try {
      await sanctum('/api/admin/push/test', { method: 'POST', body: {} });
      return true;
    } catch {
      return false;
    }
  }

  if (typeof window !== 'undefined') {
    onMounted(() => {
      refresh();
    });
  } else {
    detectSupport();
  }

  return {
    isSupported,
    permission,
    isSubscribed,
    isBusy,
    lastError,
    refresh,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTest,
  };
};

import { useEffect, useState, useCallback } from "react";
import {
  isPushSupported, getNotificationPermission, requestNotificationPermission,
  subscribeToPush, unsubscribeFromPush, getCurrentSubscription,
  getNotifPrefs, setNotifPref, type NotifPref,
} from "@/lib/pushNotifications";

export type PushStatus = "unsupported" | "denied" | "default" | "granted_inactive" | "granted_active";

export function usePushNotifications() {
  const [status, setStatus]   = useState<PushStatus>("default");
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs]     = useState(getNotifPrefs());

  const refresh = useCallback(async () => {
    if (!isPushSupported()) { setStatus("unsupported"); setLoading(false); return; }

    const perm = await getNotificationPermission();
    if (perm === "denied")  { setStatus("denied");   setLoading(false); return; }
    if (perm === "default") { setStatus("default");  setLoading(false); return; }

    const sub = await getCurrentSubscription();
    setStatus(sub ? "granted_active" : "granted_inactive");
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const enable = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    const perm = await requestNotificationPermission();
    if (perm !== "granted") { await refresh(); return false; }

    const sub = await subscribeToPush();
    await refresh();
    return !!sub;
  }, [refresh]);

  const disable = useCallback(async () => {
    setLoading(true);
    await unsubscribeFromPush();
    await refresh();
  }, [refresh]);

  const togglePref = useCallback((pref: NotifPref, enabled: boolean) => {
    setNotifPref(pref, enabled);
    setPrefs(prev => ({ ...prev, [pref]: enabled }));
  }, []);

  const isActive = status === "granted_active";
  const isDenied = status === "denied";
  const isUnsupported = status === "unsupported";

  return { status, loading, isActive, isDenied, isUnsupported, prefs, enable, disable, togglePref };
}

import { apiBaseUrl } from "@/lib/api";
import { getAccessTokenWithWait } from "@/lib/auth";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

// Converte base64url para Uint8Array (necessário para subscribe)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return Notification.requestPermission();
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await saveSubscriptionToBackend(sub);
    return sub;
  } catch (err) {
    console.error("[Push] Subscribe failed:", err);
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;

  const ok = await sub.unsubscribe();
  if (ok) await deleteSubscriptionFromBackend();
  return ok;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

// ── Backend calls ─────────────────────────────────────────────────────────────

async function saveSubscriptionToBackend(sub: PushSubscription): Promise<void> {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return;

  const json = sub.toJSON();
  await fetch(`${apiBaseUrl}/notifications/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth:    json.keys?.auth   ?? "",
      userAgent: navigator.userAgent,
    }),
  });
}

async function deleteSubscriptionFromBackend(): Promise<void> {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return;

  await fetch(`${apiBaseUrl}/notifications/subscribe`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Notification preferences ──────────────────────────────────────────────────

export type NotifPref = "routine_morning" | "routine_night" | "analysis_weekly" | "pending_steps";

const PREFS_KEY = "fg_notif_prefs";

export function getNotifPrefs(): Record<NotifPref, boolean> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Record<NotifPref, boolean>;
  } catch {
    return {} as Record<NotifPref, boolean>;
  }
}

export function setNotifPref(pref: NotifPref, enabled: boolean): void {
  const prefs = getNotifPrefs();
  prefs[pref] = enabled;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));

  // Informa o backend sobre a preferência
  void syncPrefsToBackend(prefs);
}

async function syncPrefsToBackend(prefs: Record<NotifPref, boolean>): Promise<void> {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return;

  await fetch(`${apiBaseUrl}/notifications/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(prefs),
  }).catch(() => {});
}

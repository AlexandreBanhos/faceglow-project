import { assertSupabaseConfigured } from "@/lib/supabase";
import { setAdminCache } from "@/lib/adminCache";
import { apiBaseUrl } from "@/lib/api";

export const getAccessToken = async (): Promise<string | null> => {
  const client = assertSupabaseConfigured();
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
};

export const getAccessTokenWithWait = async (timeoutMs: number = 5000): Promise<string | null> => {
  const startTime = Date.now();
  const pollIntervalMs = 100;

  while (Date.now() - startTime < timeoutMs) {
    const token = await getAccessToken();
    if (token) {
      return token;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return null;
};

export const getCurrentUser = async () => {
  const client = assertSupabaseConfigured();
  const { data } = await client.auth.getUser();
  return data.user ?? null;
};

export const getSessionUser = async () => {
  const client = assertSupabaseConfigured();
  const { data } = await client.auth.getSession();
  return data.session?.user ?? null;
};

export const signInWithEmail = async (email: string, password: string) => {
  const client = assertSupabaseConfigured();
  return client.auth.signInWithPassword({ email, password });
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  fullName?: string,
  emailRedirectTo?: string,
) => {
  const client = assertSupabaseConfigured();
  return client.auth.signUp({
    email,
    password,
    options: {
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
      data: {
        full_name: fullName ?? "",
      },
    },
  });
};

export const signOut = async () => {
  setAdminCache(null);
  const client = assertSupabaseConfigured();
  return client.auth.signOut();
};

export const sendPasswordReset = async (email: string, redirectTo: string) => {
  const client = assertSupabaseConfigured();
  return client.auth.resetPasswordForEmail(email, { redirectTo });
};

export const updatePassword = async (password: string) => {
  const client = assertSupabaseConfigured();
  return client.auth.updateUser({ password });
};

export const resendConfirmationEmail = async (email: string, emailRedirectTo?: string) => {
  const client = assertSupabaseConfigured();
  return client.auth.resend({
    type: "signup",
    email,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });
};

type UpdateProfilePayload = {
  fullName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
};

export const updateProfileMetadata = async ({ fullName, avatarUrl, phoneNumber }: UpdateProfilePayload) => {
  const client = assertSupabaseConfigured();
  const user = await getCurrentUser();
  const currentMetadata = user?.user_metadata ?? {};

  const nextMetadata = {
    ...currentMetadata,
    ...(fullName !== undefined ? { full_name: fullName } : {}),
    ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
    ...(phoneNumber !== undefined ? { phone_number: phoneNumber } : {}),
  };

  return client.auth.updateUser({ data: nextMetadata });
};

/** Envia e-mail de confirmação para o novo endereço. O e-mail só é atualizado após o usuário clicar no link. */
export const updateEmail = async (newEmail: string) => {
  const client = assertSupabaseConfigured();
  return client.auth.updateUser({ email: newEmail });
};

/** Desativa a conta no backend (soft-delete). O logout deve ser chamado em seguida. */
export const deactivateAccount = async (): Promise<{ ok: boolean; error?: string }> => {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: "Sessão expirada." };

  try {
    const res = await fetch(`${apiBaseUrl}/account/deactivate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { detail?: string };
      return { ok: false, error: body.detail ?? `Erro ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Erro de conexão." };
  }
};

import { assertSupabaseConfigured } from "@/lib/supabase";

const analysisBucket = (import.meta.env.VITE_SUPABASE_BUCKET_ANALYSIS as string | undefined)?.trim() || "analysis-images";
const profileBucket = (import.meta.env.VITE_SUPABASE_BUCKET_PROFILE as string | undefined)?.trim() || "profile-images";

const dataUrlToFile = (dataUrl: string, fileName: string) => {
  const [meta, base64Data] = dataUrl.split(",");
  if (!meta || !base64Data) {
    throw new Error("Formato de imagem invalido para upload.");
  }

  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || "image/jpeg";
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], fileName, { type: mimeType });
};

const uploadFileToBucket = async (bucket: string, path: string, file: File) => {
  const client = assertSupabaseConfigured();
  const { error } = await client.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(error.message || "Falha ao enviar imagem para o storage.");
  }

  return client;
};

const resolveUploadUrl = async (
  bucket: string,
  path: string,
  options?: { preferSignedUrl?: boolean; expiresInSeconds?: number },
) => {
  const client = assertSupabaseConfigured();

  if (options?.preferSignedUrl) {
    const expiresIn = Math.max(60, options.expiresInSeconds ?? 3600);
    const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const uploadAnalysisImage = async (dataUrl: string, userId: string) => {
  const timestamp = Date.now();
  const file = dataUrlToFile(dataUrl, `analysis-${timestamp}.jpg`);
  const path = `${userId}/${timestamp}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  await uploadFileToBucket(analysisBucket, path, file);

  // Use public URLs (no signed URLs) to avoid ERR_BLOCKED_BY_ORB errors in browsers
  const client = assertSupabaseConfigured();
  const { data: publicUrlData } = client.storage.from(analysisBucket).getPublicUrl(path);
  
  return {
    imageUrl: publicUrlData.publicUrl,
    analyzerImageUrl: publicUrlData.publicUrl,
  };
};

export const uploadProfileImage = async (file: File, userId: string) => {
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "jpg";
  const safeExtension = extension || "jpg";
  const timestamp = Date.now();
  const path = `${userId}/avatar-${timestamp}.${safeExtension}`;
  await uploadFileToBucket(profileBucket, path, file);
  return resolveUploadUrl(profileBucket, path);
};

export const uploadProductImage = async (file: File, userId?: string): Promise<string> => {
  const productsBucket = "product-images";
  const client = assertSupabaseConfigured();

  let resolvedUserId = userId;
  if (!resolvedUserId) {
    // Try session first (fast, local), then getUser (verified, API call)
    const { data: sessionData } = await client.auth.getSession();
    resolvedUserId = sessionData.session?.user?.id;
    if (!resolvedUserId) {
      const { data: userData } = await client.auth.getUser();
      resolvedUserId = userData.user?.id;
    }
  }

  if (!resolvedUserId) {
    throw new Error("Usuário não autenticado. Faça login para enviar imagens.");
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "jpg";
  const safeExtension = ["jpg", "jpeg", "png", "webp"].includes(extension ?? "") ? extension : "jpg";
  const timestamp = Date.now();
  const path = `${resolvedUserId}/${timestamp}-${Math.random().toString(36).slice(2, 8)}.${safeExtension}`;
  await uploadFileToBucket(productsBucket, path, file);
  const { data } = client.storage.from(productsBucket).getPublicUrl(path);
  return data.publicUrl;
};

import { supabase } from "@/lib/supabase";

export interface BrandLogo {
  id: string;
  brand_name: string;
  logo_url: string;
}

// Cache in-memory para a sessão
let _cache: BrandLogo[] | null = null;

export async function fetchBrandLogos(): Promise<BrandLogo[]> {
  if (_cache !== null) return _cache;
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("brand_logos")
    .select("id, brand_name, logo_url")
    .eq("is_active", true)
    .not("logo_url", "is", null)
    .order("brand_name");

  if (error || !data) return [];

  _cache = data.filter((b): b is BrandLogo => Boolean(b.logo_url));
  return _cache;
}

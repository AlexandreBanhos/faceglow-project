/**
 * Serviço de Cache com padrão stale-while-revalidate
 * Mantém dados antigos enquanto recarrega em background
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleAfter: number; // ms até ficar "stale"
  ttl: number; // ms até expirar completamente
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Obtém dados do cache
   * @param key Chave do cache
   * @param forceRefresh Força recarregar mesmo que tenha dados frescos
   */
  get<T>(key: string, forceRefresh = false): T | null {
    if (forceRefresh) {
      this.cache.delete(key);
      return null;
    }

    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;

    // Se expirou completamente, remove
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Salva dados no cache
   * @param key Chave do cache
   * @param data Dados a salvar
   * @param staleAfter Tempo até ficar "stale" (padrão: 5min)
   * @param ttl Tempo para expirar completamente (padrão: 30min)
   */
  set<T>(key: string, data: T, staleAfter = 5 * 60_000, ttl = 30 * 60_000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      staleAfter,
      ttl,
    });
  }

  /**
   * Verifica se os dados estão "stale" (precisam revalidar)
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key) as CacheEntry<any> | undefined;
    if (!entry) return true;

    const age = Date.now() - entry.timestamp;
    return age > entry.staleAfter;
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove uma entrada específica
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
}

export const cacheService = new CacheService();

/**
 * Padrão: stale-while-revalidate
 * Retorna dados cached enquanto revalida em background
 * 
 * Uso:
 * const data = staleWhileRevalidate('dashboard', () => fetchDashboard());
 */
export const staleWhileRevalidate = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  forceRefresh = false
): Promise<T> => {
  // Se tem dados frescos ou stale, retorna enquanto revalida
  const cached = cacheService.get<T>(key, forceRefresh);

  if (cached && !forceRefresh) {
    // Retorna dados cached imediatamente
    // Se estale, revalida em background sem esperar
    if (cacheService.isStale(key)) {
      // Revalida em background (não espera)
      fetcher()
        .then((fresh) => cacheService.set(key, fresh))
        .catch(() => {
          // Erro ao revalidar, mantém dados antigos
        });
    }
    return cached;
  }

  // Se não tem dados, faz requisição
  try {
    const fresh = await fetcher();
    cacheService.set(key, fresh);
    return fresh;
  } catch (error) {
    // Se falhar, tenta retornar dados antigos
    const stale = cacheService.get<T>(key, false);
    if (stale) {
      console.warn(`Erro ao buscar ${key}, usando dados em cache`);
      return stale;
    }
    throw error;
  }
};

let cachedIsAdmin: boolean | null = null;

export const getAdminCache = () => cachedIsAdmin;
export const setAdminCache = (v: boolean | null) => { cachedIsAdmin = v; };

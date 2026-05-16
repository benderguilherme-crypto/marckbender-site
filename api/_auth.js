// Authentification serveur — valide le mot de passe contre ADMIN_PASSWORD (env var)
export function checkAuth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !token || token !== adminPassword) return false;
  return true;
}

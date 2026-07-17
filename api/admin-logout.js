// Logout du painel de Guias — écrase le cookie de session (Max-Age=0).
// Session VALIDE ⇒ x-csrf-token obligatoire (route d'écriture).
// Session absente/expirée/invalide ⇒ nettoyage toléré sans CSRF, pour que le
// navigateur puisse toujours retirer un cookie devenu inutilisable.

import { clearSessionCookie, isSecureRequest, checkOrigin, requireSession, checkCsrf } from './_session.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!checkOrigin(req)) return res.status(403).json({ error: 'Origem não permitida' });

  const session = requireSession(req);
  if (session && !checkCsrf(req, session)) {
    return res.status(403).json({ error: 'Requisição inválida' });
  }

  res.setHeader('Set-Cookie', clearSessionCookie(isSecureRequest(req)));
  return res.status(200).json({ success: true });
}

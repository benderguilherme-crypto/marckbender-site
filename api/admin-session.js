// Consultation de la session du painel de Guias.
// 200 { authenticated, csrfToken, expiresAt } avec session valide ; 401 sinon,
// sans révéler la raison technique (adultérée, expirée, malformée…).

import { requireSession } from './_session.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const session = requireSession(req);
  if (!session) return res.status(401).json({ authenticated: false });

  return res.status(200).json({ authenticated: true, csrfToken: session.csrf, expiresAt: session.exp * 1000 });
}

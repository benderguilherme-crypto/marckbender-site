import { checkAuth } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode non autorisee' });

  if (checkAuth(req)) {
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ error: 'Non autorise' });
}

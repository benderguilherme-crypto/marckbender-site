import { checkAuth } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode non autorisee' });
  if (!checkAuth(req)) return res.status(401).json({ error: 'Non autorise' });

  const { filename } = req.body;
  if (!filename || !filename.endsWith('.md')) return res.status(400).json({ error: 'Fichier invalide' });

  // Validation stricte du format de nom de fichier
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9\-]+\.md$/.test(filename)) {
    return res.status(400).json({ error: 'Nom de fichier invalide' });
  }

  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_REPO || 'benderguilherme-crypto/marckbender-site';
  const BRANCH = 'main';
  const PATH = `articles/${filename}`;

  if (!TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN non configure' });

  try {
    const checkRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`, {
      headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (!checkRes.ok) return res.status(404).json({ error: 'Article non trouve' });
    const checkData = await checkRes.json();

    const delRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      method: 'DELETE',
      headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Blog: Delete ${filename}`, sha: checkData.sha, branch: BRANCH }),
    });

    if (!delRes.ok) {
      console.error('GitHub API error:', delRes.status);
      return res.status(500).json({ error: 'Erreur suppression GitHub' });
    }

    return res.status(200).json({ success: true, message: 'Article supprime' });
  } catch (err) {
    console.error('Erreur:', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

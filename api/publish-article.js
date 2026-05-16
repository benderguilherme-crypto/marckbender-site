import { checkAuth } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode non autorisee' });
  if (!checkAuth(req)) return res.status(401).json({ error: 'Non autorise' });

  const { filename, content, isImage } = req.body;
  if (!filename || !content) return res.status(400).json({ error: 'Donnees manquantes' });

  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_REPO || 'benderguilherme-crypto/marckbender-site';
  const BRANCH = 'main';

  if (!TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN non configure' });

  // Validation stricte des noms de fichiers — protection contre le path traversal
  let PATH;
  if (isImage) {
    const cleanName = filename.replace(/^images\//, '');
    if (!/^[a-zA-Z0-9_\-]+\.(png|jpg|jpeg|gif|webp|svg)$/i.test(cleanName)) {
      return res.status(400).json({ error: 'Nom de fichier image invalide' });
    }
    PATH = `images/${cleanName}`;
  } else {
    if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9\-]+\.md$/.test(filename)) {
      return res.status(400).json({ error: 'Nom de fichier invalide' });
    }
    PATH = `articles/${filename}`;
  }

  try {
    let sha = null;
    const checkRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`, {
      headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      sha = checkData.sha;
    }

    const body = {
      message: isImage ? `Upload image: ${filename}` : `Blog: ${sha ? 'Update' : 'Publish'} ${filename}`,
      content: isImage ? content : Buffer.from(content).toString('base64'),
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    const pushRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      method: 'PUT',
      headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!pushRes.ok) {
      console.error('GitHub API error:', pushRes.status);
      return res.status(500).json({ error: 'Erreur publication GitHub' });
    }

    return res.status(200).json({ success: true, message: isImage ? 'Image uploadee' : 'Article publie' });
  } catch (err) {
    console.error('Erreur:', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default async function handler(req, res) {
  const file = req.query.file;
  if (!file || !file.endsWith('.md')) return res.status(400).json({ error: 'Fichier invalide' });

  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_REPO || 'benderguilherme-crypto/marckbender-site';

  if (!TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN non configure' });

  try {
    const ghRes = await fetch(`https://api.github.com/repos/${REPO}/contents/articles/${file}?ref=main`, {
      headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' }
    });

    if (!ghRes.ok) return res.status(404).json({ error: 'Article non trouve' });

    const data = await ghRes.json();
    const raw = Buffer.from(data.content, 'base64').toString('utf-8');
    return res.status(200).json({ raw });
  } catch (err) {
    console.error('Erreur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

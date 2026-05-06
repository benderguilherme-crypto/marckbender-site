export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode non autorisee' });

  const { filename } = req.body;
  if (!filename || !filename.endsWith('.md')) return res.status(400).json({ error: 'Fichier invalide' });

  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_REPO || 'benderguilherme-crypto/marckbender-site';
  const BRANCH = 'main';
  const PATH = `articles/${filename}`;

  if (!TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN non configure' });

  try {
    // Get the file SHA
    const checkRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`, {
      headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (!checkRes.ok) return res.status(404).json({ error: 'Article non trouve' });
    const checkData = await checkRes.json();

    // Delete the file
    const delRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      method: 'DELETE',
      headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Blog: Delete ${filename}`, sha: checkData.sha, branch: BRANCH }),
    });

    if (!delRes.ok) {
      const err = await delRes.text();
      console.error('GitHub API error:', delRes.status, err);
      return res.status(500).json({ error: 'Erreur suppression GitHub' });
    }

    return res.status(200).json({ success: true, message: 'Article supprime' });
  } catch (err) {
    console.error('Erreur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

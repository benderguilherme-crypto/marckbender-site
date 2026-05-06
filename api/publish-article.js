export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode non autorisee' });

  const { filename, content } = req.body;
  if (!filename || !content) return res.status(400).json({ error: 'Donnees manquantes' });

  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_REPO || 'benderguilherme-crypto/marckbender-site';
  const BRANCH = 'main';
  const PATH = `articles/${filename}`;

  if (!TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN non configure' });

  try {
    // Check if file already exists to get its SHA (for updates)
    let sha = null;
    const checkRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`, {
      headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      sha = checkData.sha;
    }

    // Create or update the file
    const body = {
      message: `Blog: ${sha ? 'Update' : 'Publish'} ${filename}`,
      content: Buffer.from(content).toString('base64'),
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    const pushRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      method: 'PUT',
      headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!pushRes.ok) {
      const err = await pushRes.text();
      console.error('GitHub API error:', pushRes.status, err);
      return res.status(500).json({ error: 'Erreur publication GitHub' });
    }

    return res.status(200).json({ success: true, message: 'Article publie' });
  } catch (err) {
    console.error('Erreur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

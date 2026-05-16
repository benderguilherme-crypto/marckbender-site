import { checkAuth } from './_auth.js';

export default async function handler(req, res) {
  if (!checkAuth(req)) return res.status(401).json({ error: 'Non autorise' });

  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_REPO || 'benderguilherme-crypto/marckbender-site';
  const BRANCH = 'main';

  if (!TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN non configure' });

  try {
    const ghRes = await fetch(`https://api.github.com/repos/${REPO}/contents/articles?ref=${BRANCH}`, {
      headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' }
    });

    if (!ghRes.ok) return res.status(200).json({ articles: [] });

    const files = await ghRes.json();
    const articles = files
      .filter(f => f.name.endsWith('.md'))
      .map(f => ({ filename: f.name, title: f.name, date: '', slug: f.name.replace('.md', '') }));

    const detailed = await Promise.all(articles.map(async (a) => {
      try {
        const fileRes = await fetch(`https://api.github.com/repos/${REPO}/contents/articles/${a.filename}?ref=${BRANCH}`, {
          headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' }
        });
        if (!fileRes.ok) return a;
        const fileData = await fileRes.json();
        const raw = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const meta = parseFrontmatter(raw);
        return { ...a, title: meta.title || a.filename, date: meta.date || '', slug: meta.slug || a.slug };
      } catch { return a; }
    }));

    detailed.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return res.status(200).json({ articles: detailed });
  } catch (err) {
    console.error('Erreur:', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim().replace(/^"|"$/g, '');
  });
  return meta;
}

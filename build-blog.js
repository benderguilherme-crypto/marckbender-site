#!/usr/bin/env node
// Build script: reads /articles/*.md and generates /blog/[slug].html + updates /blog/index.html
const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, 'articles');
const BLOG_DIR = path.join(__dirname, 'blog');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim().replace(/^"|"$/g, '');
  });
  return { meta, body: match[2] };
}

function mdToHtml(md) {
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<)/, '<p>')
    .replace(/(?!>)$/, '</p>');
  return html;
}

function readingTime(text) {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

// Read all articles
const articles = [];
if (fs.existsSync(ARTICLES_DIR)) {
  fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md')).sort().reverse().forEach(f => {
    const raw = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    articles.push({ ...meta, body, html: mdToHtml(body), readingTime: readingTime(body) });
  });
}

// Generate individual article pages
articles.forEach(a => {
  if (!a.slug) return;
  const page = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${a.title} — Marck Bender</title>
<meta name="description" content="${a.excerpt || ''}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #f5f5f7; --marine: #0a1628; --marine-soft: #1a2942; --teal: #2563b8;
    --teal-soft: #1a4d8c; --text-muted: #5a6478; --text-light: #8a92a3;
    --border: rgba(10,22,40,0.08); --border-strong: rgba(10,22,40,0.12);
    --steel-gradient: linear-gradient(135deg, #a8d4f5 0%, #5a9fdb 25%, #2563b8 60%, #1a4d8c 100%);
    --font-display: 'Instrument Serif', Georgia, serif;
    --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
  body { background: var(--bg); color: var(--marine); font-family: var(--font-body); font-size: 16px; line-height: 1.6; }
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(245,245,247,0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); height: 72px; display: flex; align-items: center; justify-content: space-between; padding: 0 6%; }
  .nav-logo { font-weight: 800; font-size: 18px; letter-spacing: -0.03em; color: var(--marine); text-decoration: none; }
  .nav-links { display: flex; gap: 36px; list-style: none; }
  .nav-links a { font-size: 14px; color: var(--text-muted); text-decoration: none; font-weight: 500; }
  .nav-cta { background: var(--marine); color: white; font-weight: 600; font-size: 14px; padding: 10px 20px; border-radius: 100px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
  .article { padding: 140px 6% 80px; max-width: 720px; margin: 0 auto; }
  .article-back { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: var(--teal-soft); font-weight: 600; text-decoration: none; margin-bottom: 40px; }
  .article-meta { font-size: 14px; color: var(--text-light); margin-bottom: 24px; }
  .article h1 { font-size: clamp(32px, 5vw, 48px); font-weight: 800; letter-spacing: -0.035em; line-height: 1.1; margin-bottom: 40px; }
  .article h2 { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; color: var(--marine); margin: 48px 0 16px; }
  .article h3 { font-size: 22px; font-weight: 700; margin: 36px 0 12px; }
  .article p { font-size: 18px; color: var(--text-muted); line-height: 1.8; margin-bottom: 24px; }
  .article strong { color: var(--marine); font-weight: 600; }
  .article em { font-family: var(--font-display); font-style: italic; }
  .article ul, .article ol { margin-bottom: 24px; padding-left: 24px; }
  .article li { font-size: 17px; color: var(--text-muted); line-height: 1.7; margin-bottom: 8px; }
  .article blockquote { border-left: 3px solid var(--teal); padding: 16px 24px; margin: 32px 0; background: rgba(37,99,184,0.04); border-radius: 0 8px 8px 0; }
  .article blockquote p { margin-bottom: 0; font-style: italic; }
  .article code { background: rgba(10,22,40,0.06); padding: 2px 6px; border-radius: 4px; font-size: 15px; font-family: 'SF Mono', Monaco, monospace; }
  .article pre { background: var(--marine); color: rgba(255,255,255,0.85); padding: 24px; border-radius: 12px; overflow-x: auto; margin: 32px 0; }
  .article pre code { background: none; padding: 0; color: inherit; }
  .nl-box { background: var(--marine); border-radius: 16px; padding: 40px; text-align: center; margin: 60px 0; }
  .nl-box h3 { color: white; font-size: 22px; font-weight: 800; margin-bottom: 12px; }
  .nl-box p { color: rgba(255,255,255,0.7); font-size: 15px; margin-bottom: 24px; }
  .nl-box form { display: flex; gap: 12px; max-width: 480px; margin: 0 auto; }
  .nl-box input[type="email"] { flex: 1; padding: 14px 20px; border: 2px solid rgba(255,255,255,0.15); border-radius: 100px; font-size: 15px; font-family: var(--font-body); background: rgba(255,255,255,0.08); color: white; outline: none; }
  .nl-box input::placeholder { color: rgba(255,255,255,0.4); }
  .nl-box button { background: var(--steel-gradient); color: white; font-weight: 700; padding: 14px 28px; border-radius: 100px; border: none; font-size: 15px; cursor: pointer; white-space: nowrap; }
  footer { background: var(--marine); color: white; padding: 60px 6% 30px; }
  .footer-inner { max-width: 1300px; margin: 0 auto; }
  .footer-logo { font-weight: 800; font-size: 22px; letter-spacing: -0.03em; margin-bottom: 16px; }
  .footer-bottom { padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
  .footer-copy { font-size: 13px; color: rgba(255,255,255,0.4); }
  .footer-legal { display: flex; gap: 24px; }
  .footer-legal a { font-size: 13px; color: rgba(255,255,255,0.5); text-decoration: none; }
  @media (max-width: 700px) { nav { padding: 0 5%; height: 64px; } .nav-links { display: none; } .nl-box form { flex-direction: column; } .nl-box button { width: 100%; } }
</style>
</head>
<body>
<nav>
  <a href="/" class="nav-logo">Marck Bender</a>
  <ul class="nav-links">
    <li><a href="/#methode">Méthode</a></li>
    <li><a href="/#solutions">Solutions</a></li>
    <li><a href="/blog">Blog</a></li>
    <li><a href="/#youtube">YouTube</a></li>
    <li><a href="/#contact">Contact</a></li>
  </ul>
  <a href="/#newsletter" class="nav-cta">S'inscrire <span>→</span></a>
</nav>
<article class="article">
  <a href="/blog" class="article-back">← Retour aux articles</a>
  <div class="article-meta">${new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · ${a.readingTime} min de lecture</div>
  <h1>${a.title}</h1>
  ${a.html}
  <div class="nl-box">
    <h3>Ne rate rien</h3>
    <p>Reçois chaque samedi mes tests, erreurs et découvertes sur l'IA appliquée au business.</p>
    <form id="nl-form"><input type="email" placeholder="ton@email.com" required><button type="submit">Je m'inscris</button></form>
  </div>
</article>
<footer><div class="footer-inner"><div class="footer-logo">Marck Bender</div><div class="footer-bottom"><span class="footer-copy">© 2026 Marck Bender</span><div class="footer-legal"><a href="#">Mentions légales</a><a href="#">Politique de confidentialité</a></div></div></div></footer>
<script>
const f=document.getElementById('nl-form'),e=f.querySelector('input'),b=f.querySelector('button');
f.addEventListener('submit',async ev=>{ev.preventDefault();b.disabled=true;b.textContent='Inscription...';
try{const r=await fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:e.value})});
if(r.ok){b.textContent='Bienvenue !';e.value='';}else b.textContent="Je m'inscris";}catch{b.textContent="Je m'inscris";}
b.disabled=false;setTimeout(()=>{b.textContent="Je m'inscris";},3000);});
</script>
</body>
</html>`;
  fs.writeFileSync(path.join(BLOG_DIR, `${a.slug}.html`), page, 'utf-8');
  console.log(`Generated: /blog/${a.slug}.html`);
});

// Update blog index.html with article list
const indexArticles = articles.map(a => `{
    title: ${JSON.stringify(a.title)},
    date: ${JSON.stringify(a.date)},
    slug: ${JSON.stringify(a.slug)},
    excerpt: ${JSON.stringify(a.excerpt || '')},
    image: ${JSON.stringify(a.image || '')}
  }`).join(',\n  ');

let indexHtml = fs.readFileSync(path.join(BLOG_DIR, 'index.html'), 'utf-8');
indexHtml = indexHtml.replace(
  /const ARTICLES = \[[\s\S]*?\];/,
  `const ARTICLES = [\n  ${indexArticles}\n];`
);
fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), indexHtml, 'utf-8');
console.log('Updated: /blog/index.html');
console.log(`Done. ${articles.length} article(s) processed.`);

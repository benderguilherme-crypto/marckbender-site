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
  // Process bold/italic FIRST so they work inside HTML tags too
  let text = md
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Then protect HTML blocks from other markdown processing
  const htmlBlocks = [];
  text = text.replace(/<[^>]+>[\s\S]*?<\/[^>]+>|<[^>]+\/?>/gi, m => { htmlBlocks.push(m); return `%%HB${htmlBlocks.length - 1}%%`; });
  text = text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:12px;margin:16px 0;">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--teal-soft);font-weight:600;">$1</a>')
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<)/, '<p>')
    .replace(/(?!>)$/, '</p>');
  htmlBlocks.forEach((h, i) => { text = text.replace(`%%HB${i}%%`, h); });
  // Sanitize dangerous HTML — strip scripts, event handlers, javascript: URLs
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
  text = text.replace(/javascript\s*:/gi, '');
  text = text.replace(/(?<!href=")(?<!src=")https?:\/\/[^\s<>"')\]]+/g, url => `<a href="${url}" target="_blank" rel="noopener" style="color:var(--teal-soft);font-weight:600;">${url}</a>`);
  return text;
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

// Tri par date de publication décroissante — garantit que les 3 premiers de ARTICLES
// sont bien les plus récents (les cartes "em destaque" de blog/index.html), même si
// un fichier .md ne commence pas par sa date.
articles.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

// Generate individual article pages
articles.forEach(a => {
  if (!a.slug) return;
  const page = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${a.title} — Bender IA</title>
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
  .nav-links a.active { color: var(--marine); font-weight: 600; }
  .nav-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 8px; flex-direction: column; gap: 5px; }
  .nav-hamburger span { display: block; width: 22px; height: 2px; background: var(--marine); border-radius: 2px; transition: all 0.3s; }
  .nav-hamburger.active span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
  .nav-hamburger.active span:nth-child(2) { opacity: 0; }
  .nav-hamburger.active span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }
  .mobile-menu { display: none; position: fixed; top: 64px; left: 0; right: 0; background: var(--bg); border-bottom: 2px solid var(--border); padding: 24px 5%; z-index: 999; }
  .mobile-menu.show { display: block; }
  .mobile-menu a { display: block; font-size: 18px; font-weight: 600; color: var(--marine); text-decoration: none; padding: 14px 0; border-bottom: 1px solid var(--border); }
  .mobile-menu a:last-child { border-bottom: none; }
  .article { padding: 140px 6% 80px; max-width: 1000px; margin: 0 auto; }
  .article-back { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: var(--teal-soft); font-weight: 600; text-decoration: none; margin-bottom: 40px; }
  .article-meta { font-size: 14px; color: var(--text-light); margin-bottom: 24px; }
  .article h1 { font-size: clamp(32px, 5vw, 48px); font-weight: 800; letter-spacing: -0.035em; line-height: 1.1; margin-bottom: 40px; }
  .article h2 { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; color: var(--marine); margin: 48px 0 16px; }
  .article h3 { font-size: 22px; font-weight: 700; margin: 36px 0 12px; }
  .article p { font-size: 18px; color: var(--text-muted); line-height: 1.8; margin-bottom: 24px; }
  .article strong { color: var(--marine); font-weight: 600; }
  .article a { overflow-wrap: anywhere; }
  .article em { font-family: var(--font-display); font-style: italic; }
  .text-lg { font-size: 22px; display: block; margin-bottom: 16px; }
  .article ul, .article ol { margin-bottom: 24px; padding-left: 24px; }
  .article li { font-size: 17px; color: var(--text-muted); line-height: 1.7; margin-bottom: 8px; }
  .article blockquote { border-left: 3px solid var(--teal); padding: 16px 24px; margin: 32px 0; background: rgba(37,99,184,0.04); border-radius: 0 8px 8px 0; }
  .article blockquote p { margin-bottom: 0; font-style: italic; }
  .article code { background: rgba(10,22,40,0.06); padding: 2px 6px; border-radius: 4px; font-size: 15px; font-family: 'SF Mono', Monaco, monospace; }
  .article img { max-width: 100%; border-radius: 12px; margin: 24px 0; box-shadow: 0 8px 24px -8px rgba(10,22,40,0.15); }
  .article pre { background: var(--marine); color: rgba(255,255,255,0.85); padding: 24px; border-radius: 12px; overflow-x: auto; margin: 32px 0; }
  .article pre code { background: none; padding: 0; color: inherit; }
  .nl-box { background: var(--marine); border-radius: 16px; padding: 40px; text-align: center; margin: 60px 0; }
  .nl-box h3 { color: white; font-size: 22px; font-weight: 800; margin-bottom: 12px; }
  .nl-box p { color: rgba(255,255,255,0.7); font-size: 15px; margin-bottom: 24px; }
  .nl-box form { display: flex; gap: 12px; max-width: 480px; margin: 0 auto; }
  .nl-box input[type="email"] { flex: 1; padding: 14px 20px; border: 2px solid rgba(255,255,255,0.15); border-radius: 100px; font-size: 15px; font-family: var(--font-body); background: rgba(255,255,255,0.08); color: white; outline: none; }
  .nl-box input::placeholder { color: rgba(255,255,255,0.4); }
  .nl-box button { background: var(--steel-gradient); color: white; font-weight: 700; padding: 14px 28px; border-radius: 100px; border: none; font-size: 15px; cursor: pointer; white-space: nowrap; }
  footer { background: var(--marine); color: white; padding: 70px 6% 32px; }
  .footer-inner { max-width: 1100px; margin: 0 auto; text-align: center; }
  .footer-logo { font-weight: 800; font-size: 22px; letter-spacing: -0.03em; margin-bottom: 10px; }
  .footer-tagline { font-size: 15px; color: rgba(255,255,255,0.6); margin-bottom: 32px; }
  .footer-links { display: flex; justify-content: center; flex-wrap: wrap; gap: 28px; margin-bottom: 40px; }
  .footer-links a { font-size: 14px; color: rgba(255,255,255,0.7); text-decoration: none; font-weight: 500; }
  .footer-links a:hover { color: white; }
  .footer-bottom { padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.08); }
  .footer-copy { font-size: 13px; color: rgba(255,255,255,0.4); }
  @media (max-width: 700px) { nav { padding: 0 5%; height: 64px; } .nav-links { display: none; } .nav-hamburger { display: flex; } .nl-box form { flex-direction: column; } .nl-box button { width: 100%; } }
</style>
</head>
<body>
<nav>
  <a href="/" class="nav-logo">Bender IA</a>
  <ul class="nav-links">
    <li><a href="/">Início</a></li>
    <li><a href="/blog" class="active">Guias</a></li>
    <li><a href="/#ia-para-voce">IA para você</a></li>
    <li><a href="/sobre.html">Sobre</a></li>
    <li><a href="/#contact">Contratar</a></li>
  </ul>
  <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
</nav>
<div class="mobile-menu" id="mobile-menu">
  <a href="/">Início</a>
  <a href="/blog">Guias</a>
  <a href="/#ia-para-voce">IA para você</a>
  <a href="/sobre.html">Sobre</a>
  <a href="/#contact">Contratar</a>
</div>
<article class="article">
  <a href="/blog" class="article-back">← Voltar para os guias</a>
  <div class="article-meta">${new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} · ${a.readingTime} min de leitura</div>
  <h1>${a.title}</h1>
  ${a.html}
  <div class="nl-box">
    <h3>Receba os próximos guias no seu e-mail.</h3>
    <p>Conteúdos práticos, testes honestos e aplicações úteis de IA.</p>
    <form id="nl-form"><input type="email" placeholder="Seu melhor e-mail" required><button type="submit">Quero receber</button></form>
  </div>
</article>
<footer>
  <div class="footer-inner">
    <div class="footer-logo">Bender IA</div>
    <p class="footer-tagline">Experiência real. IA que você pode aplicar.</p>
    <div class="footer-links">
      <a href="/">Início</a>
      <a href="/blog">Guias</a>
      <a href="/#ia-para-voce">IA para você</a>
      <a href="/sobre.html">Sobre</a>
      <a href="/#contact">Contratar</a>
    </div>
    <div class="footer-bottom"><span class="footer-copy">© 2026 Telos Conect Serviços Ltda. Todos os direitos reservados.</span></div>
  </div>
</footer>
<script>
const f=document.getElementById('nl-form'),e=f.querySelector('input'),b=f.querySelector('button');
f.addEventListener('submit',async ev=>{ev.preventDefault();b.disabled=true;b.textContent='Enviando...';
try{const r=await fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:e.value})});
if(r.ok){b.textContent='Inscrição confirmada!';e.value='';}else b.textContent='Tente novamente';}catch{b.textContent='Tente novamente';}
b.disabled=false;setTimeout(()=>{b.textContent='Quero receber';},3000);});
const h=document.getElementById('nav-hamburger'),m=document.getElementById('mobile-menu');
if(h&&m){h.addEventListener('click',()=>{h.classList.toggle('active');m.classList.toggle('show');});}
</script>
</body>
</html>`;
  fs.writeFileSync(path.join(BLOG_DIR, `${a.slug}.html`), page, 'utf-8');
  console.log(`Generated: /blog/${a.slug}.html`);
});

// Update blog index.html with article list.
// CONTRAT : blog/index.html est la source de vérité du branding de la page liste "Guias" (pt-BR).
// Le build ne remplace QUE le bloc `const ARTICLES = [...]` via la regex ci-dessous —
// ne jamais élargir ce remplacement, sinon le branding Guias serait écrasé au prochain build.
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

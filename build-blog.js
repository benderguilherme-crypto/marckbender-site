#!/usr/bin/env node
// Build script: reads /articles/*.md and generates /blog/[slug].html + updates /blog/index.html
// Le parsing et le rendu des pages vivent dans lib/render-guia.js (partagé avec la future prévia admin).
const fs = require('fs');
const path = require('path');
const { parseFrontmatter, mdToHtml, readingTime, renderArticlePage } = require('./lib/render-guia.js');

const ARTICLES_DIR = path.join(__dirname, 'articles');
const BLOG_DIR = path.join(__dirname, 'blog');

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
  const page = renderArticlePage(a);
  // Retire les espaces en fin de ligne laissés par les interpolations conditionnelles vides
  fs.writeFileSync(path.join(BLOG_DIR, `${a.slug}.html`), page.replace(/[ \t]+$/gm, ''), 'utf-8');
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
    image: ${JSON.stringify(a.image || '')},
    category: ${JSON.stringify(a.category || '')}
  }`).join(',\n  ');

let indexHtml = fs.readFileSync(path.join(BLOG_DIR, 'index.html'), 'utf-8');
indexHtml = indexHtml.replace(
  /const ARTICLES = \[[\s\S]*?\];/,
  `const ARTICLES = [\n  ${indexArticles}\n];`
);
fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), indexHtml, 'utf-8');
console.log('Updated: /blog/index.html');
console.log(`Done. ${articles.length} article(s) processed.`);

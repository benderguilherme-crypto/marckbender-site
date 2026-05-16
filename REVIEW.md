---
phase: comprehensive-code-review
reviewed: 2026-05-16T12:00:00Z
depth: deep
files_reviewed: 13
files_reviewed_list:
  - index.html
  - blog/index.html
  - blog/bienvenue.html
  - blog/e.html
  - blog/teste.html
  - blog/6-entreprises-avec-l-ia-qui-n-ont-encore-aucune-concurrence.html
  - admin.html
  - api/delete-article.js
  - api/get-article.js
  - api/list-articles.js
  - api/publish-article.js
  - api/subscribe.js
  - build-blog.js
  - vercel.json
  - articles/2026-05-09-6-entreprises-avec-l-ia-qui-n-ont-encore-aucune-concurrence.md
findings:
  critical: 5
  warning: 9
  info: 6
  total: 20
status: issues_found
---

# Code Review Report -- marckbender-site

**Reviewed:** 2026-05-16
**Depth:** deep
**Files Reviewed:** 13 source files + 1 config
**Status:** issues_found

## Summary

The project is a static personal website with a blog system backed by serverless API endpoints (Vercel). The review uncovered 5 critical issues, 9 warnings, and 6 informational findings. The most severe problems are: (1) a hardcoded admin password visible in client-side JavaScript, (2) multiple API endpoints with no authentication allowing unauthenticated write/delete operations, (3) path traversal vulnerabilities in the publish endpoint, and (4) XSS vulnerabilities in the blog build pipeline that passes raw HTML from markdown through to generated pages without sanitization.

---

## Critical Issues

### CR-01: Hardcoded Admin Password in Client-Side Code

**File:** `admin.html:254`
**Issue:** The admin password `Marck2026!` is hardcoded in plaintext JavaScript sent to every visitor. Anyone who views the page source or inspects the network tab gets full admin access. Additionally, the auth check uses `sessionStorage` (line 276) which persists only per-tab -- a trivially bypassable "authentication" mechanism with no server-side validation.

```
const ADMIN_PASS = 'Marck2026!';
```

**Fix:** Remove client-side password entirely. Implement server-side authentication (e.g., HTTP Basic Auth via a middleware, or a session token validated by a serverless function). At minimum, hash the password and validate server-side.

---

### CR-02: No Authentication on API Endpoints (delete, publish, list, get)

**File:** `api/delete-article.js:1`, `api/publish-article.js:1`, `api/list-articles.js:1`, `api/get-article.js:1`
**Issue:** All four GitHub-backed API endpoints perform write operations (create, update, delete files in the repository) and read operations (list all articles, read article contents) without any authentication check. Any internet user can:
- Call `POST /api/delete-article` to delete any article from the repo
- Call `POST /api/publish-article` to write arbitrary files to the repository
- Call `GET /api/list-articles` to enumerate all articles
- Call `GET /api/get-article` to read unpublished article content

The `delete-article.js` and `publish-article.js` endpoints directly mutate the production git repository. This is a direct path to defacement or content injection.

**Fix:** Add authentication middleware to all API endpoints. Validate a session token or API key from the request headers/cookies before processing. Example:

```javascript
export default async function handler(req, res) {
  const token = req.headers.authorization;
  if (!token || token !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Non autorise' });
  }
  // ... rest of handler
}
```

---

### CR-03: Path Traversal in publish-article.js

**File:** `api/publish-article.js:14`
**Issue:** The `filename` parameter is user-controlled and only receives a weak sanitization (`replace('../', '')`) for image uploads. This does not protect against:
- Nested traversal: `....//` or `....\/`
- Absolute paths: `/etc/passwd` or `/vercel.json`
- The article path (`articles/${filename}`) has no validation that `filename` does not contain `../`

An attacker could write files to arbitrary paths in the repository (e.g., overwrite `vercel.json`, `index.html`, or inject a malicious serverless function).

```
const PATH = isImage ? filename.replace('../', '') : `articles/${filename}`;
```

**Fix:** Validate filenames strictly with a whitelist pattern:

```javascript
if (isImage) {
  if (!/^[a-zA-Z0-9_\-]+\.(png|jpg|jpeg|gif|webp|svg)$/i.test(filename)) {
    return res.status(400).json({ error: 'Nom de fichier image invalide' });
  }
  PATH = `images/${filename}`;
} else {
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9\-]+\.md$/.test(filename)) {
    return res.status(400).json({ error: 'Nom de fichier invalide' });
  }
}
```

---

### CR-04: XSS in build-blog.js mdToHtml -- Raw HTML Pass-Through

**File:** `build-blog.js:20-45`
**Issue:** The `mdToHtml` function in `build-blog.js` intentionally passes through raw HTML tags from markdown content to the generated blog pages (lines 26-27 extract HTML blocks and re-inject them at line 42). This means anyone who can edit a markdown article (via the unauthenticated API) can inject arbitrary `<script>` tags, event handlers, or other malicious HTML into generated blog pages that execute for every visitor.

The admin `mdToHtml` (admin.html:296-317) correctly escapes HTML before processing, but the build script does not -- creating a discrepancy where the admin preview is safe but the published page is vulnerable.

**Fix:** Either sanitize the HTML before re-injection (strip `<script>`, `on*` attributes, `javascript:` URLs) or don't allow raw HTML passthrough. Use a proper sanitization library like DOMPurify (server-side equivalent).

```javascript
// After htmlBlocks restoration, sanitize dangerous elements
text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
text = text.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
```

---

### CR-05: XSS via innerHTML in blog/index.html

**File:** `blog/index.html:125-132`
**Issue:** The blog listing page constructs card content by setting innerHTML with article titles, excerpts, and image URLs directly from a JavaScript data array. The article data comes from a `const ARTICLES` array that is overwritten at build time by `build-blog.js`. If an attacker publishes an article with a malicious title or excerpt containing HTML (via the unauthenticated API), the build pipeline writes it into the ARTICLES array as a JavaScript string literal, and the blog index renders it as raw HTML.

```
card.innerHTML = `
  ${a.image ? `...<img src="${a.image}" ...` : ''}
  <div class="blog-card-title">${a.title}</div>
  <div class="blog-card-excerpt">${a.excerpt}</div>
`;
```

**Fix:** Use `textContent` for user-controlled fields or escape HTML before insertion:

```javascript
// Build the card safely
const titleEl = document.createElement('div');
titleEl.className = 'blog-card-title';
titleEl.textContent = a.title;
// etc.
```

---

## Warnings

### WR-01: XSS via innerHTML in index.html YouTube Section

**File:** `index.html:1152`
**Issue:** The YouTube RSS feed handler constructs a large innerHTML string using `latest.title` from an external RSS feed. While the feed comes from YouTube (relatively trusted), the RSS-to-JSON proxy (`api.rss2json.com`) is a third-party service. If the proxy is compromised or returns manipulated data, the `latest.title` value could contain malicious content injected into the DOM.

**Fix:** Escape `latest.title` before inserting it into HTML attributes within the innerHTML string.

---

### WR-02: GitHub Token Exposed in API Responses on Error

**File:** `api/publish-article.js:43`, `api/delete-article.js:31`
**Issue:** Error responses from the GitHub API are logged via `console.error` including the full response body, which may contain the token or sensitive repository information. In Vercel's serverless environment, `console.error` output may be visible in deployment logs.

**Fix:** Log only the status code and a generic error message, not the full response body:

```javascript
console.error('GitHub API error:', pushRes.status);
```

---

### WR-03: Rate Limiting / GitHub API Abuse

**File:** `api/list-articles.js:21-31`
**Issue:** The `list-articles` endpoint makes N+1 API calls to GitHub (one to list, then one per article to read frontmatter). With no authentication and no rate limiting, an attacker could trigger hundreds of GitHub API calls, exhausting the GitHub token rate limit (5000/hour) and potentially causing the GitHub token to be temporarily blocked.

**Fix:** Add rate limiting (e.g., via Vercel Edge Middleware or an in-memory counter) and cache the article list.

---

### WR-04: Weak Email Validation in subscribe.js

**File:** `api/subscribe.js:8`
**Issue:** Email validation only checks `email.includes('@')`, which accepts clearly invalid inputs like `@`, `@@`, `a@`, or `@b`. This could lead to invalid contacts being created in Systeme.io.

```
if (!email || !email.includes('@')) {
```

**Fix:** Use a basic regex pattern:

```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!email || !emailRegex.test(email)) {
```

---

### WR-05: Contact Form Does Not Submit Data Anywhere

**File:** `index.html:1227-1234`
**Issue:** The contact form handler (lines 1227-1234) only resets the form and shows a popup -- it never actually sends the form data to any endpoint. Visitors believe their message was sent, but the data is lost.

```javascript
contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  contactBtn.disabled = true;
  contactBtn.textContent = 'Envoi...';
  contactForm.reset();
  contactPopup.classList.add('show');
  // No actual data submission happens here
  contactBtn.disabled = false;
  contactBtn.textContent = 'Envoyer le message';
});
```

**Fix:** Add a `fetch` call to a backend endpoint (e.g., Formspree, or a new serverless function) to actually send the contact data.

---

### WR-06: Duplicate Blog Article Pages (e.html, teste.html)

**File:** `blog/e.html`, `blog/teste.html`
**Issue:** Two blog article pages exist (`e.html` and `teste.html`) that appear to be test artifacts. They contain truncated/partial content from the main article and are accessible to the public. They are not listed in the blog index but are reachable via direct URL, potentially confusing visitors or diluting SEO.

**Fix:** Delete these test article files and ensure the build script has a mechanism to clean orphaned HTML files from the blog directory.

---

### WR-07: build-blog.js mdToHtml Generates Malformed HTML for bienvenue.html

**File:** `blog/bienvenue.html:78-79`
**Issue:** The generated blog page `bienvenue.html` contains malformed HTML. Line 78-79 shows raw markdown content that was not properly converted, including a duplicate `<h1>` tag inside a `<p>` tag. This is caused by the build-blog.js markdown parser not handling content that starts without a blank line after the frontmatter.

```html
<p>
<h1>Bienvenue. Pourquoi ce blog existe.</h1></p><p>Ce blog est ne...
```

This is invalid HTML (block element `<h1>` inside inline `<p>`) and may render inconsistently across browsers.

**Fix:** Improve the `mdToHtml` parser to handle edge cases where the first content line is a heading, and ensure block-level elements are not wrapped in `<p>` tags.

---

### WR-08: Race Condition in build-blog.js Blog Index Update

**File:** `build-blog.js:172-178`
**Issue:** The build script reads `blog/index.html`, performs a regex replacement, and writes it back. If two builds run concurrently (e.g., two rapid article publishes), one may overwrite the other's changes. The regex pattern `const ARTICLES = \[[\s\S]*?\];` could also fail if the array content contains `];` in a string value.

**Fix:** Use a more robust templating approach (e.g., a placeholder comment like `<!-- ARTICLES -->`) and ensure the build runs atomically.

---

### WR-09: subscribe.js Falls Back to Default TAG_ID '2'

**File:** `api/subscribe.js:64`
**Issue:** The tag ID defaults to `'2'` if `SYSTEME_TAG_ID` is not set. This is a magic number that could apply the wrong tag to contacts in Systeme.io if the environment variable is missing.

```javascript
const TAG_ID = process.env.SYSTEME_TAG_ID || '2';
```

**Fix:** Fail with an error if the env var is not set, rather than silently using a potentially incorrect tag:

```javascript
const TAG_ID = process.env.SYSTEME_TAG_ID;
if (!TAG_ID) {
  console.error('SYSTEME_TAG_ID manquant');
  return res.status(500).json({ error: 'Configuration serveur incomplète' });
}
```

---

## Info

### IN-01: Test/Draft Article Files in Repository

**File:** `blog/e.html`, `blog/teste.html`, `blog/bienvenue.html`
**Issue:** These appear to be test or draft articles that are deployed to production. They are not referenced in the blog index but are publicly accessible.

**Fix:** Add a `.gitignore` pattern or build step to exclude draft/test articles from deployment.

---

### IN-02: Duplicate parseFrontmatter Function

**File:** `build-blog.js:9-18`, `api/list-articles.js:42-49`, `admin.html:483-492`
**Issue:** The `parseFrontmatter` function is duplicated in three separate files with slight variations. This increases maintenance burden and risk of inconsistency.

**Fix:** Extract to a shared utility module that can be imported by both the build script and the API endpoints.

---

### IN-03: vercel.json Exposes Output Directory as Root

**File:** `vercel.json:3`
**Issue:** The `outputDirectory: "."` means the entire repository root is served, including `build-blog.js`, `admin.html`, and potentially sensitive files. The `admin.html` file is publicly accessible at `/admin.html`.

**Fix:** Consider restricting access to `admin.html` via Vercel's middleware or moving it behind authentication. Add a `.vercelignore` to exclude build tools from the output.

---

### IN-04: Footer Links are Placeholder `#` hrefs

**File:** `index.html:1079-1080`, `index.html:1087-1088`, `blog/index.html:93-94`, and all blog article pages
**Issue:** Footer links for "Mentions legales", "Politique de confidentialite", "LinkedIn", and "Instagram" all point to `#`, providing no actual navigation.

**Fix:** Replace with actual URLs or remove until pages/profiles are created.

---

### IN-05: console.log/console.error Statements in API Endpoints

**File:** `api/list-articles.js:37`, `api/get-article.js:21`, `api/publish-article.js:43`, `api/delete-article.js:31`, `api/subscribe.js:16,55,76,83`
**Issue:** Multiple `console.error` and `console.log` calls throughout the API endpoints. While useful for debugging, some log full error objects that may contain sensitive information in production.

**Fix:** Use structured logging with appropriate severity levels and avoid logging full error objects in production.

---

### IN-06: Missing `previewEl` Element Reference in admin.html

**File:** `admin.html:268`
**Issue:** Line 268 references `const previewEl = document.getElementById('preview');` but there is no element with `id="preview"` in the HTML. The preview panel was apparently removed from the editor layout, but the JavaScript still references it. This causes errors on lines 320, 321, 463, 522 when `previewEl.innerHTML` is set on `null`.

```javascript
const previewEl = document.getElementById('preview'); // Returns null
// Later at line 320:
previewEl.innerHTML = mdToHtml(fieldContent.value); // TypeError: cannot set property of null
```

**Fix:** Either add the preview element back to the HTML or add a null check before accessing `previewEl`:

```javascript
const previewEl = document.getElementById('preview');
// Guard all usages:
if (previewEl) previewEl.innerHTML = mdToHtml(fieldContent.value);
```

---

_Reviewed: 2026-05-16_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_

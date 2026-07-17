// Session administrative du painel de Guias — jeton stateless signé HMAC-SHA256.
// Format du jeton : v1.<payload-base64url>.<signature-base64url>
// Le payload ne contient AUCUNE donnée sensible : { v, iat, exp, csrf }.
// Cookie : __Host-bender_admin_session (HTTPS) ou bender_admin_session (dev local HTTP).
// En Vercel (production ET preview), x-forwarded-proto=https ⇒ cookie Secure + préfixe __Host-,
// sans aucune configuration manuelle ; en local HTTP le mode compatible est choisi automatiquement.
// Distinct de api/_auth.js (ancien painel du blog), qui n'est pas touché.

import crypto from 'node:crypto';

const VERSION = 'v1';
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 heures
const MAX_FUTURE_IAT_SECONDS = 60; // tolérance d'horloge pour un iat "dans le futur"
const COOKIE_BASE = 'bender_admin_session';
const COOKIE_SECURE = `__Host-${COOKIE_BASE}`;

export function createSession(secret, nowMs = Date.now()) {
  const iat = Math.floor(nowMs / 1000);
  const exp = iat + SESSION_TTL_SECONDS;
  const csrf = crypto.randomBytes(32).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ v: 1, iat, exp, csrf })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${VERSION}.${payload}`).digest('base64url');
  return { token: `${VERSION}.${payload}.${sig}`, csrfToken: csrf, expiresAt: exp * 1000 };
}

// Retourne le payload de session, ou null pour tout jeton adultéré, expiré,
// malformé, de version inconnue ou signé avec un autre secret.
export function verifySession(token, secret, nowMs = Date.now()) {
  if (typeof token !== 'string' || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [version, payloadB64, sig] = parts;
  if (version !== VERSION) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${version}.${payloadB64}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
  if (payload === null || typeof payload !== 'object') return null;
  if (payload.v !== 1) return null;
  // Cohérence temporelle : entiers positifs, exp > iat, iat pas plus de 60s dans le
  // futur, durée jamais supérieure au TTL officiel (8h) — tout écart ⇒ 401 générique.
  if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) return null;
  if (payload.iat <= 0 || payload.exp <= payload.iat) return null;
  if (payload.iat * 1000 > nowMs + MAX_FUTURE_IAT_SECONDS * 1000) return null;
  if (payload.exp > payload.iat + SESSION_TTL_SECONDS) return null;
  // csrf : exactement 43 caractères base64url = 32 octets aléatoires
  if (typeof payload.csrf !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(payload.csrf)) return null;
  if (payload.exp * 1000 <= nowMs) return null;
  return payload;
}

export function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const out = {};
  header.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

// Vercel termine toujours le TLS : quand on tourne sur Vercel (VERCEL=1 / VERCEL_ENV,
// posées par la plateforme, jamais par le client), la requête est sûre par définition —
// un x-forwarded-proto=http envoyé par un client ne peut PAS forcer le mode non sécurisé.
// Hors Vercel (dev local), on se rabat sur x-forwarded-proto.
export function isSecureRequest(req) {
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) return true;
  return String(req.headers?.['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

export function sessionCookieName(secure) {
  return secure ? COOKIE_SECURE : COOKIE_BASE;
}

export function serializeSessionCookie(token, secure) {
  const parts = [`${sessionCookieName(secure)}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${SESSION_TTL_SECONDS}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(secure) {
  const parts = [`${sessionCookieName(secure)}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

// Lit EXCLUSIVEMENT le cookie de l'environnement courant : __Host- en HTTPS/Vercel,
// nom local en dev HTTP. Aucun fallback croisé — un cookie local valide présenté en
// production est ignoré (session non authentifiée), et inversement.
export function requireSession(req, nowMs = Date.now()) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const cookies = parseCookies(req);
  const token = cookies[sessionCookieName(isSecureRequest(req))];
  if (!token) return null;
  return verifySession(token, secret, nowMs);
}

// Comparaison de mot de passe en temps constant : les deux valeurs passent par SHA-256
// (digests de longueur fixe) puis timingSafeEqual. Jamais loggé, jamais renvoyé.
export function verifyPassword(input) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof input !== 'string' || input.length === 0) return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// Refuse les POST dont l'Origin ne correspond pas EXACTEMENT à l'origine attendue :
// schéma effectif (https en Vercel/HTTPS, http en dev) + host + port. Origines avec
// identifiants embarqués ou malformées ⇒ refus. Un Origin absent est toléré (clients
// non-navigateur) : la défense CSRF principale reste SameSite=Strict + x-csrf-token.
export function checkOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return true;
  const host = req.headers?.host;
  if (!host) return false;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  const scheme = isSecureRequest(req) ? 'https' : 'http';
  return `${url.protocol}//${url.host}` === `${scheme}://${host}`;
}

// Pour les futures routes d'écriture : compare le header x-csrf-token au jeton de la session.
export function checkCsrf(req, sessionPayload) {
  const header = req.headers?.['x-csrf-token'];
  if (!header || !sessionPayload || typeof sessionPayload.csrf !== 'string') return false;
  const a = Buffer.from(String(header));
  const b = Buffer.from(sessionPayload.csrf);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

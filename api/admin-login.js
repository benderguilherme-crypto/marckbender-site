// Login du painel de Guias — émet la session signée (cookie HttpOnly) après
// vérification du mot de passe en temps constant.
// Rate limit en mémoire, "best effort" : le runtime serverless est stateless, chaque
// instance a son propre compteur — protection réelle mais non garantie entre instances.
// Un stockage partagé (ex. Redis) pourra le remplacer plus tard sans changer le contrat.

import { createSession, serializeSessionCookie, isSecureRequest, verifyPassword, checkOrigin } from './_session.js';

const WINDOW_MS = 15 * 60 * 1000; // fenêtre de 15 minutes
const MAX_FAILURES = 5;           // échecs autorisés par IP dans la fenêtre
const FAIL_DELAY_MS = 1000;       // délai fixe sur mot de passe invalide
const MAX_TRACKED_IPS = 10000;    // plafond défensif du Map (anti-croissance via XFF forgé)

const attempts = new Map();

function clientIp(req) {
  const fwd = req.headers?.['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function purgeOldEntries(nowMs) {
  for (const [ip, entry] of attempts) {
    if (nowMs - entry.first > WINDOW_MS) attempts.delete(ip);
  }
}

// Enregistre un échec en purgeant d'abord, puis en évinçant les entrées les plus
// anciennes (le Map préserve l'ordre d'insertion) si le plafond serait dépassé.
function noteFailure(ip, nowMs) {
  purgeOldEntries(nowMs);
  if (!attempts.has(ip) && attempts.size >= MAX_TRACKED_IPS) {
    for (const oldest of attempts.keys()) {
      attempts.delete(oldest);
      if (attempts.size < MAX_TRACKED_IPS) break;
    }
  }
  const entry = attempts.get(ip) || { count: 0, first: nowMs };
  entry.count += 1;
  attempts.set(ip, entry);
}

// Helpers de test — n'exposent que des compteurs, jamais de donnée sensible.
export function _noteFailureForTests(ip, nowMs = Date.now()) { noteFailure(ip, nowMs); }
export function _rateLimiterSize() { return attempts.size; }

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!checkOrigin(req)) return res.status(403).json({ error: 'Origem não permitida' });

  const secret = process.env.SESSION_SECRET;
  if (!process.env.ADMIN_PASSWORD || !secret) {
    console.error('admin-login: configuração incompleta (ADMIN_PASSWORD / SESSION_SECRET)');
    return res.status(500).json({ error: 'Serviço indisponível no momento' });
  }

  const now = Date.now();
  purgeOldEntries(now);
  const ip = clientIp(req);
  const blocked = attempts.get(ip);
  if (blocked && blocked.count >= MAX_FAILURES && now - blocked.first <= WINDOW_MS) {
    res.setHeader('Retry-After', String(Math.ceil((blocked.first + WINDOW_MS - now) / 1000)));
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
  }

  const { password } = req.body || {};
  if (!verifyPassword(password)) {
    noteFailure(ip, now);
    await sleep(FAIL_DELAY_MS);
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  attempts.delete(ip);
  const { token, csrfToken, expiresAt } = createSession(secret, now);
  res.setHeader('Set-Cookie', serializeSessionCookie(token, isSecureRequest(req)));
  return res.status(200).json({ authenticated: true, csrfToken, expiresAt });
}

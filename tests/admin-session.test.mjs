// Tests da autenticação do Painel de Guias — somente node:test / node:assert,
// zero dependências, zero chamadas de rede (handlers chamados com req/res simulados).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import {
  createSession,
  verifySession,
  requireSession,
  serializeSessionCookie,
  clearSessionCookie,
  verifyPassword,
  checkOrigin,
  checkCsrf,
  sessionCookieName,
} from '../api/_session.js';
import loginHandler, { _noteFailureForTests, _rateLimiterSize } from '../api/admin-login.js';
import sessionHandler from '../api/admin-session.js';
import logoutHandler from '../api/admin-logout.js';

const TEST_PASSWORD = 'senha-de-teste-muito-longa-e-unica';
const TEST_SECRET = 'segredo-de-sessao-de-teste-com-mais-de-32-bytes!';

// Baseline local : garante que a máquina de testes não simule Vercel por acidente
delete process.env.VERCEL;
delete process.env.VERCEL_ENV;

function setEnv() {
  process.env.ADMIN_PASSWORD = TEST_PASSWORD;
  process.env.SESSION_SECRET = TEST_SECRET;
}

function mockRes() {
  const res = { statusCode: null, body: null, headers: {} };
  res.status = c => { res.statusCode = c; return res; };
  res.json = b => { res.body = b; return res; };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; return res; };
  return res;
}

function mockReq({ method = 'POST', headers = {}, body = {}, ip = '203.0.113.10' } = {}) {
  return { method, headers: { host: 'www.telosconect.com', 'x-forwarded-for': ip, ...headers }, body, socket: { remoteAddress: ip } };
}

// Assina um payload arbitrário com a MESMA primitiva do módulo (HMAC-SHA256),
// para testar a validação temporal sem duplicar a lógica de verificação.
function signToken(payloadObj, secret = TEST_SECRET) {
  const p = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`v1.${p}`).digest('base64url');
  return `v1.${p}.${sig}`;
}

const VALID_CSRF = crypto.randomBytes(32).toString('base64url');

// --- 1-6 : jeton de session ---

test('1. sessão válida é aceita', () => {
  const { token, csrfToken } = createSession(TEST_SECRET);
  const payload = verifySession(token, TEST_SECRET);
  assert.ok(payload);
  assert.equal(payload.csrf, csrfToken);
  assert.equal(payload.v, 1);
});

test('2. assinatura adulterada é rejeitada', () => {
  const { token } = createSession(TEST_SECRET);
  const [v, p, sig] = token.split('.');
  const tampered = `${v}.${p}.${sig.slice(0, -2)}${sig.endsWith('AA') ? 'BB' : 'AA'}`;
  assert.equal(verifySession(tampered, TEST_SECRET), null);
});

test('3. payload adulterado é rejeitado', () => {
  const { token } = createSession(TEST_SECRET);
  const [v, , sig] = token.split('.');
  const fakePayload = Buffer.from(JSON.stringify({ v: 1, iat: 0, exp: 9999999999, csrf: 'x' })).toString('base64url');
  assert.equal(verifySession(`${v}.${fakePayload}.${sig}`, TEST_SECRET), null);
});

test('4. sessão expirada é rejeitada', () => {
  const past = Date.now() - 9 * 60 * 60 * 1000; // emitida há 9h (TTL = 8h)
  const { token } = createSession(TEST_SECRET, past);
  assert.equal(verifySession(token, TEST_SECRET), null);
  assert.ok(verifySession(token, TEST_SECRET, past + 1000)); // mas era válida na época
});

test('5. versão desconhecida ou formato inválido é rejeitado', () => {
  const { token } = createSession(TEST_SECRET);
  assert.equal(verifySession(token.replace(/^v1\./, 'v2.'), TEST_SECRET), null);
  assert.equal(verifySession('lixo-sem-formato', TEST_SECRET), null);
  assert.equal(verifySession('', TEST_SECRET), null);
});

test('6. segredo diferente rejeita a sessão', () => {
  const { token } = createSession(TEST_SECRET);
  assert.equal(verifySession(token, 'outro-segredo-completamente-diferente-123'), null);
});

// --- 7-9 : cookie ---

test('7. cookie de produção: __Host-, HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age', () => {
  const { token } = createSession(TEST_SECRET);
  const cookie = serializeSessionCookie(token, true);
  assert.ok(cookie.startsWith('__Host-bender_admin_session='));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=28800/); // 8 horas
  assert.doesNotMatch(cookie, /Domain=/);
});

test('8. cookie local (HTTP) não usa Secure nem __Host-', () => {
  const { token } = createSession(TEST_SECRET);
  const cookie = serializeSessionCookie(token, false);
  assert.ok(cookie.startsWith('bender_admin_session='));
  assert.doesNotMatch(cookie, /Secure/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
});

test('9. logout gera cookie expirado (Max-Age=0)', () => {
  const cookie = clearSessionCookie(true);
  assert.match(cookie, /Max-Age=0/);
  assert.ok(cookie.startsWith('__Host-bender_admin_session='));
});

// --- 10-11 : senha ---

test('10. comparação de senha aceita valor correto', () => {
  setEnv();
  assert.equal(verifyPassword(TEST_PASSWORD), true);
});

test('11. comparação rejeita valor incorreto (inclusive tamanhos diferentes)', () => {
  setEnv();
  assert.equal(verifyPassword('errada'), false);
  assert.equal(verifyPassword(TEST_PASSWORD + 'x'), false);
  assert.equal(verifyPassword(''), false);
  assert.equal(verifyPassword(null), false);
});

// --- 12-14 : endpoint de login ---

test('12. login correto retorna sessão e nunca devolve a senha', async () => {
  setEnv();
  const res = mockRes();
  await loginHandler(mockReq({ body: { password: TEST_PASSWORD }, ip: '198.51.100.1' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.authenticated, true);
  assert.ok(res.body.csrfToken);
  assert.ok(res.body.expiresAt > Date.now());
  assert.ok(res.headers['set-cookie']);
  const serialized = JSON.stringify(res.body) + JSON.stringify(res.headers);
  assert.ok(!serialized.includes(TEST_PASSWORD));
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('13. login incorreto retorna 401 genérico', async () => {
  setEnv();
  const res = mockRes();
  await loginHandler(mockReq({ body: { password: 'errada' }, ip: '198.51.100.2' }), res);
  assert.equal(res.statusCode, 401);
  assert.ok(!res.headers['set-cookie']);
});

test('14. ausência de variáveis falha de forma segura', async () => {
  delete process.env.ADMIN_PASSWORD;
  delete process.env.SESSION_SECRET;
  const res = mockRes();
  await loginHandler(mockReq({ body: { password: 'qualquer' }, ip: '198.51.100.3' }), res);
  assert.equal(res.statusCode, 500);
  assert.ok(!res.headers['set-cookie']); // nenhuma sessão fraca criada
  assert.ok(!JSON.stringify(res.body).match(/ADMIN_PASSWORD|SESSION_SECRET|senha-de-teste/));
  setEnv();
});

// --- 15-16 : endpoint de sessão ---

test('15. endpoint de sessão retorna 401 sem cookie', async () => {
  setEnv();
  const res = mockRes();
  await sessionHandler(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.authenticated, false);
});

test('16. sessão aceita somente o cookie do ambiente correspondente', async () => {
  setEnv();
  const { token, csrfToken } = createSession(TEST_SECRET);
  // Local (HTTP): somente o cookie sem prefixo
  let res = mockRes();
  await sessionHandler(mockReq({ method: 'GET', headers: { cookie: `bender_admin_session=${token}` } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.csrfToken, csrfToken);
  // Produção (HTTPS): somente o cookie __Host-
  res = mockRes();
  await sessionHandler(mockReq({ method: 'GET', headers: { cookie: `__Host-bender_admin_session=${token}`, 'x-forwarded-proto': 'https' } }), res);
  assert.equal(res.statusCode, 200);
});

// --- 17 : rate limit ---

test('17. rate limit retorna 429 com Retry-After após o limite', async () => {
  setEnv();
  const ip = '198.51.100.99';
  for (let i = 0; i < 5; i++) {
    const res = mockRes();
    await loginHandler(mockReq({ body: { password: 'errada' }, ip }), res);
    assert.equal(res.statusCode, 401);
  }
  const res = mockRes();
  await loginHandler(mockReq({ body: { password: TEST_PASSWORD }, ip }), res); // até a senha certa é bloqueada
  assert.equal(res.statusCode, 429);
  assert.ok(Number(res.headers['retry-after']) > 0);
});

// --- 18 : Origin ---

test('18. Origin incompatível é rejeitado; Origin correto é aceito', async () => {
  setEnv();
  const bad = mockRes();
  await loginHandler(mockReq({ body: { password: TEST_PASSWORD }, ip: '198.51.100.4', headers: { origin: 'https://malicioso.example', 'x-forwarded-proto': 'https' } }), bad);
  assert.equal(bad.statusCode, 403);
  const good = mockRes();
  await loginHandler(mockReq({ body: { password: TEST_PASSWORD }, ip: '198.51.100.5', headers: { origin: 'https://www.telosconect.com', 'x-forwarded-proto': 'https' } }), good);
  assert.equal(good.statusCode, 200);
  assert.equal(checkOrigin({ headers: { host: 'a.com' } }), true); // sem Origin: tolerado
  assert.equal(checkOrigin({ headers: { host: 'a.com', origin: 'not-a-url' } }), false);
});

// --- 19 : superfície do módulo ---

test('19. helpers principais existem e CSRF funciona', () => {
  for (const fn of [createSession, verifySession, requireSession, serializeSessionCookie, clearSessionCookie, verifyPassword, checkOrigin, checkCsrf, sessionCookieName]) {
    assert.equal(typeof fn, 'function');
  }
  const { token, csrfToken } = createSession(TEST_SECRET);
  const payload = verifySession(token, TEST_SECRET);
  assert.equal(checkCsrf({ headers: { 'x-csrf-token': csrfToken } }, payload), true);
  assert.equal(checkCsrf({ headers: { 'x-csrf-token': 'falso' } }, payload), false);
  assert.equal(checkCsrf({ headers: {} }, payload), false);
});

// --- 20 : nenhum endpoint devolve secrets ---

test('20. logout funciona e nenhum endpoint devolve secrets', async () => {
  setEnv();
  const responses = [];

  let res = mockRes();
  await logoutHandler(mockReq({ ip: '198.51.100.6' }), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['set-cookie'], /Max-Age=0/);
  responses.push(res);

  res = mockRes();
  await sessionHandler(mockReq({ method: 'GET' }), res);
  responses.push(res);

  res = mockRes();
  await loginHandler(mockReq({ body: { password: TEST_PASSWORD }, ip: '198.51.100.7' }), res);
  responses.push(res);

  for (const r of responses) {
    const serialized = JSON.stringify(r.body);
    assert.ok(!serialized.includes(TEST_PASSWORD), 'resposta contém a senha');
    assert.ok(!serialized.includes(TEST_SECRET), 'resposta contém o segredo');
  }
});

// --- 21-23 : endurecimento N1 — cookie exclusivo por ambiente ---

test('21. cookie local válido é rejeitado em produção', async () => {
  setEnv();
  const { token } = createSession(TEST_SECRET);
  const res = mockRes();
  await sessionHandler(mockReq({ method: 'GET', headers: { cookie: `bender_admin_session=${token}`, 'x-forwarded-proto': 'https' } }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.authenticated, false);
});

test('22. com dois cookies simultâneos, produção usa somente o __Host-', async () => {
  setEnv();
  const { token: valid } = createSession(TEST_SECRET);
  // __Host- válido + local inválido ⇒ 200 (o local é ignorado)
  let res = mockRes();
  await sessionHandler(mockReq({ method: 'GET', headers: { cookie: `__Host-bender_admin_session=${valid}; bender_admin_session=INVALIDO`, 'x-forwarded-proto': 'https' } }), res);
  assert.equal(res.statusCode, 200);
  // __Host- inválido + local VÁLIDO ⇒ 401 (nenhum fallback para o local)
  res = mockRes();
  await sessionHandler(mockReq({ method: 'GET', headers: { cookie: `__Host-bender_admin_session=INVALIDO; bender_admin_session=${valid}`, 'x-forwarded-proto': 'https' } }), res);
  assert.equal(res.statusCode, 401);
});

test('23. cookie __Host- não é usado como fallback em ambiente local', async () => {
  setEnv();
  const { token } = createSession(TEST_SECRET);
  const res = mockRes();
  await sessionHandler(mockReq({ method: 'GET', headers: { cookie: `__Host-bender_admin_session=${token}` } }), res);
  assert.equal(res.statusCode, 401);
});

// --- 24 : endurecimento N3 — VERCEL=1 ignora x-forwarded-proto=http ---

test('24. em VERCEL=1, x-forwarded-proto=http não força cookie inseguro', async () => {
  setEnv();
  process.env.VERCEL = '1';
  try {
    const res = mockRes();
    await loginHandler(mockReq({ body: { password: TEST_PASSWORD }, ip: '198.51.100.8', headers: { 'x-forwarded-proto': 'http' } }), res);
    assert.equal(res.statusCode, 200);
    assert.ok(res.headers['set-cookie'].startsWith('__Host-bender_admin_session='));
    assert.match(res.headers['set-cookie'], /Secure/);
  } finally {
    delete process.env.VERCEL;
  }
});

// --- 25 : endurecimento N2 — Origin completa (esquema + host + porta) ---

test('25. Origin compara esquema, host e porta; credenciais e malformações são rejeitadas', () => {
  const secure = extra => ({ headers: { host: 'www.telosconect.com', 'x-forwarded-proto': 'https', ...extra } });
  assert.equal(checkOrigin(secure({ origin: 'https://www.telosconect.com' })), true);
  assert.equal(checkOrigin(secure({ origin: 'http://www.telosconect.com' })), false); // esquema http em requisição segura
  assert.equal(checkOrigin(secure({ origin: 'https://www.telosconect.com.attacker.com' })), false); // sufixo malicioso
  assert.equal(checkOrigin(secure({ origin: 'https://sub.www.telosconect.com' })), false); // subdomínio
  assert.equal(checkOrigin(secure({ origin: 'https://www.telosconect.com:8443' })), false); // porta divergente
  assert.equal(checkOrigin(secure({ origin: 'https://user:pass@www.telosconect.com' })), false); // credenciais embutidas
  assert.equal(checkOrigin(secure({ origin: 'null' })), false); // Origin "null" (iframe sandbox)
  // Desenvolvimento local: http + porta real funcionam
  const local = { headers: { host: '127.0.0.1:8936', origin: 'http://127.0.0.1:8936' } };
  assert.equal(checkOrigin(local), true);
});

// --- 26 : endurecimento N4 — CSRF no logout ---

test('26. logout: CSRF obrigatório com sessão válida; limpeza tolerada sem sessão', async () => {
  setEnv();
  const { token, csrfToken } = createSession(TEST_SECRET);
  const withSession = extra => mockReq({ headers: { cookie: `bender_admin_session=${token}`, ...extra } });

  // sessão válida + CSRF correto ⇒ 200
  let res = mockRes();
  await logoutHandler(withSession({ 'x-csrf-token': csrfToken }), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['set-cookie'], /Max-Age=0/);

  // sessão válida + CSRF ausente ⇒ 403
  res = mockRes();
  await logoutHandler(withSession({}), res);
  assert.equal(res.statusCode, 403);

  // sessão válida + CSRF incorreto ⇒ 403
  res = mockRes();
  await logoutHandler(withSession({ 'x-csrf-token': 'token-errado' }), res);
  assert.equal(res.statusCode, 403);

  // sessão ausente ⇒ 200
  res = mockRes();
  await logoutHandler(mockReq({}), res);
  assert.equal(res.statusCode, 200);

  // sessão expirada ⇒ 200 (limpeza tolerada)
  const { token: expired } = createSession(TEST_SECRET, Date.now() - 9 * 60 * 60 * 1000);
  res = mockRes();
  await logoutHandler(mockReq({ headers: { cookie: `bender_admin_session=${expired}` } }), res);
  assert.equal(res.statusCode, 200);

  // cookie malformado ⇒ 200
  res = mockRes();
  await logoutHandler(mockReq({ headers: { cookie: 'bender_admin_session=lixo' } }), res);
  assert.equal(res.statusCode, 200);

  // Origin divergente ⇒ 403 mesmo com CSRF correto
  res = mockRes();
  await logoutHandler(withSession({ 'x-csrf-token': csrfToken, origin: 'https://malicioso.example' }), res);
  assert.equal(res.statusCode, 403);
});

// --- 27 : endurecimento M1 — coerência temporal do payload ---

test('27. payloads temporalmente incoerentes são rejeitados mesmo com assinatura válida', () => {
  const now = Date.now();
  const iat = Math.floor(now / 1000);
  const ok = { v: 1, iat, exp: iat + 3600, csrf: VALID_CSRF };
  assert.ok(verifySession(signToken(ok), TEST_SECRET, now)); // controle: base aceita

  assert.equal(verifySession(signToken({ ...ok, iat: iat + 120, exp: iat + 3720 }), TEST_SECRET, now), null); // iat >60s no futuro
  assert.equal(verifySession(signToken({ ...ok, exp: iat }), TEST_SECRET, now), null); // exp == iat
  assert.equal(verifySession(signToken({ ...ok, exp: iat - 10 }), TEST_SECRET, now), null); // exp < iat
  assert.equal(verifySession(signToken({ ...ok, exp: iat + 9 * 60 * 60 }), TEST_SECRET, now), null); // duração > 8h
  assert.equal(verifySession(signToken({ ...ok, iat: iat + 0.5, exp: iat + 3600.5 }), TEST_SECRET, now), null); // não inteiros
  assert.equal(verifySession(signToken({ ...ok, iat: -5, exp: 3600 }), TEST_SECRET, now), null); // iat não positivo
  assert.equal(verifySession(signToken({ v: 1, iat, exp: iat + 3600 }), TEST_SECRET, now), null); // csrf ausente
  assert.equal(verifySession(signToken({ ...ok, csrf: 'curto' }), TEST_SECRET, now), null); // csrf formato inválido
  assert.equal(verifySession(signToken({ ...ok, csrf: 'a'.repeat(44) }), TEST_SECRET, now), null); // csrf tamanho errado
});

// --- 28 : segmentos extras/ausentes ---

test('28. token com segmentos adicionais ou ausentes é rejeitado', () => {
  const { token } = createSession(TEST_SECRET);
  assert.equal(verifySession(`${token}.extra`, TEST_SECRET), null);
  const [v, p] = token.split('.');
  assert.equal(verifySession(`${v}.${p}`, TEST_SECRET), null);
  assert.equal(verifySession(v, TEST_SECRET), null);
});

// --- 29 : métodos incorretos ---

test('29. métodos não permitidos retornam 405 nos três endpoints', async () => {
  setEnv();
  let res = mockRes();
  await loginHandler(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
  res = mockRes();
  await sessionHandler(mockReq({ method: 'POST' }), res);
  assert.equal(res.statusCode, 405);
  res = mockRes();
  await logoutHandler(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
});

// --- 30 : corpo inválido no login ---

test('30. login com corpo ausente ou não JSON é rejeitado com 401', async () => {
  setEnv();
  let res = mockRes();
  await loginHandler(mockReq({ body: undefined, ip: '198.51.100.20' }), res);
  assert.equal(res.statusCode, 401);
  res = mockRes();
  await loginHandler(mockReq({ body: 'texto-nao-json', ip: '198.51.100.21' }), res);
  assert.equal(res.statusCode, 401);
});

// --- 31 : endurecimento M2 — teto do rate limiter (sem atraso: usa helpers de teste) ---

test('31. o armazenamento do rate limiter nunca ultrapassa o teto de 10000 entradas', () => {
  assert.equal(typeof _noteFailureForTests, 'function');
  assert.equal(typeof _rateLimiterSize, 'function');
  for (let i = 0; i < 10500; i++) {
    _noteFailureForTests(`192.0.2.${i}`); // IPs sintéticos distintos
  }
  assert.ok(_rateLimiterSize() <= 10000, `tamanho ${_rateLimiterSize()} excede o teto`);
});

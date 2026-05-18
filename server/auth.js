import crypto from 'node:crypto';

const TOKEN_TTL_SECONDS = Number(process.env.JWT_EXPIRES_SECONDS || 60 * 60 * 12);
const isProduction = process.env.NODE_ENV === 'production';

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const unsigned = [
    base64UrlEncode(JSON.stringify(header)),
    base64UrlEncode(JSON.stringify(body)),
  ].join('.');
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function verifyJwt(token, secret) {
  const [encodedHeader, encodedPayload, signature] = String(token || '').split('.');
  if (!encodedHeader || !encodedPayload || !signature) return null;

  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expected = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.RUTE_JWT_SECRET;
  if (secret) return secret;
  if (isProduction) {
    throw new Error('JWT_SECRET wajib diset untuk production.');
  }
  return 'rute-dev-jwt-secret-change-before-production';
}

function getUserPin(role) {
  const normalizedRole = String(role || '').toLowerCase();
  const envKey = normalizedRole === 'owner' ? 'RUTE_OWNER_PIN' : 'RUTE_PARTNER_PIN';
  const pin = process.env[envKey];
  if (pin) return pin;
  if (isProduction) {
    throw new Error(`${envKey} wajib diset untuk production.`);
  }
  return normalizedRole === 'owner' ? '123456' : '654321';
}

function safeUser(user) {
  if (!user) return null;
  const { pin, password, pinHash, passwordHash, ...publicUser } = user;
  void pin;
  void password;
  void pinHash;
  void passwordHash;
  return publicUser;
}

function findUserByRole(db, role) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (!normalizedRole) return null;

  if (Array.isArray(db.users)) {
    return db.users.find((user) => user.role === normalizedRole) || null;
  }

  return db.users?.[normalizedRole] || null;
}

function validPin(inputPin, expectedPin) {
  const input = Buffer.from(String(inputPin || ''));
  const expected = Buffer.from(String(expectedPin || ''));
  return input.length === expected.length && crypto.timingSafeEqual(input, expected);
}

export function loginWithRolePin(db, { role, pin } = {}) {
  const user = findUserByRole(db, role);
  if (!user) return null;
  if (user.active === false) return null;
  if (!pin || !validPin(pin, getUserPin(user.role))) return null;

  const publicUser = safeUser(user);
  const token = signJwt(
    {
      sub: String(publicUser.id),
      role: publicUser.role,
      name: publicUser.name,
    },
    getJwtSecret(),
  );

  return { token, user: publicUser };
}

export function authenticateRequest(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token otorisasi wajib dikirim' });
  }

  try {
    const payload = verifyJwt(token, getJwtSecret());
    if (!payload) return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' });
    req.auth = payload;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function getAuthenticatedUser(db, auth) {
  const user = Array.isArray(db.users)
    ? db.users.find((candidate) => String(candidate.id) === String(auth?.sub))
    : Object.values(db.users || {}).find((candidate) => String(candidate.id) === String(auth?.sub));
  return safeUser(user);
}

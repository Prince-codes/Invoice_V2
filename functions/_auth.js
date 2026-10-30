const SESSION_COOKIE = 'invoice_session';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

export function getAuthConfiguration(env) {
  const username = env.LOGIN_USERNAME;
  const password = env.LOGIN_PASSWORD;
  const secret = env.SESSION_SECRET;

  if (
    typeof username !== 'string' ||
    !username ||
    typeof password !== 'string' ||
    password.length < 12 ||
    typeof secret !== 'string' ||
    secret.length < 32
  ) {
    return null;
  }

  return { username, password, secret };
}

export async function createSessionCookie(username, secret, requestUrl) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const encodedUsername = bytesToBase64Url(new TextEncoder().encode(username));
  const payload = `${encodedUsername}.${expiresAt}`;
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const token = `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
  const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : '';

  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}${secure}`;
}

export function clearSessionCookie(requestUrl) {
  const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export async function getSessionUser(request, secret) {
  if (typeof secret !== 'string' || secret.length < 32) return null;

  const cookie = request.headers.get('Cookie') || '';
  const token = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;

  const [encodedUsername, expiresAtText, signatureText, ...extra] = token.split('.');
  if (!encodedUsername || !expiresAtText || !signatureText || extra.length) return null;

  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;

  try {
    const key = await importSigningKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signatureText),
      new TextEncoder().encode(`${encodedUsername}.${expiresAtText}`)
    );
    if (!valid) return null;

    return new TextDecoder().decode(base64UrlToBytes(encodedUsername));
  } catch {
    return null;
  }
}

export async function constantTimeStringEquals(left, right) {
  const encoder = new TextEncoder();
  const leftHash = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(left)));
  const rightHash = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(right)));
  let difference = 0;

  for (let index = 0; index < leftHash.length; index += 1) {
    difference |= leftHash[index] ^ rightHash[index];
  }

  return difference === 0;
}

export function authJsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

async function importSigningKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bytesToBase64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

import { authJsonResponse, getAuthConfiguration, getSessionUser } from '../../_auth.js';

export async function onRequestGet({ request, env }) {
  const config = getAuthConfiguration(env);
  if (!config) {
    return authJsonResponse({ error: 'Login is not configured on the server.' }, 503);
  }

  const username = await getSessionUser(request, config.secret);
  if (!username) {
    return authJsonResponse({ error: 'Authentication required.' }, 401);
  }

  return authJsonResponse({ user: { username } });
}

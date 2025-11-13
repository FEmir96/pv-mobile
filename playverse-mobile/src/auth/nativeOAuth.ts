// playverse/playverse-mobile/src/auth/nativeOAuth.ts
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import { convexHttp } from '../lib/convexClient';

WebBrowser.maybeCompleteAuthSession();

type OAuthResult = {
  ok: boolean;
  email?: string;
  name?: string;
  avatarUrl?: string;
  error?: string;
};

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

function randomNonce() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Decodifica el payload de un JWT (base64url) a JSON
function b64UrlJson<T = unknown>(input?: string): T | undefined {
  if (!input) return undefined;
  try {
    const pad = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);

    // En web solemos tener atob; en nativo usamos Buffer sin tocar 'global'
    if (typeof atob === 'function') {
      // ojo: atob devuelve binario en latin1
      // eslint-disable-next-line no-undef
      const json = decodeURIComponent(escape(atob(base64)));
      return JSON.parse(json) as T;
    }

    const json = Buffer.from(base64, 'base64').toString('utf8');
    return json ? (JSON.parse(json) as T) : undefined;
  } catch {
    return undefined;
  }
}

// --- helpers de tipos para TS ---
type ResultWithParams = AuthSession.AuthSessionResult & {
  params?: Record<string, string>;
};
const getParams = (r: AuthSession.AuthSessionResult) =>
  ((r as ResultWithParams).params ?? {}) as Record<string, string>;

// ---------------------------------

type PromptOptions = AuthSession.AuthRequestPromptOptions & { useProxy?: boolean };
type RedirectSetup = { redirectUri: string; promptOptions: PromptOptions };

function resolveRedirect(): RedirectSetup {
  const isWeb = Platform.OS === 'web';
  const isExpoGo = Constants.appOwnership === 'expo';

  if (isWeb) {
    // Google/Azure requieren origin EXACTO
    const base =
      (typeof window !== 'undefined' && window.location.origin) || 'http://localhost:8081';
    const redirectUri = base.endsWith('/') ? base : `${base}/`;
    console.log('[Auth] Redirect URI (web origin):', redirectUri);
    return { redirectUri, promptOptions: {} as PromptOptions };
  }

  if (isExpoGo) {
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true } as any);
    console.log('[Auth] Redirect URI (expo proxy):', redirectUri);
    return { redirectUri, promptOptions: { useProxy: true } as PromptOptions };
  }

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'playverse', path: 'auth/callback' });
  console.log('[Auth] Redirect URI (native scheme):', redirectUri);
  return { redirectUri, promptOptions: {} as PromptOptions };
}

export async function signInWithGoogleNative(): Promise<OAuthResult> {
  const extras = (Constants.expoConfig?.extra || {}) as any;
  const authExtra = extras?.auth?.google ?? {};
  const { redirectUri, promptOptions } = resolveRedirect();
  const isExpoGo = Constants.appOwnership === 'expo';

  const clientId = isExpoGo
    ? authExtra.expoClientId ??
      extras.googleExpoClientId ??
      process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ??
      extras.googleClientId ??
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID
    : extras.googleClientId ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) return { ok: false, error: 'Missing GOOGLE_CLIENT_ID' };

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: 'id_token',
    usePKCE: false,
    scopes: ['openid', 'email', 'profile'],
    extraParams: { nonce: randomNonce() },
  });

  const authUrl = await request.makeAuthUrlAsync({
    authorizationEndpoint: GOOGLE_AUTH_ENDPOINT,
  });
  console.log('[Auth] Google authUrl:', authUrl);

  const result = await request.promptAsync(
    { authorizationEndpoint: GOOGLE_AUTH_ENDPOINT },
    promptOptions as AuthSession.AuthRequestPromptOptions
  );
  console.log('[Google] result:', result);

  if (result.type !== 'success') {
    const p = getParams(result);
    const err = (result as any).error ?? p.error;
    const desc = (result as any).error_description ?? p.error_description;
    return { ok: false, error: err ? `${err}: ${decodeURIComponent(desc || '')}` : 'Canceled or failed' };
  }

  const p = getParams(result);
  const idToken = p.id_token as string | undefined;
  if (!idToken) return { ok: false, error: 'Missing id_token' };

  const payload = b64UrlJson<any>(idToken.split('.')[1]);
  const email = String(payload?.email || '').toLowerCase();
  const name = String(payload?.name || '');
  const avatarUrl = String(payload?.picture || '');
  const sub = String(payload?.sub || '');
  if (!email) return { ok: false, error: 'Token without email' };

  try {
    await (convexHttp as any).mutation('auth:oauthUpsert', {
      email,
      name,
      avatarUrl,
      provider: 'google',
      providerId: sub,
    });
    return { ok: true, email, name, avatarUrl };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Upsert failed' };
  }
}

export async function signInWithMicrosoftNative(): Promise<OAuthResult> {
  const extras = (Constants.expoConfig?.extra || {}) as any;
  const authExtra = extras?.auth?.microsoft ?? {};
  const { redirectUri, promptOptions } = resolveRedirect();
  const isExpoGo = Constants.appOwnership === 'expo';

  const clientId = isExpoGo
    ? authExtra.expoClientId ??
      extras.microsoftExpoClientId ??
      process.env.EXPO_PUBLIC_MICROSOFT_EXPO_CLIENT_ID ??
      extras.microsoftClientId ??
      process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID
    : extras.microsoftClientId ?? process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID;

  const tenant =
    authExtra.tenantId ??
    extras.microsoftTenantId ??
    process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID ??
    'consumers';

  if (!clientId) return { ok: false, error: 'Missing MICROSOFT_CLIENT_ID' };

  const authEndpoint = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: 'id_token',
    usePKCE: false,
    scopes: ['openid', 'profile', 'email'],
    extraParams: {
      response_mode: 'fragment',
      nonce: randomNonce(),
    },
  });

  const authUrl = await request.makeAuthUrlAsync({ authorizationEndpoint: authEndpoint });
  console.log('[Auth] Microsoft authUrl:', authUrl);

  const result = await request.promptAsync(
    { authorizationEndpoint: authEndpoint },
    promptOptions as AuthSession.AuthRequestPromptOptions
  );
  console.log('[MS] result:', result);

  if (result.type !== 'success') {
    const p = getParams(result);
    const err = (result as any).error ?? p.error;
    const desc = (result as any).error_description ?? p.error_description;
    return { ok: false, error: err ? `${err}: ${decodeURIComponent(desc || '')}` : 'Canceled or failed' };
  }

  const p = getParams(result);
  if (p.error) {
    return { ok: false, error: `${p.error}: ${decodeURIComponent(p.error_description || '')}` };
  }

  const idToken = p.id_token as string | undefined;
  if (!idToken) return { ok: false, error: 'Missing id_token' };

  const payload = b64UrlJson<any>(idToken.split('.')[1]);
  const email = String(
    payload?.email || payload?.preferred_username || (payload?.emails?.[0] ?? '')
  ).toLowerCase();
  const name = String(payload?.name || '');
  const sub = String(payload?.sub || '');
  if (!email) return { ok: false, error: 'Token without email' };

  try {
    await (convexHttp as any).mutation('auth:oauthUpsert', {
      email,
      name,
      provider: 'microsoft',
      providerId: sub,
    });
    return { ok: true, email, name };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Upsert failed' };
  }
}

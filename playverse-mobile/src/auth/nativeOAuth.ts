// playverse/playverse-mobile/src/auth/nativeOAuth.ts
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import * as AuthSession from 'expo-auth-session';
import { ResponseType } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';
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
const CALLBACK_PATH = 'auth/callback';
const EXPO_AUTH_PROXY_URL = 'https://auth.expo.io';

const isRunningInExpoGo = () =>
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const sanitizeOwner = (owner?: string) => {
  if (!owner) return undefined;
  return owner.startsWith('@') ? owner : `@${owner}`;
};

function getExpoProjectFullName() {
  const config = (Constants.expoConfig ?? {}) as any;
  const explicitFullName =
    config.originalFullName ??
    (Constants.manifest2 as any)?.extra?.expoClientFullName ??
    process.env.EXPO_PUBLIC_EXPO_FULL_NAME ??
    process.env.EXPO_PROJECT_FULL_NAME;

  if (explicitFullName) {
    const normalized = explicitFullName.startsWith('@')
      ? explicitFullName
      : `@${explicitFullName.replace(/^@/, '')}`;
    return normalized;
  }

  const owner =
    sanitizeOwner(config.owner ?? process.env.EXPO_PUBLIC_EXPO_OWNER ?? process.env.EXPO_PROJECT_OWNER) ??
    '@anonymous';
  const slug = config.slug ?? process.env.EXPO_PUBLIC_EXPO_SLUG ?? process.env.EXPO_PROJECT_SLUG;

  if (owner && slug) {
    return `${owner}/${slug}`;
  }
  return undefined;
}

function buildExpoProxyRedirectUri(projectFullName: string) {
  return `${EXPO_AUTH_PROXY_URL}/${projectFullName}`;
}

function buildExpoProxyStartUrl(authUrl: string, returnUrl: string, projectFullName: string) {
  const query = new URLSearchParams({ authUrl, returnUrl });
  return `${buildExpoProxyRedirectUri(projectFullName)}/start?${query.toString()}`;
}

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
type RedirectSetup = {
  redirectUri: string;
  promptOptions: PromptOptions;
  expoProxy?: {
    projectFullName: string;
    startProjectFullName: string;
    returnUri: string;
  };
};
type RedirectOptions = { provider?: 'google' | 'microsoft'; clientId?: string };

function resolveRedirect(opts: RedirectOptions = {}): RedirectSetup {
  const isWeb = Platform.OS === 'web';
  const isExpoGo = isRunningInExpoGo();

  if (isWeb) {
    // Google/Azure requieren origin EXACTO
    const base =
      (typeof window !== 'undefined' && window.location.origin) || 'http://localhost:8081';
    const redirectUri = base.endsWith('/') ? base : `${base}/`;
    console.log('[Auth] Redirect URI (web origin):', redirectUri);
    return { redirectUri, promptOptions: {} as PromptOptions };
  }

  if (isExpoGo) {
    const projectFullName = getExpoProjectFullName();
    const returnUri = AuthSession.makeRedirectUri({
      path: CALLBACK_PATH,
      scheme: opts.provider === 'microsoft' ? 'exp' : undefined,
    });
    if (projectFullName) {
      const redirectUri = buildExpoProxyRedirectUri(projectFullName);
      console.log('[Auth] Redirect URI (expo proxy):', redirectUri);
      return {
        redirectUri,
        promptOptions: {} as PromptOptions,
        expoProxy: { projectFullName, startProjectFullName: projectFullName, returnUri },
      };
    }

    console.warn(
      '[Auth] Expo proxy unavailable (missing project name). Falling back to local redirect URI.'
    );
    return { redirectUri: returnUri, promptOptions: {} as PromptOptions };
  }

  let nativeRedirect: string | undefined;
  if (opts.provider === 'google' && opts.clientId) {
    const idWithoutSuffix = opts.clientId.replace('.apps.googleusercontent.com', '');
    nativeRedirect = `com.googleusercontent.apps.${idWithoutSuffix}:/oauthredirect`;
  }

  const redirectUri = AuthSession.makeRedirectUri(
    nativeRedirect
      ? {
          native: nativeRedirect,
        }
      : {
          scheme: 'playverse',
          path: CALLBACK_PATH,
        }
  );
  console.log('[Auth] Redirect URI (native scheme):', redirectUri);
  return { redirectUri, promptOptions: {} as PromptOptions };
}

async function promptWithExpoProxy(
  request: AuthSession.AuthRequest,
  authUrl: string,
  promptOptions: PromptOptions,
  expoProxy: { projectFullName: string; startProjectFullName: string; returnUri: string }
): Promise<AuthSession.AuthSessionResult> {
  const startUrl = buildExpoProxyStartUrl(
    authUrl,
    expoProxy.returnUri,
    expoProxy.startProjectFullName
  );
  console.log('[Auth] Expo proxy startUrl:', startUrl);
  const result = await WebBrowser.openAuthSessionAsync(startUrl, expoProxy.returnUri, promptOptions);
  if (result.type !== 'success') {
    return { type: result.type as 'cancel' | 'dismiss' | 'locked' | 'opened' };
  }
  return request.parseReturnUrl(result.url);
}

export async function signInWithGoogleNative(): Promise<OAuthResult> {
  const extras = (Constants.expoConfig?.extra || {}) as any;
  const authExtra = extras?.auth?.google ?? {};
  const forceProxy = true;
  const isExpoGo = isRunningInExpoGo();

  // Forzamos proxy de Expo para evitar depender del esquema nativo en navegadores que no disparan el intent
  const expoClientId =
    authExtra.expoClientId ??
    extras.googleExpoClientId ??
    process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;

  const clientId = forceProxy
    ? expoClientId
    : isExpoGo
    ? expoClientId ?? extras.googleClientId ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID
    : extras.googleClientId ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) return { ok: false, error: 'Missing GOOGLE_CLIENT_ID' };

  const projectFullName = getExpoProjectFullName();
  const returnUri = AuthSession.makeRedirectUri({
    path: CALLBACK_PATH,
    scheme: 'playverse',
  });

  const redirectSetup = forceProxy && projectFullName
    ? {
        redirectUri: buildExpoProxyRedirectUri(projectFullName),
        promptOptions: {} as AuthSession.AuthRequestPromptOptions,
        expoProxy: {
          projectFullName,
          startProjectFullName: projectFullName,
          returnUri,
        },
      }
    : resolveRedirect({ provider: 'google', clientId });

  const { redirectUri, promptOptions, expoProxy } = redirectSetup;

  const usingExpoProxy = !!expoProxy;

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: usingExpoProxy ? ResponseType.IdToken : ResponseType.Code,
    usePKCE: usingExpoProxy ? false : true,
    scopes: ['openid', 'email', 'profile'],
    extraParams: { nonce: randomNonce() },
  });

  const authUrl = await request.makeAuthUrlAsync({
    authorizationEndpoint: GOOGLE_AUTH_ENDPOINT,
  });
  console.log('[Auth] Google authUrl:', authUrl);

  const result = expoProxy
    ? await promptWithExpoProxy(request, authUrl, promptOptions, expoProxy)
    : await request.promptAsync(
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
  let idToken: string | undefined;

  if (usingExpoProxy) {
    idToken = (p.id_token as string) ?? (result as any).id_token;
    if (!idToken) return { ok: false, error: 'Missing id_token' };
  } else {
    const code = (p.code as string) ?? (result as any).code;
    if (!code) return { ok: false, error: 'Missing authorization code' };

    try {
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier ?? '',
          },
        },
        {
          tokenEndpoint: 'https://oauth2.googleapis.com/token',
        }
      );
      idToken = (tokenResponse as any).id_token || tokenResponse.idToken;
    } catch (tokenError: any) {
      return { ok: false, error: tokenError?.message || 'Token exchange failed' };
    }
  }

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
  const { redirectUri, promptOptions, expoProxy } = resolveRedirect({ provider: 'microsoft' });
  const isExpoGo = isRunningInExpoGo();

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
  const tokenEndpoint = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const usingExpoProxy = !!expoProxy;

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: usingExpoProxy ? ResponseType.IdToken : ResponseType.Code,
    usePKCE: usingExpoProxy ? false : true,
    scopes: ['openid', 'profile', 'email'],
    extraParams: {
      response_mode: usingExpoProxy ? 'fragment' : 'query',
      nonce: randomNonce(),
    },
  });

  const authUrl = await request.makeAuthUrlAsync({ authorizationEndpoint: authEndpoint });
  console.log('[Auth] Microsoft authUrl:', authUrl);

  const result = expoProxy
    ? await promptWithExpoProxy(request, authUrl, promptOptions, expoProxy)
    : await request.promptAsync(
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

  let idToken: string | undefined;
  if (usingExpoProxy) {
    idToken = p.id_token as string | undefined;
  } else {
    const code = (p.code as string) ?? (result as any).code;
    if (!code) return { ok: false, error: 'Missing authorization code' };

    try {
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier ?? '',
          },
        },
        {
          tokenEndpoint,
        }
      );
      idToken = (tokenResponse as any).id_token || tokenResponse.idToken;
    } catch (tokenError: any) {
      return { ok: false, error: tokenError?.message || 'Token exchange failed' };
    }
  }

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

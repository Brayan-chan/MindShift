import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ApiResponse<T> = {
  data: T;
  error: null | {
    code: string;
    message: string;
  };
};

export type AuthProfile = {
  id: string;
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
};

export type AuthResponse = {
  user: {
    id: string;
    email?: string;
  };
  session?: {
    access_token?: string;
    refresh_token?: string;
  } | null;
  profile?: AuthProfile;
};

const getDefaultApiUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoClient?.hostUri;
  const host = hostUri?.split(':')[0];

  return host ? `https://mindshift-backend-orcin.vercel.app/api/v1` : 'https://mindshift-backend-orcin.vercel.app/api/v1';
};

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? getDefaultApiUrl();
export const AUTH_TOKEN_STORAGE_KEY = '@mindshift_auth_token';
export const REFRESH_TOKEN_STORAGE_KEY = '@mindshift_refresh_token';

export async function setAuthTokens(accessToken: string, refreshToken?: string) {
  const entries: [string, string][] = [[AUTH_TOKEN_STORAGE_KEY, accessToken]];

  if (refreshToken) {
    entries.push([REFRESH_TOKEN_STORAGE_KEY, refreshToken]);
  }

  await AsyncStorage.multiSet(entries);
}

export async function setAuthToken(token: string) {
  await setAuthTokens(token);
}

export async function clearAuthToken() {
  await AsyncStorage.multiRemove([AUTH_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY]);
}

export async function getAuthToken() {
  return AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export async function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

async function refreshAuthSession() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const payload = (await response.json()) as ApiResponse<AuthResponse>;

  if (!response.ok || payload.error || !payload.data.session?.access_token) {
    await clearAuthToken();
    return false;
  }

  await setAuthTokens(
    payload.data.session.access_token,
    payload.data.session.refresh_token ?? refreshToken
  );
  return true;
}

async function requestWithAuth<T>(path: string, options?: RequestInit): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let response = await requestWithAuth<T>(path, options);
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.error) {
    const shouldRefresh =
      response.status === 401 &&
      path !== '/auth/login' &&
      path !== '/auth/register' &&
      path !== '/auth/refresh';

    if (shouldRefresh && await refreshAuthSession()) {
      response = await requestWithAuth<T>(path, options);
      const retryPayload = (await response.json()) as ApiResponse<T>;

      if (!response.ok || retryPayload.error) {
        throw new Error(retryPayload.error?.message ?? `API request failed with ${response.status}`);
      }

      return retryPayload.data;
    }

    throw new Error(payload.error?.message ?? `API request failed with ${response.status}`);
  }

  return payload.data;
}

export async function loginWithPassword(identifier: string, password: string) {
  const data = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });

  if (data.session?.access_token) {
    await setAuthTokens(data.session.access_token, data.session.refresh_token);
  }

  return data;
}

export async function registerWithPassword(input: {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}) {
  await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return loginWithPassword(input.email, input.password);
}

export async function logout() {
  await clearAuthToken();
}

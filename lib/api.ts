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

export async function setAuthToken(token: string) {
  await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export async function clearAuthToken() {
  await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export async function getAuthToken() {
  return AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.error) {
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
    await setAuthToken(data.session.access_token);
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

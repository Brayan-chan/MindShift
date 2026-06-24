import Constants from 'expo-constants';

type ApiResponse<T> = {
  data: T;
  error: null | {
    code: string;
    message: string;
  };
};

const getDefaultApiUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoClient?.hostUri;
  const host = hostUri?.split(':')[0];

  return host ? `http://${host}:3000/api/v1` : 'http://localhost:3000/api/v1';
};

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? getDefaultApiUrl();

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? `API request failed with ${response.status}`);
  }

  return payload.data;
}

import axios, { type AxiosError } from 'axios';
import { toast } from 'sonner';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';
const ACCESS_KEY = 'ipek-admin-access';
const REFRESH_KEY = 'ipek-admin-refresh';

export type AuthTokens = {
  access: { token: string };
  refresh: { token: string };
};

export type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  token?: AuthTokens;
  message?: string | { en?: string; ar?: string };
  message_ar?: string;
};

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}
export function setTokens(tokens: AuthTokens) {
  localStorage.setItem(ACCESS_KEY, tokens.access.token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh.token);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<boolean> | null = null;

async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (refreshing) return refreshing;
  refreshing = axios
    .post<ApiEnvelope<AuthTokens>>(`${API_URL}/auth/refresh-token`, { refreshToken })
    .then((res) => {
      const tokens = res.data.token || res.data.data;
      if (!tokens?.access?.token) {
        clearTokens();
        return false;
      }
      setTokens(tokens);
      return true;
    })
    .catch(() => {
      clearTokens();
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !(original as { _retry?: boolean })._retry) {
      (original as { _retry?: boolean })._retry = true;
      const ok = await refreshTokens();
      if (ok) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${getAccessToken()}`;
        return api(original);
      }
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export function apiMessage(error: unknown, locale: string) {
  const err = error as AxiosError<ApiEnvelope<unknown>>;
  const message = err.response?.data?.message;
  if (typeof message === 'string') return message;
  if (locale === 'ar') return message?.ar || err.response?.data?.message_ar || err.message;
  return message?.en || err.message || 'Request failed';
}

export function unwrap<T>(payload: ApiEnvelope<T>): T {
  return payload.data as T;
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>) {
  const clean = Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== '' && value !== null),
  );
  const res = await api.get<ApiEnvelope<T>>(url, { params: clean });
  return unwrap(res.data);
}

export function fileUrl(key?: string | null) {
  if (!key) return '';
  if (/^https?:\/\//i.test(key)) return key;
  const origin = API_URL.replace(/\/v1\/?$/, '');
  return `${origin}/${String(key).replace(/^\/+/, '')}`;
}

export async function apiSend<T>(
  url: string,
  method: 'post' | 'put' | 'patch' | 'delete',
  body?: unknown,
) {
  const res = await api.request<ApiEnvelope<T>>({ url, method, data: body });
  return unwrap(res.data);
}

export async function uploadImage(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<ApiEnvelope<{ image_key: string; image_url: string }>>(
    '/uploads',
    form,
  );
  return unwrap(res.data);
}

export function toastError(error: unknown, locale: string) {
  toast.error(apiMessage(error, locale));
}

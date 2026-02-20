const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let jwtToken: string | null = null;

export function setToken(token: string | null) {
  jwtToken = token;
  if (token) {
    localStorage.setItem('metaphor_jwt', token);
  } else {
    localStorage.removeItem('metaphor_jwt');
  }
}

export function getToken(): string | null {
  if (jwtToken) return jwtToken;
  if (typeof window !== 'undefined') {
    jwtToken = localStorage.getItem('metaphor_jwt');
  }
  return jwtToken;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(typeof body === 'object' && body && 'error' in body ? (body as { error: string }).error : `API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = { error: res.statusText };
    }
    throw new ApiError(res.status, body);
  }

  return res.json() as Promise<T>;
}

// Convenience methods
export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

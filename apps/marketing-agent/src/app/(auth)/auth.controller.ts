import { loginRequest, type LoginCredentials } from './auth.service';

const TOKEN_KEY = 'marketing_token';
const USER_KEY = 'marketing_user';

function storeSession(token: string, user: { email: string; role: string }): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secure}`;
}

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export async function login(credentials: LoginCredentials): Promise<{ email: string; role: string }> {
  const { token, user } = await loginRequest(credentials);
  storeSession(token, user);
  return user;
}

export function logout(): void {
  clearSession();
}

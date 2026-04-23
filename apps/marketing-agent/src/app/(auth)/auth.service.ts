import api from '@/lib/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    email: string;
    role: string;
  };
}

export async function loginRequest(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/marketing-login', credentials);
  return data;
}
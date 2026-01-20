/**
 * Helper functions para autenticação usando Axios
 * Estas funções encapsulam as chamadas geradas pelo Orval para facilitar o uso
 */

import { AXIOS_INSTANCE } from './api-client';

interface TokenResponse {
  access: string;
  refresh: string;
}

interface UserProfile {
  name: string;
  email: string;
  date_birth?: string;
  phone_number?: string;
  balance: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
}

/**
 * Cria um novo usuário (registro)
 */
export const registerUser = async (name: string, email: string): Promise<void> => {
  await AXIOS_INSTANCE.post('/api/users/user/', { name, email });
};

/**
 * Solicita código de login via email
 */
export const requestLoginCode = async (email: string): Promise<void> => {
  await AXIOS_INSTANCE.post('/api/users/login/request-code/', { email });
};

/**
 * Faz login usando código recebido por email
 */
export const loginWithCode = async (email: string, code: string): Promise<TokenResponse> => {
  const response = await AXIOS_INSTANCE.post<TokenResponse>('/api/users/login/verify-code/', {
    email,
    code,
  });
  return response.data;
};

/**
 * Login com email e senha (apenas para superusers/admins)
 */
export const loginWithPassword = async (email: string, password: string): Promise<TokenResponse> => {
  const response = await AXIOS_INSTANCE.post<TokenResponse>('/api/users/token/', {
    email,
    password,
  });
  return response.data;
};

/**
 * Revoga o refresh token (logout)
 */
export const logout = async (refreshToken: string): Promise<void> => {
  await AXIOS_INSTANCE.post('/api/users/token/revoke/', {
    refresh: refreshToken,
  });
};

/**
 * Obtém o perfil do usuário autenticado
 */
export const getUserProfile = async (): Promise<UserProfile> => {
  const response = await AXIOS_INSTANCE.get<UserProfile>('/api/users/user/');
  return response.data;
};

/**
 * Confirma email do usuário
 */
export const confirmEmail = async (token: string): Promise<void> => {
  await AXIOS_INSTANCE.post('/api/users/user/confirm-email/', { token });
};

/**
 * Reenvia email de confirmação
 */
export const resendConfirmationEmail = async (email: string): Promise<void> => {
  await AXIOS_INSTANCE.post('/api/users/user/resend-email-confirmation/', { email });
};

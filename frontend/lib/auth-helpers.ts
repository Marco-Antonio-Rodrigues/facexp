/**
 * Helper functions para autenticação usando Axios
 * Estas funções encapsulam as chamadas geradas pelo Orval para facilitar o uso
 */

import { AXIOS_INSTANCE } from './api-client';
import { AxiosError } from 'axios';

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
 * Extrai mensagem de erro da resposta da API
 */
const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data;
    
    // Se o erro é um objeto com campos
    if (typeof data === 'object' && data !== null) {
      // Tenta pegar a mensagem do campo 'message' ou 'detail'
      if ('message' in data && typeof data.message === 'string') {
        return data.message;
      }
      if ('detail' in data && typeof data.detail === 'string') {
        return data.detail;
      }
      
      // Se for um objeto com erros de validação de campos
      const firstKey = Object.keys(data)[0];
      if (firstKey && Array.isArray(data[firstKey])) {
        return `${firstKey}: ${data[firstKey][0]}`;
      }
      if (firstKey && typeof data[firstKey] === 'string') {
        return `${firstKey}: ${data[firstKey]}`;
      }
    }
    
    // Se for uma string diretamente
    if (typeof data === 'string') {
      return data;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Erro desconhecido';
};

/**
 * Cria um novo usuário (registro)
 */
export const registerUser = async (name: string, email: string): Promise<void> => {
  try {
    await AXIOS_INSTANCE.post('/api/users/user/', { name, email });
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Solicita código de login via email
 */
export const requestLoginCode = async (email: string): Promise<void> => {
  try {
    await AXIOS_INSTANCE.post('/api/users/login/request-code/', { email });
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Faz login usando código recebido por email
 */
export const loginWithCode = async (email: string, code: string): Promise<TokenResponse> => {
  try {
    const response = await AXIOS_INSTANCE.post<TokenResponse>('/api/users/login/verify-code/', {
      email,
      code,
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Login com email e senha (apenas para superusers/admins)
 */
export const loginWithPassword = async (email: string, password: string): Promise<TokenResponse> => {
  try {
    const response = await AXIOS_INSTANCE.post<TokenResponse>('/api/users/token/', {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Revoga o refresh token (logout)
 */
export const logout = async (refreshToken: string): Promise<void> => {
  try {
    await AXIOS_INSTANCE.post('/api/users/token/revoke/', {
      refresh: refreshToken,
    });
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Obtém o perfil do usuário autenticado
 */
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const response = await AXIOS_INSTANCE.get<UserProfile>('/api/users/user/');
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Confirma email do usuário
 */
export const confirmEmail = async (token: string): Promise<void> => {
  try {
    await AXIOS_INSTANCE.post('/api/users/user/confirm-email/', { token });
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Reenvia email de confirmação
 */
export const resendConfirmationEmail = async (email: string): Promise<void> => {
  try {
    await AXIOS_INSTANCE.post('/api/users/user/resend-email-confirmation/', { email });
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

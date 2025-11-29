/**
 * API Client para comunicação com o backend Django
 */

import { ApiError } from './errorHandler';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    skipRefresh = false
  ): Promise<T> {
    const { token, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    const data = await response.json();

    // Se token inválido e não estamos já fazendo refresh, tenta refresh
    if (!response.ok && response.status === 401 && !skipRefresh && token) {
      if (data.code === 'token_not_valid' || data.detail?.includes('token')) {
        try {
          const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
          if (refreshToken) {
            const { access } = await this.refreshToken(refreshToken);
            if (typeof window !== 'undefined') {
              localStorage.setItem('access_token', access);
            }
            // Tenta novamente com novo token
            return this.request<T>(endpoint, { ...options, token: access }, true);
          }
        } catch {
          // Refresh falhou, limpa tokens
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
          }
          throw new ApiError('Sessão expirada. Faça login novamente.', 401, 'session_expired');
        }
      }
    }

    if (!response.ok) {
      throw new ApiError(
        data.message || data.detail || 'Erro na requisição',
        response.status,
        data.code
      );
    }

    return data;
  }

  // Autenticação
  async register(name: string, email: string) {
    return this.request('/api/users/user/', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    });
  }

  async requestLoginCode(email: string) {
    return this.request('/api/users/login/request-code/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async loginWithCode(email: string, code: string): Promise<{ access: string; refresh: string }> {
    return this.request('/api/users/login/verify-code/', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async loginWithPassword(email: string, password: string): Promise<{ access: string; refresh: string }> {
    return this.request('/api/users/token/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(refreshToken: string, accessToken: string) {
    return this.request('/api/users/token/revoke/', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ refresh: refreshToken }),
    });
  }

  async refreshToken(refreshToken: string): Promise<{ access: string }> {
    return this.request('/api/users/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    });
  }

  async getUserProfile(token: string) {
    return this.request('/api/users/user/', {
      method: 'GET',
      token,
    });
  }

  async confirmEmail(token: string) {
    return this.request('/api/users/user/confirm-email/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resendConfirmationEmail(email: string) {
    return this.request('/api/users/user/resend-email-confirmation/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Serviços
  async getServices(token: string) {
    return this.request('/api/services/', {
      method: 'GET',
      token,
    });
  }

  async consumeService(serviceSlug: string, token: string) {
    return this.request(`/api/services/${serviceSlug}/consume/`, {
      method: 'POST',
      token,
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

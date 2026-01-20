import Axios, { AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const AXIOS_INSTANCE = Axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para adicionar token em todas as requisições
AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  // Header padrão para evitar warning do ngrok
  config.headers['ngrok-skip-browser-warning'] = 'true';
  
  // Lista de endpoints públicos que não precisam de autenticação
  const publicEndpoints = [
    '/api/users/login/request-code/',
    '/api/users/login/verify-code/',
    '/api/users/user/', // POST para registro
    '/api/users/user/confirm-email/',
    '/api/users/user/resend-email-confirmation/',
    '/api/users/token/', // Login com senha
    '/api/users/token/refresh/',
  ];
  
  const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint));
  
  if (!token && !isPublicEndpoint && typeof window !== 'undefined') {
    window.location.href = '/login';
    return Promise.reject(new Error('No authentication token'));
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag para evitar múltiplas tentativas de refresh simultâneas
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Interceptor para tratar erros de autenticação e fazer refresh automático
AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Se for erro 401 e não for uma tentativa de login/refresh
    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refresh_token');
      
      // Se não tiver refresh token, redireciona para login
      if (!refreshToken) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      // Se já estiver fazendo refresh, adiciona à fila
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return AXIOS_INSTANCE(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Tenta fazer refresh do token
        const response = await Axios.post(`${API_BASE_URL}/api/users/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);
        
        // Atualiza o token na requisição original
        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        // Processa fila de requisições pendentes
        processQueue(null, access);
        
        // Retenta a requisição original
        return AXIOS_INSTANCE(originalRequest);
      } catch (refreshError) {
        // Refresh falhou, limpa tokens e redireciona
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// Custom instance para o Orval usar
export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-ignore
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

export default customInstance;

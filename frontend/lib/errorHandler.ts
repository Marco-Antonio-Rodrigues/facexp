/**
 * Handler global de erros de API
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 401 || error.code === 'token_not_valid';
  }
  
  if (error instanceof Error) {
    return error.message.includes('token') || 
           error.message.includes('Sessão expirada') ||
           error.message.includes('autenticado');
  }
  
  return false;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Erro desconhecido';
}

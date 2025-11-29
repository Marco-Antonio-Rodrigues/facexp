'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthError, getErrorMessage } from '@/lib/errorHandler';

interface ErrorHandlerProps {
  error: unknown;
  onClear?: () => void;
}

export function ErrorHandler({ error, onClear }: ErrorHandlerProps) {
  const router = useRouter();

  useEffect(() => {
    if (error && isAuthError(error)) {
      // Limpa tokens e redireciona para login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  }, [error, router]);

  if (!error) return null;

  const message = getErrorMessage(error);
  const isAuth = isAuthError(error);

  return (
    <div className={`p-4 rounded-lg mb-4 ${
      isAuth ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'
    }`}>
      <div className="flex items-start">
        <div className="shrink-0">
          {isAuth ? (
            <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${isAuth ? 'text-yellow-800' : 'text-red-800'}`}>
            {message}
          </p>
          {isAuth && (
            <p className="mt-1 text-sm text-yellow-700">
              Você será redirecionado para o login...
            </p>
          )}
        </div>
        {onClear && !isAuth && (
          <button
            onClick={onClear}
            className="ml-3 shrink-0 text-red-600 hover:text-red-800"
          >
            <span className="sr-only">Fechar</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

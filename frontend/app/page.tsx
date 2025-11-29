'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Consulta de Placas
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Sistema completo para consulta de informações de veículos
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
          >
            Criar conta
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl mb-2">🚗</div>
            <h3 className="font-semibold text-gray-900 mb-2">Consultas Rápidas</h3>
            <p className="text-gray-600 text-sm">
              Acesse informações de veículos de forma rápida e segura
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl mb-2">💳</div>
            <h3 className="font-semibold text-gray-900 mb-2">Sistema de Créditos</h3>
            <p className="text-gray-600 text-sm">
              Gerencie seus créditos e consultas facilmente
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-semibold text-gray-900 mb-2">Seguro e Confiável</h3>
            <p className="text-gray-600 text-sm">
              Login com código por e-mail para máxima segurança
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


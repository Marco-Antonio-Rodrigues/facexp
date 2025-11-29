'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PlateSearchForm } from '@/components/PlateSearchForm';
import { AddCreditsModal } from '@/components/AddCreditsModal';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, refreshUser } = useAuth();
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Atualiza o saldo quando houver uma consulta
  useEffect(() => {
    const handleBalanceUpdate = () => {
      refreshUser();
    };

    window.addEventListener('balanceUpdated', handleBalanceUpdate);
    return () => window.removeEventListener('balanceUpdated', handleBalanceUpdate);
  }, [refreshUser]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Consulta de Placas</h1>
            <Button onClick={handleLogout} variant="outline" size="sm">
              Sair
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card de boas-vindas */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Bem-vindo, {user.name}! 👋</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Aqui você pode consultar informações de veículos através da placa.
              </p>
            </CardContent>
          </Card>

          {/* Card de saldo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saldo disponível</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                R$ {user.balance}
              </p>
              <Button 
                onClick={() => setIsCreditsModalOpen(true)}
                className="mt-4 w-full" 
                size="sm"
              >
                Adicionar créditos
              </Button>
            </CardContent>
          </Card>

          {/* Card de perfil */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">Informações da conta</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">E-mail</dt>
                  <dd className="text-base text-gray-900">{user.email}</dd>
                </div>
                {user.phone_number && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                    <dd className="text-base text-gray-900">{user.phone_number}</dd>
                  </div>
                )}
                {user.date_birth && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Data de nascimento</dt>
                    <dd className="text-base text-gray-900">
                      {new Date(user.date_birth).toLocaleDateString('pt-BR')}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Card de consulta de placa */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Consultar placa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Digite a placa do veículo para consultar as informações.
              </p>
              <PlateSearchForm />
            </CardContent>
          </Card>
        </div>
      </main>

      <AddCreditsModal
        isOpen={isCreditsModalOpen}
        onClose={() => setIsCreditsModalOpen(false)}
        currentBalance={user.balance}
      />
    </div>
  );
}

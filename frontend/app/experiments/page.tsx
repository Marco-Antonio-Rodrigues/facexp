'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ExperimentList, StatusEnum, DesignTypeEnum } from '@/types';
import { AXIOS_INSTANCE } from '@/lib/api-client';

// Mapas para labels legíveis
const STATUS_LABELS: Record<StatusEnum, string> = {
  [StatusEnum.draft]: 'Rascunho',
  [StatusEnum.design_ready]: 'Design Pronto',
  [StatusEnum.data_collection]: 'Coleta de Dados',
  [StatusEnum.analysis_ready]: 'Pronto para Análise',
  [StatusEnum.completed]: 'Concluído',
  [StatusEnum.archived]: 'Arquivado',
};

const STATUS_COLORS: Record<StatusEnum, string> = {
  [StatusEnum.draft]: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  [StatusEnum.design_ready]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  [StatusEnum.data_collection]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  [StatusEnum.analysis_ready]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  [StatusEnum.completed]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  [StatusEnum.archived]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const DESIGN_TYPE_LABELS: Record<DesignTypeEnum, string> = {
  [DesignTypeEnum.full_factorial]: 'Fatorial Completo',
  [DesignTypeEnum.fractional_factorial]: 'Fatorial Fracionado',
  [DesignTypeEnum.plackett_burman]: 'Plackett-Burman',
  [DesignTypeEnum.box_behnken]: 'Box-Behnken',
  [DesignTypeEnum.central_composite]: 'Composto Central',
};

export default function ExperimentsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const [experiments, setExperiments] = useState<ExperimentList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchExperiments();
    }
  }, [isAuthenticated]);

  const fetchExperiments = async () => {
    try {
      setIsLoading(true);
      const response = await AXIOS_INSTANCE.get('/api/experiments/');
      setExperiments(response.data.results || response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar experimentos');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400 font-mono text-sm">Carregando experimentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🧪</div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Facexp</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">Design of Experiments</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{user?.email}</p>
              </div>
              <Button
                onClick={async () => {
                  await logout();
                  router.push('/login');
                }}
                className="bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Meus Experimentos
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Gerencie seus experimentos fatoriais e análises estatísticas
              </p>
            </div>
            <Button
              onClick={() => router.push('/experiments/new')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
            >
              <span className="text-xl mr-2">+</span>
              Novo Experimento
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {/* Experiments Grid */}
        {experiments.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700">
            <CardContent className="py-16 text-center">
              <div className="text-6xl mb-4">🧬</div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Nenhum experimento ainda
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Comece criando seu primeiro experimento fatorial
              </p>
              <Button
                onClick={() => router.push('/experiments/new')}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Criar Primeiro Experimento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiments.map((experiment) => (
              <Card
                key={experiment.id}
                className="hover:shadow-xl transition-all duration-300 cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                onClick={() => router.push(`/experiments/${experiment.slug}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-mono font-semibold ${experiment.status ? STATUS_COLORS[experiment.status] : ''}`}>
                      {experiment.status ? STATUS_LABELS[experiment.status] : 'N/A'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {formatDate(experiment.updated_at)}
                    </span>
                  </div>
                  <CardTitle className="text-xl text-slate-900 dark:text-slate-100 line-clamp-2">
                    {experiment.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Tipo:</span>
                      <span className="font-mono text-science-700 dark:text-science-300 font-semibold">
                        {experiment.design_type ? DESIGN_TYPE_LABELS[experiment.design_type] : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span>📅</span>
                      <span className="font-mono text-xs">
                        Criado em {formatDate(experiment.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/experiments/${experiment.slug}`);
                      }}
                    >
                      Ver Detalhes →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

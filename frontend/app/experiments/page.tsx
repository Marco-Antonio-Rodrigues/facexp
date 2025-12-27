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
  [StatusEnum.draft]: 'bg-muted text-muted-foreground border border-border',
  [StatusEnum.design_ready]: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
  [StatusEnum.data_collection]: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
  [StatusEnum.analysis_ready]: 'bg-purple-500/20 text-purple-400 border border-purple-500/40',
  [StatusEnum.completed]: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
  [StatusEnum.archived]: 'bg-muted/50 text-muted-foreground/70 border border-border',
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
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground font-mono text-sm">Carregando experimentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🧪</div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Facexp</h1>
                <p className="text-sm text-muted-foreground font-mono">Design of Experiments</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button
                onClick={async () => {
                  await logout();
                  router.push('/login');
                }}
                className="bg-muted text-foreground hover:bg-muted/80"
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
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Meus Experimentos
              </h2>
              <p className="text-muted-foreground">
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
          <Card className="border-dashed border-2 border-border">
            <CardContent className="py-16 text-center">
              <div className="text-6xl mb-4">🧬</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhum experimento ainda
              </h3>
              <p className="text-muted-foreground mb-6">
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
              <div 
                key={experiment.id} 
                className="cursor-pointer"
                onClick={() => router.push(`/experiments/${experiment.slug}`)}
              >
                <Card className="hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-mono font-semibold ${experiment.status ? STATUS_COLORS[experiment.status] : ''}`}>
                      {experiment.status ? STATUS_LABELS[experiment.status] : 'N/A'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatDate(experiment.updated_at)}
                    </span>
                  </div>
                  <CardTitle className="text-xl line-clamp-2">
                    {experiment.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-mono text-science-700 font-semibold">
                        {experiment.design_type ? DESIGN_TYPE_LABELS[experiment.design_type] : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>📅</span>
                      <span className="font-mono text-xs">
                        Criado em {formatDate(experiment.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Button
                      className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200"
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
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

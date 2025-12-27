'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ExperimentDetail, StatusEnum, DesignTypeEnum, FactorDetail, DataTypeEnum, ResponseVariableDetail, OptimizationGoalEnum } from '@/types';
import FactorModal from '@/components/FactorModal';
import ResponseVariableModal from '@/components/ResponseVariableModal';

// Tipos auxiliares para levels_config
type QuantitativeLevelsConfig = { low: number; center: number; high: number };
type CategoricalLevelsConfig = string[];

const STATUS_LABELS: Record<StatusEnum, string> = {
  [StatusEnum.draft]: 'Rascunho',
  [StatusEnum.design_ready]: 'Design Pronto',
  [StatusEnum.data_collection]: 'Coleta de Dados',
  [StatusEnum.analysis_ready]: 'Pronto para Análise',
  [StatusEnum.completed]: 'Concluído',
  [StatusEnum.archived]: 'Arquivado',
};

const DESIGN_TYPE_LABELS: Record<DesignTypeEnum, string> = {
  [DesignTypeEnum.full_factorial]: 'Fatorial Completo',
  [DesignTypeEnum.fractional_factorial]: 'Fatorial Fracionado',
  [DesignTypeEnum.plackett_burman]: 'Plackett-Burman',
  [DesignTypeEnum.box_behnken]: 'Box-Behnken',
  [DesignTypeEnum.central_composite]: 'Composto Central',
};

const STATUS_COLORS: Record<StatusEnum, string> = {
  [StatusEnum.draft]: 'bg-muted text-muted-foreground border border-border',
  [StatusEnum.design_ready]: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
  [StatusEnum.data_collection]: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
  [StatusEnum.analysis_ready]: 'bg-purple-500/20 text-purple-400 border border-purple-500/40',
  [StatusEnum.completed]: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
  [StatusEnum.archived]: 'bg-muted/50 text-muted-foreground/70 border border-border',
};

export default function ExperimentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [slug, setSlug] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [factors, setFactors] = useState<FactorDetail[]>([]);
  const [showFactorModal, setShowFactorModal] = useState(false);
  const [editingFactor, setEditingFactor] = useState<FactorDetail | null>(null);
  const [deletingFactorId, setDeletingFactorId] = useState<number | null>(null);
  const [responseVariables, setResponseVariables] = useState<ResponseVariableDetail[]>([]);
  const [showResponseVarModal, setShowResponseVarModal] = useState(false);
  const [editingResponseVar, setEditingResponseVar] = useState<ResponseVariableDetail | null>(null);
  const [deletingResponseVarId, setDeletingResponseVarId] = useState<number | null>(null);
  const [isGeneratingRuns, setIsGeneratingRuns] = useState(false);
  const [hasRuns, setHasRuns] = useState(false);

  useEffect(() => {
    params.then(p => {
      setSlug(p.slug);
      fetchExperiment(p.slug);
      fetchFactors(p.slug);
      fetchResponseVariables(p.slug);
      checkHasRuns(p.slug);
    });
  }, []);

  const checkHasRuns = async (experimentSlug: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/runs/?page_size=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const hasAnyRuns = Array.isArray(data) 
          ? data.length > 0 
          : (data.count !== undefined ? data.count > 0 : (Array.isArray(data.results) ? data.results.length > 0 : false));
        
        setHasRuns(hasAnyRuns);
      }
    } catch (err) {
      console.error('Erro ao verificar corridas:', err);
    }
  };

  const fetchExperiment = async (experimentSlug: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar experimento');
      }

      const data = await response.json();
      setExperiment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar experimento');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFactors = async (experimentSlug: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/factors/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFactors(data.results || data);
      }
    } catch (err) {
      console.error('Erro ao carregar fatores:', err);
    }
  };

  const handleDeleteFactor = async (factorId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${slug}/factors/${factorId}/`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao excluir fator');
      }

      fetchFactors(slug);
      setDeletingFactorId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir fator');
    }
  };

  const fetchResponseVariables = async (experimentSlug: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/response-variables/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResponseVariables(data.results || data);
      }
    } catch (err) {
      console.error('Erro ao carregar variáveis de resposta:', err);
    }
  };

  const handleDeleteResponseVariable = async (responseVarId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${slug}/response-variables/${responseVarId}/`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao excluir variável de resposta');
      }

      fetchResponseVariables(slug);
      setDeletingResponseVarId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir variável de resposta');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${slug}/`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao excluir experimento');
      }

      router.push('/experiments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir experimento');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleGenerateRuns = async () => {
    if (factors.length === 0) {
      alert('Adicione pelo menos um fator antes de gerar corridas!');
      return;
    }

    const totalCombinations = factors.reduce((acc, f) => {
      const numLevels = Array.isArray(f.levels_config) ? f.levels_config.length : 0;
      return acc * numLevels;
    }, 1);

    if (!confirm(`Gerar corridas experimentais para este experimento?\n\nSerá criada uma matriz com ${totalCombinations} combinações (fatorial completo).`)) {
      return;
    }

    setIsGeneratingRuns(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${slug}/generate_runs/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erro ao gerar corridas');
      }

      const data = await response.json();
      alert(data.detail);
      
      // Atualiza o estado hasRuns para true
      setHasRuns(true);
      
      // Redireciona para a página de runs
      router.push(`/experiments/${slug}/runs`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao gerar corridas');
    } finally {
      setIsGeneratingRuns(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Carregando experimento...</p>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md border-destructive/30">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium mb-4">{error || 'Experimento não encontrado'}</p>
            <Button onClick={() => router.push('/experiments')}>
              Voltar para Experimentos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push('/experiments')}
                className="bg-muted text-foreground hover:bg-muted/80"
              >
                ← Voltar
              </Button>
              <div className="flex items-center gap-2">
                <div className="text-2xl">🧪</div>
                <h1 className="text-xl font-bold text-foreground">{experiment.title}</h1>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full border font-mono text-xs font-semibold ${STATUS_COLORS[experiment.status ?? StatusEnum.draft]}`}>
              {STATUS_LABELS[experiment.status ?? StatusEnum.draft]}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info Principal */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Informações do Experimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Descrição</h3>
                  <p className="text-foreground">
                    {experiment.description || 'Sem descrição'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Tipo de Design</h3>
                    <p className="text-foreground font-mono">{DESIGN_TYPE_LABELS[experiment.design_type ?? DesignTypeEnum.full_factorial]}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Status</h3>
                    <p className="text-foreground font-mono">{STATUS_LABELS[experiment.status ?? StatusEnum.draft]}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Repetições</h3>
                    <p className="text-foreground font-mono">
                      {experiment.replicates || 1} {experiment.replicates === 1 ? 'réplica' : 'réplicas'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cada combinação será executada {experiment.replicates || 1} {experiment.replicates === 1 ? 'vez' : 'vezes'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Criado em</h3>
                    <p className="text-muted-foreground">
                      {new Date(experiment.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Atualizado em</h3>
                    <p className="text-muted-foreground">
                      {new Date(experiment.updated_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fatores */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Fatores</CardTitle>
                  <Button 
                    onClick={() => {
                      setEditingFactor(null);
                      setShowFactorModal(true);
                    }}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    + Adicionar Fator
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {factors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum fator cadastrado ainda
                  </div>
                ) : (
                  <div className="space-y-3">
                    {factors.map((factor) => (
                      <div
                        key={factor.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-foreground">{factor.name}</h4>
                            <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-mono rounded">
                              {factor.symbol}
                            </span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${
                              factor.data_type === DataTypeEnum.quantitative
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                            }`}>
                              {factor.data_type === DataTypeEnum.quantitative ? 'Quantitativo' : 'Categórico'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {factor.data_type === DataTypeEnum.quantitative ? (
                              Array.isArray(factor.levels_config) ? (
                                (factor.levels_config as number[]).map((level, idx) => (
                                  <Badge key={idx} variant="quantitative" className="font-mono">
                                    {level}
                                  </Badge>
                                ))
                              ) : (
                                <>
                                  <Badge variant="quantitative" className="font-mono">
                                    {(factor.levels_config as QuantitativeLevelsConfig)?.low} <span className="text-xs ml-1">(baixo)</span>
                                  </Badge>
                                  <Badge variant="quantitative" className="font-mono">
                                    {(factor.levels_config as QuantitativeLevelsConfig)?.center} <span className="text-xs ml-1">(centro)</span>
                                  </Badge>
                                  <Badge variant="quantitative" className="font-mono">
                                    {(factor.levels_config as QuantitativeLevelsConfig)?.high} <span className="text-xs ml-1">(alto)</span>
                                  </Badge>
                                </>
                              )
                            ) : (
                              Array.isArray(factor.levels_config) && (factor.levels_config as CategoricalLevelsConfig).map((level, idx) => (
                                <Badge key={idx} variant="categorical">
                                  {level}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => {
                              setEditingFactor(factor);
                              setShowFactorModal(true);
                            }}
                            className="bg-muted text-foreground hover:bg-muted/80 px-3 py-1 text-sm"
                          >
                            ✏️
                          </Button>
                          <Button
                            onClick={() => setDeletingFactorId(factor.id)}
                            className="bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 py-1 text-sm"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Variáveis de Resposta */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Variáveis de Resposta</CardTitle>
                  <Button 
                    onClick={() => {
                      setEditingResponseVar(null);
                      setShowResponseVarModal(true);
                    }}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    + Adicionar Variável
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {responseVariables.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma variável de resposta cadastrada ainda
                  </div>
                ) : (
                  <div className="space-y-3">
                    {responseVariables.map((responseVar) => (
                      <div
                        key={responseVar.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-foreground">{responseVar.name}</h4>
                            {responseVar.unit && (
                              <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-mono rounded">
                                {responseVar.unit}
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${
                              responseVar.optimization_goal === OptimizationGoalEnum.maximize
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : responseVar.optimization_goal === OptimizationGoalEnum.minimize
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                : responseVar.optimization_goal === OptimizationGoalEnum.target
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-muted text-muted-foreground border border-border'
                            }`}>
                              {responseVar.optimization_goal === OptimizationGoalEnum.maximize && '📈 Maximizar'}
                              {responseVar.optimization_goal === OptimizationGoalEnum.minimize && '📉 Minimizar'}
                              {responseVar.optimization_goal === OptimizationGoalEnum.target && '🎯 Alvo'}
                              {responseVar.optimization_goal === OptimizationGoalEnum.none && '📊 Monitorar'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => {
                              setEditingResponseVar(responseVar);
                              setShowResponseVarModal(true);
                            }}
                            className="bg-muted text-foreground hover:bg-muted/80 px-3 py-1 text-sm"
                          >
                            ✏️
                          </Button>
                          <Button
                            onClick={() => setDeletingResponseVarId(responseVar.id)}
                            className="bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 py-1 text-sm"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ações Rápidas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => router.push(`/experiments/${slug}/edit`)}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  ✏️ Editar
                </Button>
                {!hasRuns ? (
                  <Button 
                    onClick={handleGenerateRuns}
                    disabled={isGeneratingRuns || factors.length === 0}
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingRuns ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        Gerando...
                      </>
                    ) : (
                      <>▶️ Gerar Corridas</>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => router.push(`/experiments/${slug}/runs`)}
                    className="w-full bg-muted text-foreground hover:bg-muted/80"
                  >
                    📊 Ver Corridas
                  </Button>
                )}
                <Button 
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20"
                >
                  🗑️ Excluir
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💡</div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Próximos Passos</h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>1. Adicione fatores (variáveis independentes)</li>
                      <li>2. Adicione variáveis de resposta</li>
                      <li>3. Gere as corridas experimentais</li>
                      <li>4. Colete os dados</li>
                      <li>5. Realize análises estatísticas</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border-destructive/30">
            <CardHeader>
              <CardTitle className="text-xl text-destructive flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Confirmar Exclusão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                Tem certeza que deseja excluir o experimento <strong>{experiment?.title}</strong>?
              </p>
              <p className="text-sm text-slate-600">
                Esta ação não pode ser desfeita. Todos os fatores, variáveis de resposta e 
                corridas experimentais associadas serão permanentemente removidos.
              </p>
              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Excluindo...
                    </>
                  ) : (
                    'Sim, Excluir'
                  )}
                </Button>
                <Button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Factor Modal */}
      <FactorModal
        experimentSlug={slug}
        isOpen={showFactorModal}
        onClose={() => {
          setShowFactorModal(false);
          setEditingFactor(null);
        }}
        onSuccess={() => fetchFactors(slug)}
        editData={editingFactor ? {
          id: editingFactor.id,
          name: editingFactor.name,
          symbol: editingFactor.symbol,
          data_type: editingFactor.data_type ?? DataTypeEnum.quantitative,
          precision: editingFactor.precision ?? 2,
          levels_config: editingFactor.levels_config as string[] | number[]
        } : undefined}
      />

      {/* Delete Factor Confirmation Modal */}
      {deletingFactorId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border-destructive/30">
            <CardHeader>
              <CardTitle className="text-xl text-destructive flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Confirmar Exclusão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                Tem certeza que deseja excluir este fator?
              </p>
              <p className="text-sm text-slate-600">
                Esta ação não pode ser desfeita e pode afetar as corridas experimentais já geradas.
              </p>
              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={() => handleDeleteFactor(deletingFactorId)}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, Excluir
                </Button>
                <Button
                  onClick={() => setDeletingFactorId(null)}
                  className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Response Variable Modal */}
      <ResponseVariableModal
        experimentSlug={slug}
        isOpen={showResponseVarModal}
        onClose={() => {
          setShowResponseVarModal(false);
          setEditingResponseVar(null);
        }}
        onSuccess={() => fetchResponseVariables(slug)}
        editData={editingResponseVar ? {
          id: editingResponseVar.id,
          name: editingResponseVar.name,
          unit: editingResponseVar.unit ?? '',
          optimization_goal: editingResponseVar.optimization_goal ?? OptimizationGoalEnum.maximize
        } : undefined}
      />

      {/* Delete Response Variable Confirmation Modal */}
      {deletingResponseVarId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border-destructive/30">
            <CardHeader>
              <CardTitle className="text-xl text-destructive flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Confirmar Exclusão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                Tem certeza que deseja excluir esta variável de resposta?
              </p>
              <p className="text-sm text-slate-600">
                Esta ação não pode ser desfeita e todos os dados coletados para esta variável serão perdidos.
              </p>
              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={() => handleDeleteResponseVariable(deletingResponseVarId)}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, Excluir
                </Button>
                <Button
                  onClick={() => setDeletingResponseVarId(null)}
                  className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

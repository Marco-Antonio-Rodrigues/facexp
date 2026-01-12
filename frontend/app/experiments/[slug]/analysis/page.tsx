'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import ParetoChart from '@/components/charts/ParetoChart';
import MainEffectsChart from '@/components/charts/MainEffectsChart';
import NormalProbabilityPlot from '@/components/charts/NormalProbabilityPlot';
import ResidualsVsFittedChart from '@/components/charts/ResidualsVsFittedChart';
import { InteractionPlot } from '@/components/charts/InteractionPlot';
import { RegressionCalculator } from '@/components/RegressionCalculator';
import { DesignMatrixTable } from '@/components/DesignMatrixTable';
import { DesignMatrixData } from '@/types/designMatrix';

interface AnalysisMetadata {
  experiment_id: number;
  experiment_slug: string;
  experiment_title: string;
  design_type: string;
  response_variable: string;
  num_factors: number;
  num_runs: number;
  factors: Array<{
    id: number;
    name: string;
    symbol: string;
    data_type: string;
  }>;
}

interface AnalysisSummary {
  mean: number;
  std: number;
  min: number;
  max: number;
  range: number;
  cv: number | null;
}

interface AnovaRow {
  source: string;
  df: number | null;
  sum_sq: number | null;
  mean_sq: number | null;
  f_value: number | null;
  p_value: number | null;
  is_significant: boolean;
}

interface AnovaResults {
  table: AnovaRow[];
  model_f_statistic: number;
  model_p_value: number;
  r_squared: number;
  r_squared_adj: number;
}

interface RegressionCoefficient {
  term: string;
  coefficient: number;
  std_error: number;
  t_value: number;
  p_value: number;
  is_significant: boolean;
}

interface RegressionResults {
  coefficients: RegressionCoefficient[];
  equation: string;
  equation_coded: string;
}

interface InteractionData {
  combinations: any[];
  default_x: string | null;
  default_lines: string | null;
}

interface AnalysisData {
  metadata: AnalysisMetadata;
  summary: AnalysisSummary;
  anova: AnovaResults;
  regression: RegressionResults;
  effects: any;
  residuals: any;
  plots_data: any;
  interaction_data?: InteractionData;
  design_matrix: DesignMatrixData;
}

interface ResponseVariable {
  id: number;
  name: string;
  description?: string;
  unit?: string;
}

// Função auxiliar para formatar números de forma inteligente
const formatNumber = (value: number | null, decimals: number = 4): string => {
  if (value === null || value === undefined) return '-';
  if (Math.abs(value) < 0.0001) return '0';
  
  // Remove zeros desnecessários à direita
  return Number.isInteger(value) 
    ? value.toString() 
    : value.toFixed(decimals).replace(/\.?0+$/, '');
};


export default function AnalysisPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [responseVariables, setResponseVariables] = useState<ResponseVariable[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<string>('');

  useEffect(() => {
    params.then(p => {
      setSlug(p.slug);
      fetchResponseVariables(p.slug);
    });
  }, []);

  useEffect(() => {
    if (slug && selectedResponse) {
      fetchAnalysis(slug, selectedResponse);
    }
  }, [slug, selectedResponse]);

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

      if (!response.ok) {
        throw new Error('Erro ao carregar variáveis de resposta');
      }

      const data = await response.json();
      setResponseVariables(data);
      
      // Seleciona a primeira variável por padrão
      if (data.length > 0) {
        setSelectedResponse(data[0].name);
      } else {
        setError('Nenhuma variável de resposta encontrada');
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar variáveis');
      setIsLoading(false);
    }
  };

  const fetchAnalysis = async (experimentSlug: string, responseName: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/analysis/?response=${encodeURIComponent(responseName)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar análise');
      }

      const data = await response.json();
      setAnalysisData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar análise');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando análise estatística...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <Card className="max-w-md border-destructive/30">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium mb-4">{error}</p>
            <Button onClick={() => router.push(`/experiments/${slug}`)}>
              Voltar ao Experimento
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
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/experiments/${slug}`)}
                  className="bg-muted text-foreground hover:bg-muted/80"
                >
                  ← Voltar ao Experimento
                </Button>
                <Button
                  onClick={() => router.push(`/experiments/${slug}/runs`)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  📋 Gerenciar Corridas
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-2xl">📊</div>
                <h1 className="text-xl font-bold text-foreground">
                  Análise Estatística
                </h1>
              </div>
            </div>
            {/* Seletor de Variável de Resposta */}
            {responseVariables.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Variável de Resposta:
                </label>
                <select
                  value={selectedResponse}
                  onChange={(e) => setSelectedResponse(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-card text-foreground"
                >
                  {responseVariables.map((rv) => (
                    <option key={rv.id} value={rv.name}>
                      {rv.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {analysisData && (
          <div className="space-y-6">
            {/* Informações do Experimento */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">📋 Resumo do Experimento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fatores */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Fatores do Experimento:</h3>
                    <div className="space-y-2">
                      {analysisData.metadata.factors.map((factor) => (
                        <div 
                          key={factor.id}
                          className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border"
                        >
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-full">
                            <span className="text-lg font-bold text-blue-400">{factor.symbol}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{factor.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {factor.data_type === 'categorical' ? 'Categórico' : 'Quantitativo'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Informações Gerais */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Informações Gerais:</h3>
                    <div className="space-y-2">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Variável de Resposta</p>
                        <p className="text-lg font-semibold text-foreground">{selectedResponse}</p>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Tipo de Design</p>
                        <p className="text-lg font-semibold text-foreground">{analysisData.metadata.design_type}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Nº Fatores</p>
                          <p className="text-xl font-bold text-emerald-600">{analysisData.metadata.num_factors}</p>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Nº Corridas</p>
                          <p className="text-xl font-bold text-blue-600">{analysisData.metadata.num_runs}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estatísticas Descritivas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Estatísticas Descritivas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Média</p>
                    <p className="text-2xl font-bold text-foreground">
                      {analysisData.summary.mean.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Desvio Padrão</p>
                    <p className="text-2xl font-bold text-foreground">
                      {analysisData.summary.std.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">CV (%)</p>
                    <p className="text-2xl font-bold text-foreground">
                      {analysisData.summary.cv?.toFixed(2) ?? 'N/A'}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Mínimo</p>
                    <p className="text-2xl font-bold text-foreground">
                      {analysisData.summary.min.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Máximo</p>
                    <p className="text-2xl font-bold text-foreground">
                      {analysisData.summary.max.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Amplitude</p>
                    <p className="text-2xl font-bold text-foreground">
                      {analysisData.summary.range.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Sinais (Design Matrix) */}
            <DesignMatrixTable
              designMatrix={analysisData.design_matrix}
              showTotals={true}
              showMeans={true}
              showEffects={true}
            />

            {/* Tabela ANOVA */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Análise de Variância (ANOVA)</CardTitle>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border border-border px-4 py-2 text-left font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">Fonte</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Origem da variação: fatores do experimento, interações ou resíduo (erro experimental)</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="border border-border px-4 py-2 text-right font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">GL</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Graus de Liberdade: número de valores independentes que podem variar na análise</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="border border-border px-4 py-2 text-right font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">SQ</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Soma dos Quadrados: medida da variabilidade total atribuída a cada fonte</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="border border-border px-4 py-2 text-right font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">MQ</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Quadrado Médio: SQ dividido pelos GL, representa a variância média da fonte</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="border border-border px-4 py-2 text-right font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">F</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Estatística F: razão entre o MQ do fator e o MQ do resíduo, indica a significância do efeito</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="border border-border px-4 py-2 text-right font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">p-valor</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Probabilidade de observar um resultado tão extremo por acaso. Valores &lt; 0.05 indicam efeito significativo</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="border border-border px-4 py-2 text-center font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">Significativo</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Indica se o efeito é estatisticamente significativo (✓) com nível de confiança de 95% (α = 0.05)</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                        </tr>
                      </thead>
                    <tbody>
                      {analysisData.anova.table.map((row, idx) => (
                        <tr
                          key={idx}
                          className={row.is_significant ? 'bg-emerald-50 text-gray-600' : ''}
                        >
                          <td className="border border-border px-4 py-2 font-mono">
                            {row.source}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            {row.df !== null ? row.df : '-'}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            {formatNumber(row.sum_sq, 4)}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            {formatNumber(row.mean_sq, 4)}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            {formatNumber(row.f_value, 4)}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            {formatNumber(row.p_value, 4)}
                          </td>
                          <td className="border border-border px-4 py-2 text-center">
                            {row.is_significant ? (
                              <span className="text-emerald-600 font-bold">✓</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  * Valores significativos (p &lt; 0.05) destacados em verde. Passe o mouse sobre os cabeçalhos para ver explicações.
                </p>
                </TooltipProvider>
              </CardContent>
            </Card>

            {/* Equação de Regressão - Nova versão interativa */}
            <RegressionCalculator 
              regression={analysisData.regression}
              factors={analysisData.metadata.factors}
              responseVariableName={selectedResponse}
              experimentData={
                analysisData.interaction_data ? {
                  factors: analysisData.interaction_data.combinations.reduce((acc: Record<string, (number | string)[]>, combo: any) => {
                    if (combo.factor_x && combo.factor_x.levels) {
                      acc[combo.factor_x.symbol] = combo.factor_x.levels;
                    }
                    if (combo.factor_lines && combo.factor_lines.levels) {
                      acc[combo.factor_lines.symbol] = combo.factor_lines.levels;
                    }
                    return acc;
                  }, {})
                } : undefined
              }
            />

            {/* Tabela de Coeficientes de Regressão */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Coeficientes de Regressão (Detalhado)</CardTitle>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border border-border px-4 py-2 text-left font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">Termo</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Intercepto, fatores individuais ou interações entre fatores do modelo de regressão</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="border border-border px-4 py-2 text-right font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">Coeficiente</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Valor estimado do coeficiente: representa o impacto do termo na variável resposta</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="border border-border px-4 py-2 text-right font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">Erro Padrão</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Medida da incerteza na estimativa do coeficiente: quanto menor, mais precisa a estimativa</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="border border-border px-4 py-2 text-right font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">t-valor</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Estatística t: razão entre o coeficiente e seu erro padrão, indica a significância do termo</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="border border-border px-4 py-2 text-right font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">p-valor</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Probabilidade de o coeficiente ser zero. Valores &lt; 0.05 indicam que o termo é significativo</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="border border-border px-4 py-2 text-center font-semibold">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">Significativo</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Indica se o termo é estatisticamente significativo (✓) com nível de confiança de 95% (α = 0.05)</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                        </tr>
                      </thead>
                    <tbody>
                      {analysisData.regression.coefficients.map((coef, idx) => (
                        <tr
                          key={idx}
                          className={coef.is_significant ? 'bg-emerald-50  text-gray-600' : ''}
                        >
                          <td className="border border-border px-4 py-2 font-mono">
                            {coef.term}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            {formatNumber(coef.coefficient, 4)}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            {formatNumber(coef.std_error, 4)}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            {formatNumber(coef.t_value, 4)}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            {formatNumber(coef.p_value, 4)}
                          </td>
                          <td className="border border-border px-4 py-2 text-center">
                            {coef.is_significant ? (
                              <span className="text-emerald-600 font-bold">✓</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  * Valores significativos (p &lt; 0.05) destacados em verde. Passe o mouse sobre os cabeçalhos para ver explicações.
                </p>
                </TooltipProvider>
              </CardContent>
            </Card>

            {/* Qualidade do Modelo e Predição */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Qualidade do Modelo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">R² (R-squared)</p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {(analysisData.anova.r_squared * 100).toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Variação explicada pelo modelo
                    </p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">R² Ajustado</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {(analysisData.anova.r_squared_adj * 100).toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ajustado pelo número de fatores
                    </p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">F-statistic</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {analysisData.anova.model_f_statistic.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      p-value: {analysisData.anova.model_p_value.toExponential(3)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calculadora de Predição */}
            <RegressionCalculator
              regression={analysisData.regression}
              factors={analysisData.metadata.factors}
              responseVariableName={selectedResponse}
            />

            {/* Gráficos Estatísticos */}
            {analysisData.plots_data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Gráficos Estatísticos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Gráfico de Pareto */}
                    {analysisData.plots_data.pareto && (
                      <div className="border border-border rounded-lg p-4 bg-card">
                        <ParetoChart data={analysisData.plots_data.pareto} />
                      </div>
                    )}

                    {/* Gráfico de Efeitos Principais */}
                    {analysisData.plots_data.main_effects && (
                      <div className="border border-border rounded-lg p-4 bg-card">
                        <MainEffectsChart data={analysisData.plots_data.main_effects} />
                      </div>
                    )}

                    {/* Normal Probability Plot */}
                    {analysisData.plots_data.normal_plot && (
                      <div className="border border-border rounded-lg p-4 bg-card">
                        <NormalProbabilityPlot data={analysisData.plots_data.normal_plot} />
                      </div>
                    )}

                    {/* Resíduos vs Fitted */}
                    {analysisData.plots_data.residuals_vs_fitted && (
                      <div className="border border-border rounded-lg p-4 bg-card">
                        <ResidualsVsFittedChart data={analysisData.plots_data.residuals_vs_fitted} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gráfico de Interação */}
            {analysisData.interaction_data && analysisData.interaction_data.combinations.length > 0 && (
              <InteractionPlot 
                data={analysisData.interaction_data}
                responseVariableName={selectedResponse}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

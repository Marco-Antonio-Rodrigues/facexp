'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import ExperimentRunsUpload from '@/components/ExperimentRunsUpload';
import * as XLSX from 'xlsx';

interface Factor {
  id: number;
  name: string;
  symbol: string;
  data_type: 'quantitative' | 'categorical';
  levels_config?: unknown;
}

interface ResponseVariable {
  id: number;
  name: string;
  unit?: string;
}

interface ExperimentRun {
  id: number;
  standard_order: number;
  run_order: number;
  replicate_number: number;
  is_center_point: boolean;
  factor_values: Record<string, any>;
  response_values: Record<string, any>;
  is_excluded: boolean;
  has_responses: boolean;
  is_complete: boolean;
}

interface CombinationGroup {
  standard_order: number;
  factor_values: Record<string, any>;
  runs: ExperimentRun[];
  completedCount: number;
  totalCount: number;
}

export default function RunsPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState<string>('');
  const [runs, setRuns] = useState<ExperimentRun[]>([]);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [responseVars, setResponseVars] = useState<ResponseVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingRuns, setIsGeneratingRuns] = useState(false);
  const [editingRunId, setEditingRunId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [expandedCombination, setExpandedCombination] = useState<number | null>(null);

  useEffect(() => {
    params.then((p) => {
      setSlug(p.slug);
      fetchData(p.slug);
    });
  }, [params]);

  const fetchData = async (experimentSlug: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      
      const [runsRes, factorsRes, varsRes] = await Promise.all([
        fetch(`${baseUrl}/api/experiments/${experimentSlug}/runs/`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${baseUrl}/api/experiments/${experimentSlug}/factors/`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${baseUrl}/api/experiments/${experimentSlug}/response-variables/`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const runsData = await runsRes.json();
      const factorsData = await factorsRes.json();
      const varsData = await varsRes.json();
      
      setRuns(runsData);
      setFactors(factorsData);
      setResponseVars(varsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refetchRuns = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${slug}/runs/`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setRuns(await response.json());
    } catch (error) {
      console.error('Error refetching runs:', error);
    }
  };

  const handleEditRun = (run: ExperimentRun) => {
    setEditingRunId(run.id);
    const values: Record<string, string> = {};
    responseVars.forEach((rv) => {
      values[rv.id.toString()] = run.response_values[rv.id.toString()] || '';
    });
    setEditValues(values);
  };

  const handleSaveRun = async (runId: number) => {
    try {
      const response_values: Record<string, number | null> = {};
      Object.entries(editValues).forEach(([key, value]) => {
        response_values[key] = value ? parseFloat(value) : null;
      });

      const token = localStorage.getItem('access_token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${slug}/runs/${runId}/update_responses/`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ response_values })
        }
      );

      await refetchRuns();
      setEditingRunId(null);
      setEditValues({});
    } catch (error) {
      console.error('Error saving run:', error);
      alert('Erro ao salvar valores');
    }
  };

  const handleDeleteRun = async (runId: number) => {
    if (!confirm('Tem certeza que deseja deletar esta corrida permanentemente?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${slug}/runs/${runId}/`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao deletar corrida');
      }

      await refetchRuns();
    } catch (error) {
      console.error('Error deleting run:', error);
      alert('Erro ao deletar corrida');
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

    if (!confirm(`Gerar corridas experimentais?\n\nSerá criada uma matriz com ${totalCombinations} combinações.`)) {
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

      await refetchRuns();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao gerar corridas');
    } finally {
      setIsGeneratingRuns(false);
    }
  };

  const handleDeleteAllRuns = async () => {
    if (!confirm(`Tem certeza que deseja deletar TODAS as ${runs?.length || 0} corridas?\n\nEsta ação não pode ser desfeita!`)) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${slug}/delete_all_runs/`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erro ao deletar corridas');
      }

      const data = await response.json();
      alert(`Sucesso! ${data.deleted_count || data.detail} corridas deletadas.`);
      await refetchRuns();
    } catch (error) {
      console.error('Error deleting runs:', error);
      alert(error instanceof Error ? error.message : 'Erro ao deletar corridas');
    }
  };

  // Agrupa runs por combinação de fatores (mesmos valores de fatores)
  const groupedCombinations: CombinationGroup[] = [];
  const combinationMap = new Map<string, CombinationGroup>();

  console.log('Total runs:', runs?.length || 0);
  (runs || []).forEach((run) => {
    // Cria uma chave única baseada nos valores dos fatores
    const factorKey = factors
      .map(f => `${f.id}:${run.factor_values?.[f.id] ?? run.factor_values?.[f.id.toString()]}`)
      .sort()
      .join('|');
    
    console.log('Run:', run.id, 'Standard Order:', run.standard_order, 'Replicate:', run.replicate_number, 'Key:', factorKey);
    
    if (!combinationMap.has(factorKey)) {
      combinationMap.set(factorKey, {
        standard_order: run.standard_order, // Usa o primeiro standard_order encontrado
        factor_values: run.factor_values,
        runs: [],
        completedCount: 0,
        totalCount: 0,
      });
    }

    const group = combinationMap.get(factorKey)!;
    group.runs.push(run);
    group.totalCount++;
    if (run.is_complete) {
      group.completedCount++;
    }
  });

  // Ordena pela menor ordem padrão de cada grupo
  groupedCombinations.push(
    ...Array.from(combinationMap.values()).sort((a, b) => 
      Math.min(...a.runs.map(r => r.standard_order)) - Math.min(...b.runs.map(r => r.standard_order))
    )
  );
  console.log('Grouped combinations:', groupedCombinations.length);
  console.log('First group:', groupedCombinations[0]);

  const exportToExcel = () => {
    // Prepara os dados para exportação
    const exportData = (runs || []).map(run => {
      const row: any = {
        'Ordem Padrão': run.standard_order,
        'Ordem Execução': run.run_order,
        'Réplica': run.replicate_number,
      };

      // Adiciona valores dos fatores
      factors.forEach(factor => {
        const value = run.factor_values?.[factor.id] ?? run.factor_values?.[factor.id.toString()];
        row[`${factor.name} (${factor.symbol})`] = value ?? '-';
      });

      // Adiciona valores de resposta
      responseVars.forEach(rv => {
        const value = run.response_values?.[rv.id] ?? run.response_values?.[rv.id.toString()];
        row[rv.name + (rv.unit ? ` (${rv.unit})` : '')] = value ?? '';
      });

      // Adiciona status
      row['Status'] = run.is_complete ? 'Completo' : 'Pendente';
      row['Ponto Central'] = run.is_center_point ? 'Sim' : 'Não';

      return row;
    });

    // Cria a planilha
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Corridas');

    // Gera o arquivo
    XLSX.writeFile(wb, `corridas_experimento_${slug}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600">Carregando corridas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              onClick={() => router.push(`/experiments/${slug}`)}
              className="mb-4 bg-slate-700 text-white hover:bg-slate-800"
            >
              ← Voltar ao Experimento
            </Button>
            <h1 className="text-3xl font-bold text-slate-900">Corridas Experimentais</h1>
            <p className="text-slate-600 mt-2">
              {runs?.length || 0} corridas • {runs?.filter(r => r.is_complete).length || 0} completas
            </p>
          </div>
          {(runs?.length || 0) > 0 && (
            <Button
              onClick={handleDeleteAllRuns}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              🗑️ Deletar Todas as Corridas
            </Button>
          )}
        </div>

        {/* Upload Component */}
        <div className="mb-6">
          <ExperimentRunsUpload
            experimentSlug={slug}
            runs={runs}
            factors={factors}
            responseVars={responseVars}
            onUploadComplete={() => fetchData(slug)}
          />
        </div>

        {/* Runs Table */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">Matriz Experimental</CardTitle>
            <p className="text-sm text-slate-600 mt-2">
              As corridas estão agrupadas por combinação de fatores. Clique em uma linha para ver todas as réplicas daquela combinação.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                      Ordem Padrão
                    </th>
                    <th className="border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                      Ordem Execução
                    </th>
                    {factors.map((factor) => (
                      <th key={factor.id} className="border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                        {factor.symbol}
                        <div className="text-xs font-normal text-slate-500">{factor.name}</div>
                      </th>
                    ))}
                    {responseVars.map((rv) => (
                      <th key={rv.id} className="border border-slate-300 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50">
                        {rv.name}
                        {rv.unit && <div className="text-xs font-normal text-emerald-600">({rv.unit})</div>}
                      </th>
                    ))}
                    <th className="border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                      Progresso
                    </th>
                    <th className="border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedCombinations.map((combination) => (
                    <React.Fragment key={`combo-${combination.standard_order}`}>
                      {/* Combination Row */}
                      <tr
                        className="hover:bg-blue-50 bg-blue-100/70 font-semibold cursor-pointer border-l-4 border-blue-500"
                        onClick={() => setExpandedCombination(
                          expandedCombination === combination.standard_order ? null : combination.standard_order
                        )}
                      >
                        <td className="border border-slate-300 px-3 py-2 text-center text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-blue-700">{expandedCombination === combination.standard_order ? '▼' : '▶'}</span>
                            <span>{Math.min(...combination.runs.map(r => r.standard_order))}</span>
                          </div>
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-center text-xs text-slate-600">
                          {combination.runs.map(r => r.run_order).sort((a, b) => a - b).join(', ')}
                        </td>
                        {factors.map((factor) => (
                          <td key={factor.id} className="border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-900">
                            {combination.factor_values?.[factor.id] ?? combination.factor_values?.[factor.id.toString()] ?? '-'}
                          </td>
                        ))}
                        {responseVars.map((rv) => (
                          <td key={rv.id} className="border border-slate-300 px-3 py-2 text-center text-xs text-slate-400 bg-blue-50/50">
                            -
                          </td>
                        ))}
                        <td className="border border-slate-300 px-3 py-2 text-center text-sm">
                          <span className="px-3 py-1.5 bg-blue-600 text-white rounded-md font-semibold text-xs shadow-sm">
                            {combination.completedCount}/{combination.totalCount} réplicas
                          </span>
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-center text-xs">
                          {combination.completedCount === combination.totalCount ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-semibold">
                              ✓ Completo
                            </span>
                          ) : combination.completedCount > 0 ? (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded font-semibold">
                              ⚠ Parcial
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded">
                              ○ Pendente
                            </span>
                          )}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-center">
                          <span className="text-xs text-blue-600 font-medium">
                            {expandedCombination === combination.standard_order ? 'Clique para ocultar' : `${combination.totalCount} réplica(s)`}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Expanded Replicate Rows */}
                      {expandedCombination === combination.standard_order && combination.runs
                        .sort((a, b) => a.replicate_number - b.replicate_number)
                        .map((run) => (
                        <tr
                          key={run.id}
                          className={`hover:bg-slate-50 bg-white border-l-4 border-blue-200 ${run.is_excluded ? 'opacity-50 bg-red-50' : ''} ${
                            run.is_center_point ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="border border-slate-300 px-3 py-2 text-center text-xs text-slate-500 pl-8 bg-slate-50/50">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-blue-400">↳</span>
                              <span>Réplica {run.replicate_number}</span>
                            </div>
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-blue-700">
                            {run.run_order}
                          </td>
                          {factors.map((factor) => (
                            <td key={factor.id} className="border border-slate-300 px-3 py-2 text-center text-xs text-slate-400 bg-slate-50/30">
                              {run.factor_values?.[factor.id] ?? run.factor_values?.[factor.id.toString()] ?? '-'}
                            </td>
                          ))}
                          {responseVars.map((rv) => (
                            <td key={rv.id} className="border border-slate-300 px-3 py-2 text-center text-sm bg-emerald-50/50">
                              {editingRunId === run.id ? (
                                <input
                                  type="number"
                                  step="any"
                                  value={editValues[rv.id.toString()] || ''}
                                  onChange={(e) =>
                                    setEditValues({ ...editValues, [rv.id.toString()]: e.target.value })
                                  }
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-center"
                                  placeholder="-"
                                />
                              ) : (
                                <span className={(run.response_values?.[rv.id] ?? run.response_values?.[rv.id.toString()]) ? 'font-semibold text-emerald-700' : 'text-slate-400'}>
                                  {run.response_values?.[rv.id] ?? run.response_values?.[rv.id.toString()] ?? '-'}
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="border border-slate-300 px-3 py-2 text-center text-xs">
                            {run.is_excluded ? (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-semibold">
                                Excluído
                              </span>
                            ) : run.is_complete ? (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-semibold">
                                Completo
                              </span>
                            ) : run.has_responses ? (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded font-semibold">
                                Parcial
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded">
                                Pendente
                              </span>
                            )}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {editingRunId === run.id ? (
                                <>
                                  <Button
                                    onClick={() => handleSaveRun(run.id)}
                                    className="px-2 py-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                                  >
                                    ✓
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setEditingRunId(null);
                                      setEditValues({});
                                    }}
                                    className="px-2 py-1 text-xs bg-slate-600 text-white hover:bg-slate-700"
                                  >
                                    ✕
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    onClick={() => handleEditRun(run)}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700"
                                  >
                                    ✏️
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteRun(run.id)}
                                    className="px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700"
                                    title="Deletar corrida"
                                  >
                                    🗑️
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {runs.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-lg font-semibold text-slate-900 mb-2">Nenhuma corrida gerada ainda</p>
                <p className="text-sm text-slate-600 mb-6">Gere as corridas experimentais para começar a coletar dados</p>
                <Button
                  onClick={handleGenerateRuns}
                  disabled={isGeneratingRuns || factors.length === 0}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingRuns ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Gerando...
                    </>
                  ) : (
                    <>▶️ Gerar Corridas Experimentais</>
                  )}
                </Button>
                {factors.length === 0 && (
                  <p className="text-xs text-red-600 mt-3">
                    Adicione pelo menos um fator no experimento primeiro
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Section */}
        {runs.length > 0 && (
          <div className="mt-6 space-y-3">
            <Button
              onClick={exportToExcel}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700 py-4 text-base font-semibold"
            >
              📄 Exportar Todas as Corridas para Excel
            </Button>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => router.push(`/experiments/${slug}`)}
                className="w-full bg-slate-600 text-white hover:bg-slate-700 py-3 text-base font-semibold"
              >
                ← Voltar ao Experimento
              </Button>
              
              <Button
                onClick={() => router.push(`/experiments/${slug}/analysis`)}
                className="w-full bg-purple-600 text-white hover:bg-purple-700 py-3 text-base font-semibold"
              >
                📊 Analisar Experimento
              </Button>
            </div>
          </div>
        )}

        {/* Legend */}
        {runs.length > 0 && (
          <Card className="border-slate-200 shadow-lg mt-6">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Legenda e Instruções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2 text-sm">Como Funciona o Agrupamento:</h4>
                <p className="text-sm text-slate-600 mb-2">
                  As linhas <span className="bg-blue-100 px-1 py-0.5 rounded font-semibold">azuis</span> representam combinações únicas de fatores.
                  Clique em uma combinação para expandir e ver todas as réplicas (repetições) daquela condição experimental.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-50 border border-slate-300"></div>
                  <span className="text-slate-700">Ponto Central</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">
                    ✓ Completo
                  </div>
                  <span className="text-slate-700">Todos os valores preenchidos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold">
                    ⚠ Parcial
                  </div>
                  <span className="text-slate-700">Alguns valores preenchidos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                    Excluído
                  </div>
                  <span className="text-slate-700">Não será usado nas análises</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

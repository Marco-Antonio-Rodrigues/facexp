'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Factor {
  id: number;
  name: string;
  symbol: string;
  data_type: 'quantitative' | 'categorical';
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
      
      setRuns(await runsRes.json());
      setFactors(await factorsRes.json());
      setResponseVars(await varsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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

      await fetchData(slug);
      setEditingRunId(null);
      setEditValues({});
    } catch (error) {
      console.error('Error saving run:', error);
      alert('Erro ao salvar valores');
    }
  };

  const handleToggleExclude = async (runId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${slug}/runs/${runId}/toggle_exclude/`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      await fetchData(slug);
    } catch (error) {
      console.error('Error toggling exclude:', error);
    }
  };

  // Agrupa runs por combinação (standard_order)
  const groupedCombinations: CombinationGroup[] = [];
  const combinationMap = new Map<number, CombinationGroup>();

  runs.forEach((run) => {
    if (!combinationMap.has(run.standard_order)) {
      combinationMap.set(run.standard_order, {
        standard_order: run.standard_order,
        factor_values: run.factor_values,
        runs: [],
        completedCount: 0,
        totalCount: 0,
      });
    }

    const group = combinationMap.get(run.standard_order)!;
    group.runs.push(run);
    group.totalCount++;
    if (run.is_complete) {
      group.completedCount++;
    }
  });

  groupedCombinations.push(...Array.from(combinationMap.values()).sort((a, b) => a.standard_order - b.standard_order));

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
              {runs.length} corridas • {runs.filter(r => r.is_complete).length} completas
            </p>
          </div>
        </div>

        {/* Runs Table */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">Matriz Experimental</CardTitle>
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
                        className="hover:bg-slate-50 bg-slate-50/50 font-medium"
                      >
                        <td className="border border-slate-300 px-3 py-2 text-center text-sm">
                          {combination.standard_order}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-center text-sm text-slate-500">
                          -
                        </td>
                        {factors.map((factor) => (
                          <td key={factor.id} className="border border-slate-300 px-3 py-2 text-center text-sm">
                            {combination.factor_values?.[factor.id] ?? combination.factor_values?.[factor.id.toString()] ?? '-'}
                          </td>
                        ))}
                        {responseVars.map((rv) => (
                          <td key={rv.id} className="border border-slate-300 px-3 py-2 text-center text-xs text-slate-400 bg-emerald-50/30">
                            -
                          </td>
                        ))}
                        <td className="border border-slate-300 px-3 py-2 text-center text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold text-xs">
                            {combination.completedCount}/{combination.totalCount} experimentos
                          </span>
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-center text-xs">
                          {combination.completedCount === combination.totalCount ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-semibold">
                              Completo
                            </span>
                          ) : combination.completedCount > 0 ? (
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
                          <Button
                            onClick={() => setExpandedCombination(
                              expandedCombination === combination.standard_order ? null : combination.standard_order
                            )}
                            className="px-2 py-1 text-xs bg-slate-600 text-white hover:bg-slate-700"
                          >
                            {expandedCombination === combination.standard_order ? '▲ Ocultar' : '▼ Ver réplicas'}
                          </Button>
                        </td>
                      </tr>
                      
                      {/* Expanded Replicate Rows */}
                      {expandedCombination === combination.standard_order && combination.runs.map((run) => (
                        <tr
                          key={run.id}
                          className={`hover:bg-slate-50 ${run.is_excluded ? 'opacity-50 bg-red-50' : ''} ${
                            run.is_center_point ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="border border-slate-300 px-3 py-2 text-center text-xs text-slate-400 pl-8">
                            ↳ Réplica {run.replicate_number}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center text-sm font-semibold">
                            {run.run_order}
                          </td>
                          {factors.map((factor) => (
                            <td key={factor.id} className="border border-slate-300 px-3 py-2 text-center text-xs text-slate-400">
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
                                    onClick={() => handleToggleExclude(run.id)}
                                    className={`px-2 py-1 text-xs ${
                                      run.is_excluded
                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                                    }`}
                                    title={run.is_excluded ? 'Incluir' : 'Excluir'}
                                  >
                                    {run.is_excluded ? '↩️' : '🗑️'}
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
              <div className="text-center py-12 text-slate-500">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-lg font-semibold">Nenhuma corrida gerada ainda</p>
                <p className="text-sm mt-2">Volte e clique em "Gerar Corridas" para criar a matriz experimental</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        {runs.length > 0 && (
          <Card className="border-slate-200 shadow-lg mt-6">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Legenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-50 border border-slate-300"></div>
                  <span className="text-slate-700">Ponto Central</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">
                    Completo
                  </div>
                  <span className="text-slate-700">Todos os valores preenchidos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold">
                    Parcial
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

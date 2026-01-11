'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { DesignMatrixData } from '@/types/designMatrix';

interface DesignMatrixTableProps {
  designMatrix: DesignMatrixData;
  showTotals?: boolean;
  showMeans?: boolean;
  showEffects?: boolean;
}

export function DesignMatrixTable({
  designMatrix,
  showTotals = true,
  showMeans = true,
  showEffects = true,
}: DesignMatrixTableProps) {
  const [hiddenColumns, setHiddenColumns] = useState<Set<number>>(new Set());
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Só mostra para experimentos 2^k
  if (!designMatrix.is_two_level_factorial) {
    return null;
  }

  // Função para toggle de coluna
  const toggleColumn = (colIndex: number) => {
    const newHidden = new Set(hiddenColumns);
    if (newHidden.has(colIndex)) {
      newHidden.delete(colIndex);
    } else {
      newHidden.add(colIndex);
    }
    setHiddenColumns(newHidden);
  };

  // Função para ordenar
  const handleSort = (colIndex: number) => {
    if (sortColumn === colIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colIndex);
      setSortDirection('asc');
    }
  };

  // Ordenar runs
  const sortedRuns = [...designMatrix.runs].sort((a, b) => {
    if (sortColumn === null) return 0;
    
    const aVal = a.values_coded[sortColumn];
    const bVal = b.values_coded[sortColumn];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    return sortDirection === 'asc' 
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  // Função para exportar CSV
  const exportToCSV = () => {
    const rows = [];
    
    // Header
    const headerRow = designMatrix.headers
      .filter((_, idx) => !hiddenColumns.has(idx))
      .map(h => h.symbol)
      .join(',');
    rows.push(headerRow);
    
    // Data rows
    sortedRuns.forEach(run => {
      const row = run.values_coded
        .filter((_, idx) => !hiddenColumns.has(idx))
        .map(v => v !== null ? v : '')
        .join(',');
      rows.push(row);
    });
    
    // Totals
    if (showTotals) {
      const totalsRow = designMatrix.totals
        .filter((_, idx) => !hiddenColumns.has(idx))
        .map(v => v !== null ? v.toFixed(2) : '')
        .join(',');
      rows.push(totalsRow);
    }
    
    // Means
    if (showMeans) {
      const meansRow = designMatrix.means
        .filter((_, idx) => !hiddenColumns.has(idx))
        .map(v => v !== null ? v.toFixed(2) : '')
        .join(',');
      rows.push(meansRow);
    }
    
    // Effects
    if (showEffects) {
      const effectsRow = designMatrix.effects
        .filter((_, idx) => !hiddenColumns.has(idx))
        .map(v => v !== null ? v.toFixed(4) : '')
        .join(',');
      rows.push(effectsRow);
    }
    
    // Contributions
    if (showEffects && designMatrix.contributions) {
      const contributionsRow = designMatrix.contributions
        .filter((_, idx) => !hiddenColumns.has(idx))
        .map(v => v !== null ? `${v.toFixed(1)}%` : '')
        .join(',');
      rows.push(contributionsRow);
    }
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design_matrix.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Função para copiar para clipboard
  const copyToClipboard = () => {
    const text = [];
    
    // Header
    const headerRow = designMatrix.headers
      .filter((_, idx) => !hiddenColumns.has(idx))
      .map(h => h.symbol)
      .join('\t');
    text.push(headerRow);
    
    // Data rows
    sortedRuns.forEach(run => {
      const row = run.values_coded
        .filter((_, idx) => !hiddenColumns.has(idx))
        .map(v => v !== null ? v : '')
        .join('\t');
      text.push(row);
    });
    
    navigator.clipboard.writeText(text.join('\n'));
    alert('Tabela copiada para a área de transferência!');
  };

  // Tooltips para cada tipo de coluna
  const getTooltipText = (header: typeof designMatrix.headers[0]) => {
    switch (header.type) {
      case 'intercept':
        return 'Coluna de intercepto (sempre 1). Usada para calcular a média geral da resposta';
      case 'factor':
        return `Valores codificados do fator ${header.name}. (-1) = nível baixo, (+1) = nível alto, (0) = ponto central`;
      case 'interaction':
        return `Interação entre ${header.factors?.join(' e ')}. Calculada como produto dos valores dos fatores`;
      case 'response':
        return `Valor observado da variável resposta: ${header.name}`;
      default:
        return '';
    }
  };

  // Formatar valor de forma inteligente
  const formatValue = (value: number | string | null, type: string) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string') return value;
    if (Math.abs(value) < 0.0001) return '0';
    
    // Remove zeros desnecessários à direita
    if (type === 'response') {
      // Para respostas, usar até 2 decimais se necessário
      return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
    }
    
    // Para outros valores, usar até 4 decimais se necessário
    return Number.isInteger(value) ? value.toString() : value.toFixed(4).replace(/\.?0+$/, '');
  };

  // Formatar número simples (para legenda)
  const formatNumber = (value: number) => {
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(4).replace(/\.?0+$/, '');
  };

  // Formatar número para estatísticas (totais, médias, efeitos)
  const formatStatValue = (value: number | null, decimals: number = 4) => {
    if (value === null || value === undefined) return '-';
    if (Math.abs(value) < 0.0001) return '0';
    
    // Remove zeros desnecessários à direita
    return Number.isInteger(value) 
      ? value.toString() 
      : value.toFixed(decimals).replace(/\.?0+$/, '');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Tabela de Sinais (Design Matrix)</CardTitle>
        <div className="flex gap-2">
          <Button
            onClick={copyToClipboard}
            variant="outline"
            size="sm"
          >
            Copiar
          </Button>
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
          >
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legenda dos Valores Codificados */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-sm text-blue-900 mb-2">
            Legenda dos Valores Codificados
          </h4>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-blue-800">
            {designMatrix.headers
              .filter(header => header.level_mapping)
              .map((header, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-semibold">{header.symbol}:</span>
                  <span className="font-mono">
                    -1 = {formatNumber(header.level_mapping![-1])}
                  </span>
                  <span className="text-blue-400">|</span>
                  <span className="font-mono">
                    +1 = {formatNumber(header.level_mapping![1])}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <TooltipProvider>
          {/* Controles de colunas */}
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="text-sm font-semibold">Mostrar/Ocultar:</span>
            {designMatrix.headers.map((header, idx) => (
              <button
                key={idx}
                onClick={() => toggleColumn(idx)}
                className={`px-2 py-1 text-xs rounded border ${
                  hiddenColumns.has(idx)
                    ? 'bg-gray-200 text-gray-500 border-gray-300'
                    : 'bg-blue-100 text-blue-700 border-blue-300'
                }`}
              >
                {header.symbol}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border px-3 py-2 text-center font-semibold w-24">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">Run</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Ordem de execução do experimento (run order)</p>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                  {designMatrix.headers.map((header, idx) =>
                    hiddenColumns.has(idx) ? null : (
                      <th
                        key={idx}
                        className="border border-border px-3 py-2 text-center font-semibold cursor-pointer hover:bg-slate-500"
                        onClick={() => handleSort(idx)}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">
                              {header.symbol}
                              {sortColumn === idx && (
                                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{getTooltipText(header)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedRuns.map((run, runIdx) => (
                  <tr
                    key={runIdx}
                    className={run.is_center_point ? 'bg-amber-50' : ''}
                  >
                    <td className="border border-border px-3 py-2 text-center font-semibold text-sm text-gray-600">
                      {run.run_order}
                    </td>
                    {run.values_coded.map((value, colIdx) =>
                      hiddenColumns.has(colIdx) ? null : (
                        <td
                          key={colIdx}
                          className="border border-border px-3 py-2 text-center font-mono text-sm"
                        >
                          {formatValue(value, designMatrix.headers[colIdx].type)}
                        </td>
                      )
                    )}
                  </tr>
                ))}

                {/* Linha de Totais */}
                {showTotals && (
                  <tr className="bg-blue-100 font-semibold border-t-2 border-blue-300">
                    <td className="border border-border px-3 py-2 text-center text-blue-900 font-bold">
                      Totais
                    </td>
                    {designMatrix.totals.map((total, idx) =>
                      hiddenColumns.has(idx) ? null : (
                        <td
                          key={idx}
                          className="border border-border px-3 py-2 text-center text-blue-900"
                        >
                          {formatStatValue(total, 2)}
                        </td>
                      )
                    )}
                  </tr>
                )}

                {/* Linha de Médias */}
                {showMeans && (
                  <tr className="bg-green-100 font-semibold border-t-2 border-green-300">
                    <td className="border border-border px-3 py-2 text-center text-green-900 font-bold">
                      Média
                    </td>
                    {designMatrix.means.map((mean, idx) =>
                      hiddenColumns.has(idx) ? null : (
                        <td
                          key={idx}
                          className="border border-border px-3 py-2 text-center text-green-900"
                        >
                          {formatStatValue(mean, 4)}
                        </td>
                      )
                    )}
                  </tr>
                )}

                {/* Linha de Efeitos */}
                {showEffects && (
                  <tr className="bg-purple-100 font-semibold border-t-2 border-purple-300">
                    <td className="border border-border px-3 py-2 text-center text-purple-900 font-bold">
                      Efeitos
                    </td>
                    {designMatrix.effects.map((effect, idx) =>
                      hiddenColumns.has(idx) ? null : (
                        <td
                          key={idx}
                          className="border border-border px-3 py-2 text-center text-purple-900"
                        >
                          {formatStatValue(effect, 4)}
                        </td>
                      )
                    )}
                  </tr>
                )}

                {/* Linha de Contribuição % */}
                {showEffects && designMatrix.contributions && (
                  <tr className="bg-orange-100 font-semibold border-t-2 border-orange-300">
                    <td className="border border-border px-3 py-2 text-center text-orange-900 font-bold">
                      Contribuição
                    </td>
                    {designMatrix.contributions.map((contribution, idx) =>
                      hiddenColumns.has(idx) ? null : (
                        <td
                          key={idx}
                          className="border border-border px-3 py-2 text-center text-orange-900"
                        >
                          {contribution !== null && contribution !== undefined 
                            ? `${contribution.toFixed(1)}%` 
                            : '-'}
                        </td>
                      )
                    )}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p>* Clique nos cabeçalhos para ordenar. Passe o mouse sobre eles para ver explicações.</p>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

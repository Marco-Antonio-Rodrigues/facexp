'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

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
  factor_values: Record<string, any>;
  is_excluded?: boolean;
  is_center_point?: boolean;
}

interface UploadResult {
  success: number;
  errors: string[];
  deleted?: number;
  mode?: 'create' | 'update';
}

interface Props {
  experimentSlug: string;
  runs: ExperimentRun[];
  factors: Factor[];
  responseVars: ResponseVariable[];
  onUploadComplete: () => void;
}

export default function ExperimentRunsUpload({ 
  experimentSlug, 
  runs,
  factors, 
  responseVars,
  onUploadComplete 
}: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Pegar a primeira planilha
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Converter para JSON
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          // NOVO COMPORTAMENTO: Sempre usar o Excel como fonte de verdade
          // O Excel sempre substitui completamente os dados existentes
          await processData(jsonData);
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          setUploadResult({
            success: 0,
            errors: [`Erro ao processar arquivo Excel: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
          });
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        setUploadResult({
          success: 0,
          errors: ['Erro ao ler arquivo']
        });
        setIsUploading(false);
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Erro:', error);
      setUploadResult({
        success: 0,
        errors: ['Erro ao processar arquivo']
      });
      setIsUploading(false);
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processData = async (data: any[]) => {
    const errors: string[] = [];
    let successCount = 0;
    let deletedCount = 0;

    try {
      // Validar colunas obrigatórias no cabeçalho
      if (data.length === 0) {
        setUploadResult({
          success: 0,
          errors: ['Arquivo Excel vazio ou sem dados']
        });
        setIsUploading(false);
        return;
      }

      const firstRow = data[0];
      const columnNames = Object.keys(firstRow);
      
      // Função para normalizar texto (mantém apenas letras e números)
      const normalize = (text: string) => 
        text.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^a-z0-9]/g, ''); // Mantém apenas letras e números

      // Verificar colunas obrigatórias com normalização
      const normalizedColumns = columnNames.map(col => ({
        original: col,
        normalized: normalize(col)
      }));

      const findColumn = (options: string[]) => {
        for (const option of options) {
          const normalized = normalize(option);
          const found = normalizedColumns.find(col => col.normalized === normalized);
          if (found) return found.original;
        }
        return null;
      };

      // PADRÃO DE IMPORTAÇÃO - Buscar colunas obrigatórias
      const standardOrderCol = findColumn(['Ordem Padrão', 'ordem padrao', 'standard_order', 'ordempadrao']);
      const runOrderCol = findColumn(['Ordem Execução', 'ordem execucao', 'run_order', 'ordemexecucao']);
      const replicateCol = findColumn(['Réplica', 'replicate', 'replicate_number', 'replica']);

      // Validar pelo menos uma das ordens (preferência para Ordem Execução)
      const orderCol = runOrderCol || standardOrderCol;
      
      if (!orderCol || !replicateCol) {
        const missingColumns: string[] = [];
        if (!orderCol) missingColumns.push('Ordem Execução ou Ordem Padrão');
        if (!replicateCol) missingColumns.push('Réplica');
        
        setUploadResult({
          success: 0,
          errors: [
            `❌ Colunas obrigatórias não encontradas: ${missingColumns.join(', ')}`,
            `📋 Colunas encontradas no arquivo: ${columnNames.join(', ')}`,
            `💡 Dica: Baixe o template Excel para ver a estrutura correta`
          ]
        });
        setIsUploading(false);
        return;
      }

      // Identificar colunas de fatores e respostas automaticamente
      // FATORES: [FATOR] Nome (Símbolo) OU Nome (Símbolo) OU Nome OU Símbolo
      const factorColumns = new Map<number, string>();
      factors.forEach(factor => {
        // Tentar: com prefixo e sem prefixo para compatibilidade
        const possibleNames = [
          `[FATOR] ${factor.name} (${factor.symbol})`,     // Novo formato com prefixo
          `[Fator] ${factor.name} (${factor.symbol})`,     // Variação de case
          `FATOR ${factor.name} (${factor.symbol})`,       // Sem colchetes
          `${factor.name} (${factor.symbol})`,             // Formato antigo
          `${factor.name}(${factor.symbol})`,              // Sem espaços
          factor.name,                                      // Só nome
          factor.symbol                                     // Só símbolo
        ];
        
        for (const possibleName of possibleNames) {
          const col = findColumn([possibleName]);
          if (col) {
            factorColumns.set(factor.id, col);
            break;
          }
        }
      });

      // RESPOSTAS: [RESPOSTA] Nome OU Nome
      const responseColumns = new Map<number, string>();
      responseVars.forEach(rv => {
        const possibleNames = [
          `[RESPOSTA] ${rv.name}`,           // Novo formato com prefixo
          `[Resposta] ${rv.name}`,           // Variação de case
          `RESPOSTA ${rv.name}`,             // Sem colchetes
          rv.name,                           // Formato antigo
          `${rv.name} (Resposta)`,           // Alternativa
          `${rv.name}(Resposta)`             // Sem espaços
        ];
        
        for (const possibleName of possibleNames) {
          const col = findColumn([possibleName]);
          if (col) {
            responseColumns.set(rv.id, col);
            break;
          }
        }
      });

      const token = localStorage.getItem('access_token');
      
      // NOVO COMPORTAMENTO: Sempre substituir (replace=true)
      // Importar do Excel criando novos runs (o backend vai deletar os antigos)
      const runsToImport = [];
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2;

        try {
          // Coletar valores dos campos obrigatórios
          const runOrderValue = runOrderCol ? parseInt(row[runOrderCol]) : null;
          const standardOrderValue = standardOrderCol ? parseInt(row[standardOrderCol]) : null;
          const replicateValue = parseInt(row[replicateCol]);

          // Validações
          if (isNaN(replicateValue)) {
            errors.push(`Linha ${rowNumber}: Réplica inválida`);
            continue;
          }

          // Pelo menos uma ordem deve existir
          if ((!runOrderValue || isNaN(runOrderValue)) && (!standardOrderValue || isNaN(standardOrderValue))) {
            errors.push(`Linha ${rowNumber}: Ordem de execução ou ordem padrão não encontrada`);
            continue;
          }

          // Coletar valores dos fatores
          const factor_values: Record<string, number | string> = {};
          const missingFactors: string[] = [];
          
          factors.forEach(factor => {
            const colName = factorColumns.get(factor.id);
            if (colName) {
              const value = row[colName];
              if (value !== undefined && value !== null && value !== '') {
                if (factor.data_type === 'quantitative') {
                  const numValue = parseFloat(value);
                  if (!isNaN(numValue)) {
                    factor_values[factor.id.toString()] = numValue;
                  } else {
                    errors.push(`Linha ${rowNumber}: Valor inválido para fator ${factor.name}`);
                  }
                } else {
                  factor_values[factor.id.toString()] = value;
                }
              } else {
                missingFactors.push(factor.name);
              }
            } else {
              missingFactors.push(factor.name);
            }
          });

          if (missingFactors.length > 0) {
            errors.push(`Linha ${rowNumber}: Fatores não encontrados: ${missingFactors.join(', ')}`);
            continue;
          }

          // Coletar valores de resposta (podem estar vazios)
          const response_values: Record<string, number | null> = {};
          
          responseColumns.forEach((colName, rvId) => {
            const value = row[colName];
            if (value !== undefined && value !== null && value !== '') {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                response_values[rvId.toString()] = numValue;
              }
            }
          });

          // Criar objeto run
          const runData: any = {
            standard_order: standardOrderValue || runOrderValue,
            run_order: runOrderValue || standardOrderValue,
            replicate_number: replicateValue,
            factor_values,
            response_values,
            is_center_point: false,
            is_excluded: false
          };

          runsToImport.push(runData);
        } catch (rowError) {
          errors.push(`Linha ${rowNumber}: ${rowError instanceof Error ? rowError.message : 'Erro desconhecido'}`);
        }
      }

      // Se há erros de validação, não enviar
      if (errors.length > 0) {
        setUploadResult({ 
          success: 0, 
          errors: [
            `❌ ${errors.length} erro(s) de validação encontrado(s):`,
            ...errors.slice(0, 20),
            ...(errors.length > 20 ? [`... e mais ${errors.length - 20} erros`] : [])
          ]
        });
        setIsUploading(false);
        return;
      }

      // Enviar para o backend com replace=true
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/runs/import_from_excel/`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              replace: true,  // SEMPRE substituir
              runs: runsToImport
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          setUploadResult({
            success: 0,
            errors: [`❌ Erro ao importar: ${JSON.stringify(errorData)}`]
          });
          setIsUploading(false);
          return;
        }

        const result = await response.json();
        successCount = result.created || 0;
        deletedCount = result.deleted || 0;

        setUploadResult({ 
          success: successCount, 
          errors: [],
          deleted: deletedCount,
          mode: 'create'
        });
        
        onUploadComplete();
      } catch (error) {
        errors.push(`Erro ao enviar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        setUploadResult({ success: 0, errors });
      }
    } catch (error) {
      errors.push(`Erro geral: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setUploadResult({ success: successCount, errors });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    try {
      // PADRÃO DE EXPORTAÇÃO:
      // 1. Colunas de identificação: Ordem Padrão, Ordem Execução, Réplica
      // 2. Fatores: [FATOR] Nome (Símbolo) - ex: "[FATOR] Temperatura (F)"
      // 3. Respostas: [RESPOSTA] Nome - ex: "[RESPOSTA] Tempo"
      // 4. Colunas adicionais (somente leitura): Status, Ponto Central
      
      const headers = [
        'Ordem Padrão',
        'Ordem Execução', 
        'Réplica',
        ...factors.map(f => `[FATOR] ${f.name} (${f.symbol})`),
        ...responseVars.map(rv => `[RESPOSTA] ${rv.name}`),
        'Status',
        'Ponto Central'
      ];
      
      // Se há runs, exportar com os dados. Senão, só o header
      const rows = runs.length > 0 
        ? runs.map(run => [
            run.standard_order,
            run.run_order,
            run.replicate_number,
            ...factors.map(f => run.factor_values?.[f.id.toString()] ?? ''),
            ...responseVars.map(() => ''), // Valores vazios para preencher
            run.is_excluded ? 'Excluído' : 'Ativo',
            run.is_center_point ? 'Sim' : 'Não'
          ])
        : [];

      // Criar workbook
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Experimento');

      // Download
      const fileName = `template_experimento_${experimentSlug}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      // Feedback de sucesso
      setUploadResult({
        success: 1,
        errors: [],
        mode: 'update'
      });
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setUploadResult(null), 3000);
    } catch (error) {
      console.error('Erro ao gerar template:', error);
      setUploadResult({
        success: 0,
        errors: [
          '❌ Erro ao gerar template Excel',
          `Detalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          '💡 Tente: 1) Recarregar a página, 2) Permitir downloads no navegador, 3) Verificar espaço em disco'
        ]
      });
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">📤 Importar Dados</CardTitle>
          <Button
            onClick={() => setShowInstructions(!showInstructions)}
            className="bg-muted text-foreground hover:bg-muted/80 text-sm"
          >
            {showInstructions ? '❌ Fechar' : 'ℹ️ Como usar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showInstructions && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
            <h4 className="font-semibold text-foreground">📖 Padrão de Importação/Exportação</h4>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Estrutura do arquivo Excel:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li><strong>Colunas obrigatórias:</strong>
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Ordem Padrão - número único de cada corrida</li>
                    <li>Ordem Execução - ordem randomizada de execução</li>
                    <li>Réplica - número da réplica (1, 2, 3...)</li>
                  </ul>
                </li>
                <li><strong>Fatores (⚠️ SOMENTE LEITURA):</strong>
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li className="text-warning font-semibold">Formato: <code className="bg-muted px-1 rounded">[FATOR] Nome (Símbolo)</code></li>
                    <li>Exemplo: <code className="bg-muted px-1 rounded">[FATOR] Temperatura (F)</code></li>
                    <li className="text-destructive">❌ NÃO modifique esses valores!</li>
                  </ul>
                </li>
                <li><strong>Variáveis de resposta (✅ EDITÁVEIS):</strong>
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li className="text-success font-semibold">Formato: <code className="bg-muted px-1 rounded">[RESPOSTA] Nome</code></li>
                    <li>Exemplo: <code className="bg-muted px-1 rounded">[RESPOSTA] Tempo</code></li>
                    <li className="text-success">✅ Preencha com os valores medidos</li>
                  </ul>
                </li>
                <li><strong>Colunas informativas (somente leitura):</strong>
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Status - Ativo ou Excluído</li>
                    <li>Ponto Central - Sim ou Não</li>
                  </ul>
                </li>
              </ol>

              <div className="mt-3 p-3 bg-primary/10 rounded">
                <p className="font-semibold text-foreground mb-1">📝 Como usar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Clique em "Baixar Template Excel" (se precisar do modelo)</li>
                  <li>Prepare seu arquivo Excel com os dados completos</li>
                  <li>Preencha as colunas de fatores <code className="bg-muted px-1 rounded text-warning">[FATOR]</code> e respostas <code className="bg-muted px-1 rounded text-success">[RESPOSTA]</code></li>
                  <li>Clique em "Enviar Excel" para importar</li>
                </ol>
              </div>

              <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded">
                <p className="font-semibold text-warning mb-1">⚠️ ATENÇÃO - Substituição Total:</p>
                <p className="text-sm text-muted-foreground">
                  Ao enviar um novo Excel, <strong className="text-foreground">TODOS os dados existentes serão deletados</strong> e substituídos pelos dados do arquivo. 
                  O Excel é sempre a <strong className="text-foreground">fonte de verdade</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={downloadTemplate}
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            📥 Baixar Template Excel
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Processando...
              </>
            ) : (
              '📤 Enviar Excel'
            )}
          </Button>
        </div>

        {/* Aviso sobre Excel como fonte de verdade */}
        <div className="text-xs text-muted-foreground bg-warning/5 p-3 rounded border border-warning/20">
          <p className="font-semibold mb-1 text-warning">⚠️ Excel como Fonte de Verdade</p>
          <p>Ao enviar um Excel, todos os dados existentes serão <strong>deletados e substituídos</strong> pelos dados do arquivo.</p>
        </div>

        {uploadResult && (
          <div className={`p-4 rounded-lg border ${
            uploadResult.errors.length === 0 
              ? 'bg-success/10 border-success/30' 
              : 'bg-destructive/10 border-destructive/30'
          }`}>
            {uploadResult.errors.length === 0 ? (
              <div>
                <p className="font-semibold mb-2 text-success">
                  ✅ Importação concluída com sucesso!
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  {uploadResult.deleted && uploadResult.deleted > 0 && (
                    <p>🗑️ {uploadResult.deleted} corrida(s) antiga(s) deletada(s)</p>
                  )}
                  <p>➕ {uploadResult.success} corrida(s) importada(s) do Excel</p>
                  <p className="text-xs mt-2 text-foreground font-medium">
                    💡 O Excel é agora a fonte de verdade - todos os dados anteriores foram substituídos.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-semibold mb-2 text-destructive">
                  ❌ Erros encontrados na importação
                </p>
                <ul className="text-sm text-destructive space-y-1 max-h-40 overflow-y-auto">
                  {uploadResult.errors.slice(0, 10).map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                  {uploadResult.errors.length > 10 && (
                    <li className="font-semibold">
                      ... e mais {uploadResult.errors.length - 10} erros
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

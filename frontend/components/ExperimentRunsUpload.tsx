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
}

interface UploadResult {
  success: number;
  errors: string[];
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

    try {
      // Validar colunas obrigatórias no cabeçalho
      if (data.length === 0) {
        setUploadResult({
          success: 0,
          errors: ['Arquivo CSV vazio ou sem dados']
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

      const standardOrderCol = findColumn(['Ordem Padrão', 'ordem padrao', 'standard_order', 'ordempadrao']);
      const replicateCol = findColumn(['Réplica', 'replicate', 'replicate_number', 'replica']);

      if (!standardOrderCol || !replicateCol) {
        const missingColumns: string[] = [];
        if (!standardOrderCol) missingColumns.push('Ordem Padrão');
        if (!replicateCol) missingColumns.push('Réplica');
        
        setUploadResult({
          success: 0,
          errors: [
            `❌ Colunas obrigatórias não encontradas: ${missingColumns.join(', ')}`,
            `📋 Colunas encontradas no arquivo: ${columnNames.join(', ')}`,
            `💡 Dica: Baixe o template CSV para ver a estrutura correta`
          ]
        });
        setIsUploading(false);
        return;
      }

      const token = localStorage.getItem('access_token');
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // +2 porque CSV tem header e linhas começam em 1

        try {
          // Usar os nomes de colunas encontrados
          const standardOrder = parseInt(row[standardOrderCol]);
          const replicateNumber = parseInt(row[replicateCol]);

          if (isNaN(standardOrder)) {
            errors.push(`Linha ${rowNumber}: Ordem Padrão com valor inválido`);
            continue;
          }

          // Encontrar a corrida correspondente
          const run = runs.find(
            r => r.standard_order === standardOrder && r.replicate_number === replicateNumber
          );

          if (!run) {
            errors.push(`Linha ${rowNumber}: Corrida não encontrada (Ordem ${standardOrder}, Réplica ${replicateNumber})`);
            continue;
          }

          // Coletar valores de resposta
          const response_values: Record<string, number | null> = {};
          let hasAnyValue = false;

          responseVars.forEach((rv) => {
            // Tentar diferentes formatos de nome de coluna
            const value = row[rv.name] || row[rv.id.toString()] || row[`response_${rv.id}`];
            
            if (value !== undefined && value !== null && value !== '') {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                response_values[rv.id.toString()] = numValue;
                hasAnyValue = true;
              }
            }
          });

          if (!hasAnyValue) {
            errors.push(`Linha ${rowNumber}: Nenhum valor de resposta encontrado`);
            continue;
          }

          // Enviar para o backend
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/runs/${run.id}/update_responses/`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ response_values })
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            errors.push(`Linha ${rowNumber}: ${JSON.stringify(errorData)}`);
            continue;
          }

          successCount++;
        } catch (rowError) {
          errors.push(`Linha ${rowNumber}: ${rowError instanceof Error ? rowError.message : 'Erro desconhecido'}`);
        }
      }

      setUploadResult({ success: successCount, errors });
      
      if (successCount > 0) {
        onUploadComplete();
      }
    } catch (error) {
      errors.push(`Erro geral: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setUploadResult({ success: successCount, errors });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Criar dados para o Excel
    const headers = [
      'Ordem Padrão', 
      'Réplica', 
      ...factors.map(f => f.name),
      ...responseVars.map(rv => rv.name)
    ];
    
    const rows = runs.map(run => [
      run.standard_order,
      run.replicate_number,
      ...factors.map(f => run.factor_values?.[f.id.toString()] ?? ''),
      ...responseVars.map(() => '') // Valores vazios para preencher
    ]);

    // Criar workbook
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Experimento');

    // Download
    XLSX.writeFile(workbook, `template_experimento_${experimentSlug}.xlsx`);
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
            <h4 className="font-semibold text-foreground">Como importar dados:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Baixe o template Excel (.xlsx) clicando no botão abaixo</li>
              <li>Preencha os valores das variáveis de resposta</li>
              <li>Mantenha as colunas "Ordem Padrão" e "Réplica" sem modificar</li>
              <li>Salve o arquivo</li>
              <li>Faça upload do arquivo preenchido</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              💡 <strong>Dica:</strong> Use Excel ou Google Sheets - sem problemas de encoding!
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={downloadTemplate}
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={responseVars.length === 0}
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

        {responseVars.length === 0 && (
          <p className="text-sm text-destructive">
            ⚠️ Adicione variáveis de resposta antes de importar dados
          </p>
        )}

        {uploadResult && (
          <div className={`p-4 rounded-lg border ${
            uploadResult.errors.length === 0 
              ? 'bg-success/10 border-success/30' 
              : 'bg-destructive/10 border-destructive/30'
          }`}>
            <p className="font-semibold mb-2">
              ✅ {uploadResult.success} corridas atualizadas com sucesso
            </p>
            
            {uploadResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold text-destructive mb-1">
                  ❌ Erros encontrados:
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

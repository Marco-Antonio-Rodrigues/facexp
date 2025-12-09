'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTypeEnum } from '@/types';

interface FactorFormData {
  name: string;
  symbol: string;
  data_type: DataTypeEnum;
  precision: number;
  levels_config: {
    low?: number;
    high?: number;
    center?: number;
    levels?: string[];
  };
}

interface FactorModalProps {
  experimentSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: FactorFormData & { id: number };
}

export default function FactorModal({ experimentSlug, isOpen, onClose, onSuccess, editData }: FactorModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<FactorFormData>(editData || {
    name: '',
    symbol: '',
    data_type: DataTypeEnum.quantitative,
    precision: 2,
    levels_config: {
      low: -1,
      high: 1,
      center: 0,
    },
  });

  const [categoricalInput, setCategoricalInput] = useState(
    editData?.levels_config?.levels?.join(', ') || ''
  );

  if (!isOpen) return null;

  const handleChange = (field: keyof FactorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDataTypeChange = (dataType: DataTypeEnum) => {
    setFormData(prev => ({
      ...prev,
      data_type: dataType,
      levels_config: dataType === DataTypeEnum.quantitative
        ? { low: -1, high: 1, center: 0 }
        : { levels: [] },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.symbol.trim()) {
      setError('Nome e símbolo são obrigatórios');
      return;
    }

    if (formData.data_type === DataTypeEnum.categorical) {
      const levels = categoricalInput.split(',').map(l => l.trim()).filter(Boolean);
      if (levels.length < 2) {
        setError('Fatores categóricos precisam de pelo menos 2 níveis');
        return;
      }
      formData.levels_config = { levels };
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const url = editData
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/factors/${editData.id}/`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/factors/`;
      
      const method = editData ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.symbol?.[0] || 'Erro ao salvar fator');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar fator');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full border-slate-200 my-8">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-900">
            {editData ? 'Editar Fator' : 'Adicionar Fator'}
          </CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Fatores são as variáveis independentes que serão manipuladas no experimento
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-destructive font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-900 mb-2">
                Nome do Fator *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Temperatura, pH, Concentração"
                required
                className="w-full"
              />
            </div>

            {/* Símbolo */}
            <div>
              <label htmlFor="symbol" className="block text-sm font-semibold text-slate-900 mb-2">
                Símbolo *
              </label>
              <Input
                id="symbol"
                type="text"
                value={formData.symbol}
                onChange={(e) => handleChange('symbol', e.target.value)}
                placeholder="Ex: T, pH, C"
                required
                className="w-full font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Identificador único curto para o fator (usado em gráficos e tabelas)
              </p>
            </div>

            {/* Tipo de Dado */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Tipo de Dado *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDataTypeChange(DataTypeEnum.quantitative)}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    formData.data_type === DataTypeEnum.quantitative
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="font-semibold text-slate-900">Quantitativo</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Valores numéricos contínuos (ex: temperatura, pressão)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDataTypeChange(DataTypeEnum.categorical)}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    formData.data_type === DataTypeEnum.categorical
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="font-semibold text-slate-900">Categórico</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Categorias discretas (ex: catalisador A, B, C)
                  </div>
                </button>
              </div>
            </div>

            {/* Configuração Quantitativa */}
            {formData.data_type === DataTypeEnum.quantitative && (
              <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-slate-900">Configuração dos Níveis</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="low" className="block text-sm font-semibold text-slate-900 mb-1">
                      Nível Baixo (-)
                    </label>
                    <Input
                      id="low"
                      type="number"
                      step="any"
                      value={formData.levels_config.low ?? ''}
                      onChange={(e) => handleChange('levels_config', {
                        ...formData.levels_config,
                        low: parseFloat(e.target.value)
                      })}
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="center" className="block text-sm font-semibold text-slate-900 mb-1">
                      Ponto Central (0)
                    </label>
                    <Input
                      id="center"
                      type="number"
                      step="any"
                      value={formData.levels_config.center ?? ''}
                      onChange={(e) => handleChange('levels_config', {
                        ...formData.levels_config,
                        center: parseFloat(e.target.value)
                      })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="high" className="block text-sm font-semibold text-slate-900 mb-1">
                      Nível Alto (+)
                    </label>
                    <Input
                      id="high"
                      type="number"
                      step="any"
                      value={formData.levels_config.high ?? ''}
                      onChange={(e) => handleChange('levels_config', {
                        ...formData.levels_config,
                        high: parseFloat(e.target.value)
                      })}
                      required
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="precision" className="block text-sm font-semibold text-slate-900 mb-1">
                    Precisão (casas decimais)
                  </label>
                  <Input
                    id="precision"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.precision}
                    onChange={(e) => handleChange('precision', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Configuração Categórica */}
            {formData.data_type === DataTypeEnum.categorical && (
              <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-slate-900">Níveis Categóricos</h4>
                
                <div>
                  <label htmlFor="categorical_levels" className="block text-sm font-semibold text-slate-900 mb-1">
                    Níveis (separados por vírgula) *
                  </label>
                  <Input
                    id="categorical_levels"
                    type="text"
                    value={categoricalInput}
                    onChange={(e) => setCategoricalInput(e.target.value)}
                    placeholder="Ex: Catalisador A, Catalisador B, Catalisador C"
                    required
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Digite os níveis separados por vírgula (mínimo 2 níveis)
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="text-lg mr-2">✓</span>
                    {editData ? 'Salvar Alterações' : 'Adicionar Fator'}
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTypeEnum } from '@/types';
import { AXIOS_INSTANCE } from '@/lib/api-client';

interface FactorFormData {
  name: string;
  symbol: string;
  data_type: DataTypeEnum;
  precision: number;
  levels_config: number[] | string[];
}

interface FactorModalProps {
  experimentSlug: string;
  designType?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: FactorFormData & { id: number };
}

export default function FactorModal({ experimentSlug, designType, isOpen, onClose, onSuccess, editData }: FactorModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<FactorFormData>(editData || {
    name: '',
    symbol: '',
    data_type: DataTypeEnum.quantitative,
    precision: 2,
    levels_config: designType === 'full_factorial' ? [-1, 1] : [-1, 0, 1],
  });

  const [categoricalInput, setCategoricalInput] = useState(
    editData && Array.isArray(editData.levels_config) && typeof editData.levels_config[0] === 'string'
      ? editData.levels_config.join('; ')
      : ''
  );

  const [quantitativeInput, setQuantitativeInput] = useState(
    editData && Array.isArray(editData.levels_config) && typeof editData.levels_config[0] === 'number'
      ? editData.levels_config.map(String).join('; ')
      : designType === 'full_factorial' ? '-1; 1' : '-1; 0; 1'
  );

  // Reseta o formulário quando o modal abre/fecha ou editData muda
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData(editData);
        setCategoricalInput(
          Array.isArray(editData.levels_config) && typeof editData.levels_config[0] === 'string'
            ? editData.levels_config.join('; ')
            : ''
        );
        setQuantitativeInput(
          Array.isArray(editData.levels_config) && typeof editData.levels_config[0] === 'number'
            ? editData.levels_config.map(String).join('; ')
            : '-1; 0; 1'
        );
      } else {
        // Reseta para valores padrão quando não está editando
        setFormData({
          name: '',
          symbol: '',
          data_type: DataTypeEnum.quantitative,
          precision: 2,
          levels_config: designType === 'full_factorial' ? [-1, 1] : [-1, 0, 1],
        });
        setCategoricalInput('');
        setQuantitativeInput(designType === 'full_factorial' ? '-1; 1' : '-1; 0; 1');
      }
      setError('');
    }
  }, [isOpen, editData, designType]);

  if (!isOpen) return null;

  const handleChange = (field: keyof FactorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDataTypeChange = (dataType: DataTypeEnum) => {
    setFormData(prev => ({
      ...prev,
      data_type: dataType,
      levels_config: dataType === DataTypeEnum.quantitative 
        ? (designType === 'full_factorial' ? [-1, 1] : [-1, 0, 1]) 
        : [],
    }));
    if (dataType === DataTypeEnum.quantitative) {
      setQuantitativeInput(designType === 'full_factorial' ? '-1; 1' : '-1; 0; 1');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.symbol.trim()) {
      setError('Nome e símbolo são obrigatórios');
      return;
    }

    if (formData.data_type === DataTypeEnum.categorical) {
      const levels = categoricalInput.split(';').map(l => l.trim()).filter(Boolean);
      if (levels.length < 2) {
        setError('Fatores categóricos precisam de pelo menos 2 níveis');
        return;
      }
      // Validação para experimentos 2^k
      if (designType === 'full_factorial' && levels.length !== 2) {
        setError('Experimentos fatoriais completos 2^k requerem exatamente 2 níveis por fator');
        return;
      }
      formData.levels_config = levels;
    } else {
      const levels = quantitativeInput.split(';').map(l => parseFloat(l.trim())).filter(n => !isNaN(n));
      if (levels.length < 2) {
        setError('Fatores quantitativos precisam de pelo menos 2 níveis');
        return;
      }
      // Validação para experimentos 2^k
      if (designType === 'full_factorial' && levels.length !== 2) {
        setError('Experimentos fatoriais completos 2^k requerem exatamente 2 níveis por fator');
        return;
      }
      // Ordenar os níveis
      formData.levels_config = levels.sort((a, b) => a - b);
    }

    setIsLoading(true);

    try {
      const url = editData
        ? `/api/experiments/${experimentSlug}/factors/${editData.id}/`
        : `/api/experiments/${experimentSlug}/factors/`;
      
      const method = editData ? 'patch' : 'post';

      const response = await AXIOS_INSTANCE[method](url, formData);

      console.log('✅ Fator salvo com sucesso:', response.data);
          
      console.log('✅ Fator salvo com sucesso:', response.data);

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar fator:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar fator');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full border-border my-8 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">
            {editData ? 'Editar Fator' : 'Adicionar Fator'}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Fatores são as variáveis independentes que serão manipuladas no experimento
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-destructive font-medium whitespace-pre-line">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
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
                autoFocus
              />
            </div>

            {/* Símbolo */}
            <div>
              <label htmlFor="symbol" className="block text-sm font-semibold text-foreground mb-2">
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
              <p className="text-xs text-muted-foreground mt-1">
                Identificador único curto para o fator (usado em gráficos e tabelas)
              </p>
            </div>

            {/* Tipo de Dado */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Tipo de Dado *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDataTypeChange(DataTypeEnum.quantitative)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData.data_type === DataTypeEnum.quantitative
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <div className="font-semibold text-foreground">Quantitativo</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Valores numéricos contínuos (ex: temperatura, pressão)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDataTypeChange(DataTypeEnum.categorical)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData.data_type === DataTypeEnum.categorical
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <div className="font-semibold text-foreground">Categórico</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Categorias discretas (ex: catalisador A, B, C)
                  </div>
                </button>
              </div>
            </div>

            {/* Configuração Quantitativa */}
            {formData.data_type === DataTypeEnum.quantitative && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                <h4 className="font-semibold text-foreground">Configuração dos Níveis</h4>
                
                {designType === 'full_factorial' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900 font-medium">
                      ℹ️ Experimentos fatoriais 2^k requerem exatamente <strong>2 níveis</strong> (baixo e alto)
                    </p>
                  </div>
                )}
                
                <div>
                  <label htmlFor="quantLevels" className="block text-sm font-semibold text-foreground mb-1">
                    Níveis (valores numéricos separados por ponto e vírgula)
                  </label>
                  <Input
                    id="quantLevels"
                    type="text"
                    value={quantitativeInput}
                    onChange={(e) => setQuantitativeInput(e.target.value)}
                    placeholder={designType === 'full_factorial' ? 'Ex: -1; 1 ou 0; 100' : 'Ex: -1; 0; 1 ou -2; -1; 0; 1; 2'}
                    required
                    className="w-full font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {designType === 'full_factorial' 
                      ? 'Exatamente 2 níveis: valor baixo e valor alto' 
                      : 'Mínimo de 2 níveis. Comum: 3 níveis (-1; 0; 1) ou 5 níveis (-2; -1; 0; 1; 2)'}
                  </p>
                </div>
              </div>
            )}

            {/* Configuração Categórica */}
            {formData.data_type === DataTypeEnum.categorical && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                <h4 className="font-semibold text-foreground">Níveis Categóricos</h4>
                
                {designType === 'full_factorial' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900 font-medium">
                      ℹ️ Experimentos fatoriais 2^k requerem exatamente <strong>2 níveis</strong> (baixo e alto)
                    </p>
                  </div>
                )}
                
                <div>
                  <label htmlFor="categorical_levels" className="block text-sm font-semibold text-foreground mb-1">
                    Níveis (separados por ponto e vírgula) *
                  </label>
                  <Input
                    id="categorical_levels"
                    type="text"
                    value={categoricalInput}
                    onChange={(e) => setCategoricalInput(e.target.value)}
                    placeholder={designType === 'full_factorial' ? 'Ex: Método A; Método B' : 'Ex: Catalisador A; Catalisador B; Catalisador C'}
                    required
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Digite os níveis separados por ponto e vírgula (mínimo 2 níveis)
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
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
                variant="outline"
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

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OptimizationGoalEnum } from '@/types';

interface ResponseVariableFormData {
  name: string;
  unit: string;
  optimization_goal: OptimizationGoalEnum;
}

interface ResponseVariableModalProps {
  experimentSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: ResponseVariableFormData & { id: number };
}

const OPTIMIZATION_OPTIONS = [
  { 
    value: OptimizationGoalEnum.none, 
    label: 'Nenhum',
    description: 'Apenas monitorar, sem objetivo específico',
    icon: '📊',
    color: 'border-slate-300'
  },
  { 
    value: OptimizationGoalEnum.maximize, 
    label: 'Maximizar',
    description: 'Buscar o maior valor possível',
    icon: '📈',
    color: 'border-emerald-500'
  },
  { 
    value: OptimizationGoalEnum.minimize, 
    label: 'Minimizar',
    description: 'Buscar o menor valor possível',
    icon: '📉',
    color: 'border-blue-500'
  },
  { 
    value: OptimizationGoalEnum.target, 
    label: 'Alvo',
    description: 'Buscar um valor-alvo específico',
    icon: '🎯',
    color: 'border-amber-500'
  },
];

export default function ResponseVariableModal({ 
  experimentSlug, 
  isOpen, 
  onClose, 
  onSuccess, 
  editData 
}: ResponseVariableModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<ResponseVariableFormData>(editData || {
    name: '',
    unit: '',
    optimization_goal: OptimizationGoalEnum.none,
  });

  if (!isOpen) return null;

  const handleChange = (field: keyof ResponseVariableFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const url = editData
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/response-variables/${editData.id}/`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/response-variables/`;
      
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
        throw new Error(errorData.message || errorData.name?.[0] || 'Erro ao salvar variável de resposta');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar variável de resposta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full border-slate-200 my-8">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-900">
            {editData ? 'Editar Variável de Resposta' : 'Adicionar Variável de Resposta'}
          </CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Variáveis de resposta são os resultados medidos que você deseja otimizar ou monitorar
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
                Nome da Variável *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Rendimento, Pureza, Tempo de Reação"
                required
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Nome descritivo da grandeza que será medida
              </p>
            </div>

            {/* Unidade */}
            <div>
              <label htmlFor="unit" className="block text-sm font-semibold text-slate-900 mb-2">
                Unidade de Medida
              </label>
              <Input
                id="unit"
                type="text"
                value={formData.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                placeholder="Ex: %, mg/L, min, °C"
                className="w-full font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Unidade em que a variável será medida (opcional)
              </p>
            </div>

            {/* Objetivo de Otimização */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">
                Objetivo de Otimização *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OPTIMIZATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange('optimization_goal', option.value)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.optimization_goal === option.value
                        ? `${option.color} bg-slate-50 shadow-md`
                        : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{option.icon}</span>
                      <span className="font-semibold text-slate-900">{option.label}</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Define se você quer aumentar, diminuir ou atingir um valor específico
              </p>
            </div>

            {/* Info sobre Target */}
            {formData.optimization_goal === OptimizationGoalEnum.target && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-xl">💡</span>
                  <div className="text-sm text-slate-700">
                    <strong>Nota:</strong> Para objetivos do tipo "Alvo", você poderá definir o valor-alvo 
                    desejado durante a análise dos resultados.
                  </div>
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
                    {editData ? 'Salvar Alterações' : 'Adicionar Variável'}
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

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ResponseVariableFormData {
  name: string;
  unit: string;
}

interface ResponseVariableModalProps {
  experimentSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: ResponseVariableFormData & { id: number };
}

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full border-border my-8 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">
            {editData ? 'Editar Variável de Resposta' : 'Adicionar Variável de Resposta'}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Variáveis de resposta são os resultados medidos durante o experimento
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
              <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
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
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nome descritivo da grandeza que será medida
              </p>
            </div>

            {/* Unidade */}
            <div>
              <label htmlFor="unit" className="block text-sm font-semibold text-foreground mb-2">
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
              <p className="text-xs text-muted-foreground mt-1">
                Unidade em que a variável será medida (opcional)
              </p>
            </div>

            {/* Info Card */}
            <div className="p-4 bg-muted/50 border border-border rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Dica</p>
                  <p>Você pode adicionar múltiplas variáveis de resposta para medir diferentes aspectos do seu experimento.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <Button
                type="submit"
                disabled={isLoading || !formData.name.trim()}
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
                    {editData ? 'Salvar Alterações' : 'Adicionar Variável'}
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

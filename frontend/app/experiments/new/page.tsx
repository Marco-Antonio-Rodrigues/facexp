'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ExperimentCreate, DesignTypeEnum } from '@/types';

const DESIGN_TYPE_OPTIONS = [
  { value: DesignTypeEnum.full_factorial, label: 'Fatorial Completo' },
  { value: DesignTypeEnum.fractional_factorial, label: 'Fatorial Fracionado' },
  { value: DesignTypeEnum.plackett_burman, label: 'Plackett-Burman' },
  { value: DesignTypeEnum.box_behnken, label: 'Box-Behnken' },
  { value: DesignTypeEnum.central_composite, label: 'Composto Central' },
];

export default function NewExperimentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<ExperimentCreate>({
    title: '',
    description: '',
    design_type: DesignTypeEnum.full_factorial,
  });

  const handleChange = (field: keyof ExperimentCreate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.title.trim()) {
      setError('Título é obrigatório');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/experiments/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar experimento');
      }

      const data = await response.json();
      router.push(`/experiments/${data.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar experimento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.back()}
              className="bg-slate-200 text-slate-700 hover:bg-slate-300"
            >
              ← Voltar
            </Button>
            <div className="flex items-center gap-2">
              <div className="text-2xl">🧪</div>
              <h1 className="text-xl font-bold text-slate-900">Novo Experimento</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">
              Informações do Experimento
            </CardTitle>
            <p className="text-sm text-slate-600 mt-2">
              Preencha os dados básicos para criar seu experimento fatorial
            </p>
          </CardHeader>
          
          <CardContent>
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-destructive font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Título */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-900 mb-2">
                  Título do Experimento *
                </label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Ex: Otimização do processo de fermentação"
                  required
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Nome descritivo e único para identificar seu experimento
                </p>
              </div>

              {/* Descrição */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-2">
                  Descrição
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Descreva o objetivo e contexto do experimento..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Opcional: adicione detalhes sobre o experimento
                </p>
              </div>

              {/* Tipo de Design */}
              <div>
                <label htmlFor="design_type" className="block text-sm font-semibold text-slate-900 mb-2">
                  Tipo de Design
                </label>
                <select
                  id="design_type"
                  value={formData.design_type}
                  onChange={(e) => handleChange('design_type', e.target.value as DesignTypeEnum)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                >
                  {DESIGN_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Metodologia estatística que será utilizada
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
                <Button
                  type="submit"
                  disabled={isLoading || !formData.title.trim()}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <span className="text-lg mr-2">✓</span>
                      Criar Experimento
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="bg-slate-200 text-slate-700 hover:bg-slate-300"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-slate-200 bg-blue-50/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">
                  Próximos Passos
                </h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Após criar, você poderá adicionar fatores e variáveis de resposta</li>
                  <li>• O sistema gerará automaticamente as corridas experimentais</li>
                  <li>• Você poderá inserir os dados coletados e realizar análises estatísticas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

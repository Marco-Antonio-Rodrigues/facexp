'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DesignTypeEnum, StatusEnum } from '@/types';

const DESIGN_TYPE_OPTIONS = [
  { value: DesignTypeEnum.full_factorial, label: 'Fatorial Completo' },
  // { value: DesignTypeEnum.fractional_factorial, label: 'Fatorial Fracionado' },
  // { value: DesignTypeEnum.plackett_burman, label: 'Plackett-Burman' },
  // { value: DesignTypeEnum.box_behnken, label: 'Box-Behnken' },
  // { value: DesignTypeEnum.central_composite, label: 'Composto Central' },
];

const STATUS_OPTIONS = [
  { value: StatusEnum.draft, label: 'Rascunho' },
  { value: StatusEnum.design_ready, label: 'Design Pronto' },
  { value: StatusEnum.data_collection, label: 'Coleta de Dados' },
  { value: StatusEnum.analysis_ready, label: 'Pronto para Análise' },
  { value: StatusEnum.completed, label: 'Concluído' },
  { value: StatusEnum.archived, label: 'Arquivado' },
];

// Schema de validação com Zod
const experimentSchema = z.object({
  title: z.string()
    .min(1, 'Título é obrigatório')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  description: z.string().optional(),
  design_type: z.enum(['full_factorial', 'fractional_factorial', 'plackett_burman', 'box_behnken', 'central_composite']),
  replicates: z.number()
    .int('O valor deve ser um número inteiro')
    .min(1, 'O número mínimo de repetições é 1')
    .max(100, 'O número máximo de repetições é 100'),
});

type ExperimentFormData = {
  title: string;
  description?: string;
  design_type: 'full_factorial' | 'fractional_factorial' | 'plackett_burman' | 'box_behnken' | 'central_composite';
  replicates: number;
};

export default function EditExperimentPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [slug, setSlug] = useState<string>('');
  const [hasRuns, setHasRuns] = useState(false);
  const [originalReplicates, setOriginalReplicates] = useState(1);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExperimentFormData>({
    resolver: zodResolver(experimentSchema),
    defaultValues: {
      title: '',
      description: '',
      design_type: DesignTypeEnum.full_factorial,
      replicates: 1,
    },
  });

  const currentReplicates = watch('replicates');

  useEffect(() => {
    params.then(p => {
      setSlug(p.slug);
      fetchExperiment(p.slug);
      checkHasRuns(p.slug);
    });
  }, []);

  const checkHasRuns = async (experimentSlug: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/runs/?page_size=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const hasAnyRuns = Array.isArray(data) 
          ? data.length > 0 
          : (data.count !== undefined ? data.count > 0 : (Array.isArray(data.results) ? data.results.length > 0 : false));
        
        setHasRuns(hasAnyRuns);
      }
    } catch (err) {
      console.error('Erro ao verificar corridas:', err);
    }
  };

  const fetchExperiment = async (experimentSlug: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${experimentSlug}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar experimento');
      }

      const data = await response.json();
      // Atualiza os valores do formulário
      setValue('title', data.title);
      setValue('description', data.description || '');
      setValue('design_type', data.design_type);
      setValue('replicates', data.replicates || 1);
      setOriginalReplicates(data.replicates || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar experimento');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ExperimentFormData) => {
    setError('');

    // Valida se está tentando alterar replicates com runs existentes
    if (hasRuns && data.replicates !== originalReplicates) {
      setError('⚠️ Não é possível alterar o número de repetições quando há corridas experimentais criadas. Delete todas as corridas primeiro e depois recrie com o novo número de repetições.');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experiments/${slug}/`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar experimento');
      }

      router.push(`/experiments/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar experimento');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Carregando experimento...</p>
      </div>
    );
  }

  if (error && slug === '') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md border-destructive/30">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium mb-4">{error}</p>
            <Button onClick={() => router.push('/experiments')}>
              Voltar para Experimentos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push(`/experiments/${slug}`)}
              className="bg-slate-200 text-slate-700 hover:bg-slate-300"
            >
              ← Voltar
            </Button>
            <div className="flex items-center gap-2">
              <div className="text-2xl">🧪</div>
              <h1 className="text-xl font-bold text-slate-900">Editar Experimento</h1>
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
              Atualize os dados do seu experimento fatorial
            </p>
          </CardHeader>
          
          <CardContent>
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-destructive font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Título */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-900 mb-2">
                  Título do Experimento *
                </label>
                <Input
                  id="title"
                  type="text"
                  {...register('title')}
                  placeholder="Ex: Otimização do processo de fermentação"
                  className={`w-full ${errors.title ? 'border-destructive' : ''}`}
                />
                {errors.title && (
                  <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
                )}
                {!errors.title && (
                  <p className="text-xs text-slate-500 mt-1">
                    Nome descritivo e único para identificar seu experimento
                  </p>
                )}
              </div>

              {/* Descrição */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-2">
                  Descrição
                </label>
                <textarea
                  id="description"
                  {...register('description')}
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
                  {...register('design_type')}
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

              {/* Número de Repetições */}
              <div>
                <label htmlFor="replicates" className="block text-sm font-semibold text-slate-900 mb-2">
                  Número de Repetições (Réplicas) *
                </label>
                <Input
                  id="replicates"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  {...register('replicates', { valueAsNumber: true })}
                  placeholder="Digite um número entre 1 e 100"
                  className={`w-full font-mono ${errors.replicates ? 'border-destructive focus:ring-destructive' : ''} ${hasRuns && currentReplicates !== originalReplicates ? 'border-amber-500 bg-amber-50' : ''}`}
                />
                {errors.replicates && (
                  <p className="text-sm text-destructive mt-1 font-medium">
                    ⚠️ {errors.replicates.message}
                  </p>
                )}
                {hasRuns && currentReplicates !== originalReplicates && (
                  <div className="mt-2 p-3 bg-amber-100 border border-amber-400 rounded-lg">
                    <p className="text-sm text-amber-900 font-medium flex items-start gap-2">
                      <span className="text-lg">⚠️</span>
                      <span>
                        <strong>Atenção:</strong> Você está alterando o número de repetições, mas já existem corridas criadas. 
                        Para alterar este valor, você precisa primeiro <strong>deletar todas as corridas</strong> na página do experimento 
                        e depois recriá-las com o novo número de repetições.
                      </span>
                    </p>
                  </div>
                )}
                {!errors.replicates && (!hasRuns || currentReplicates === originalReplicates) && (
                  <p className="text-xs text-slate-500 mt-1">
                    Número de vezes que cada combinação será executada (1 a 100)
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <span className="text-lg mr-2">✓</span>
                      Salvar Alterações
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push(`/experiments/${slug}`)}
                  disabled={isSubmitting}
                  className="bg-slate-200 text-slate-700 hover:bg-slate-300"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Warning Card */}
        <Card className="mt-6 border-amber-200 bg-amber-50/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">
                  Atenção
                </h3>
                <p className="text-sm text-slate-600">
                  O status do experimento é gerenciado automaticamente pelo sistema:
                </p>
                <ul className="text-sm text-slate-600 mt-2 space-y-1 list-disc list-inside">
                  <li><strong>Rascunho</strong> - Criação inicial</li>
                  <li><strong>Design Pronto</strong> - Após gerar corridas</li>
                  <li><strong>Coleta de Dados</strong> - Durante preenchimento dos dados</li>
                  <li><strong>Pronto para Análise</strong> - Todos os dados coletados</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

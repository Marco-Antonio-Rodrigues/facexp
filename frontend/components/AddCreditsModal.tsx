'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface AddCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: string;
}

const CREDIT_OPTIONS = [
  { value: 10, label: 'R$ 10,00', credits: '10' },
  { value: 20, label: 'R$ 20,00', credits: '20' },
  { value: 50, label: 'R$ 50,00', credits: '50' },
  { value: 100, label: 'R$ 100,00', credits: '100' },
];

export function AddCreditsModal({ isOpen, onClose, currentBalance }: AddCreditsModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = selectedAmount || parseFloat(customAmount);
    
    if (!amount || amount < 1) {
      setError('O valor mínimo é R$ 1,00');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Você precisa estar logado');
      }

      // Cria o pedido e obtém o link de checkout
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/order/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amount,
          redirect_url: `${window.location.origin}/payment/success`,
        }),
      });

      // Verifica o tipo de conteúdo da resposta
      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Serviço de recarga não disponível no momento. Contate o suporte.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar pedido');
      }

      // Redireciona para o checkout InfinitePay
      if (data.checkout_link) {
        window.location.href = data.checkout_link;
      } else {
        throw new Error('Link de checkout não disponível');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pagamento');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="w-full max-w-md animate-scaleIn">
        <Card className="relative shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none transition-colors"
            disabled={isLoading}
          >
            ×
          </button>

        <CardHeader>
          <CardTitle>Adicionar Créditos</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Saldo atual: <strong className="text-blue-600">R$ {currentBalance}</strong>
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escolha o valor
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CREDIT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(option.value);
                      setCustomAmount('');
                    }}
                    className={`
                      p-4 rounded-lg border-2 font-semibold transition-all
                      ${selectedAmount === option.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-blue-300 text-gray-700'
                      }
                    `}
                  >
                    <div className="text-lg">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.credits} créditos</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor personalizado
              </label>
              <Input
                type="number"
                placeholder="Ex: 25.00"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                min="1"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Valor mínimo: R$ 1,00</p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={!selectedAmount && !customAmount}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}

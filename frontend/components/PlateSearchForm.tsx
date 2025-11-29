'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';

interface PlateResult {
  message: string;
  service: string;
  amount_debited: string;
  balance_after: string;
  transaction_id: number;
}

export function PlateSearchForm() {
  const [plate, setPlate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PlateResult | null>(null);

  const formatPlate = (value: string) => {
    // Remove caracteres não alfanuméricos
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Formato antigo: ABC-1234 ou novo: ABC1D23
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
    }
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlate(e.target.value);
    if (formatted.length <= 8) {
      setPlate(formatted);
      setError('');
      setResult(null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanPlate = plate.replace('-', '');
    if (cleanPlate.length < 7) {
      setError('Placa inválida. Digite uma placa completa.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Você precisa estar logado para consultar placas');
      }

      const data = await apiClient.consumeService('consulta-placa', token);
      setResult(data as PlateResult);
      
      // Dispara evento para atualizar o saldo no dashboard
      window.dispatchEvent(new Event('balanceUpdated'));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao consultar placa';
      
      if (errorMessage.includes('Saldo insuficiente')) {
        setError('Saldo insuficiente. Adicione créditos para continuar consultando.');
      } else if (errorMessage.includes('402')) {
        setError('Saldo insuficiente para realizar esta consulta.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="ABC-1234 ou ABC1D23"
            value={plate}
            onChange={handlePlateChange}
            className="flex-1 font-mono text-lg"
            error={error}
            maxLength={8}
          />
          <Button 
            type="submit" 
            isLoading={isLoading}
            disabled={plate.replace('-', '').length < 7}
            className="whitespace-nowrap"
          >
            Consultar
          </Button>
        </div>
      </form>

      {result && (
        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">✅ Consulta realizada com sucesso!</h4>
          <div className="space-y-1 text-sm text-green-700">
            <p><strong>Placa:</strong> {plate}</p>
            <p><strong>Serviço:</strong> {result.service}</p>
            <p><strong>Valor debitado:</strong> R$ {result.amount_debited}</p>
            <p><strong>Saldo restante:</strong> R$ {result.balance_after}</p>
            <p className="text-xs text-green-600 mt-2">ID da transação: #{result.transaction_id}</p>
          </div>
        </div>
      )}
    </div>
  );
}

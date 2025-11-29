'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface OrderData {
  id: number;
  order_nsu: string;
  amount: string;
  paid_amount: string;
  status: string;
  status_display: string;
  receipt_url?: string;
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setStatus('error');
          setMessage('Sessão expirada. Faça login novamente.');
          return;
        }

        // Busca o último pedido do usuário
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/order/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Erro ao buscar pedido');
        }

        const orders = await response.json();
        
        if (orders.length > 0) {
          const latestOrder = orders[0]; // O backend retorna ordenado por data
          setOrderData(latestOrder);

          // Verifica status do pedido
          if (latestOrder.status === 'CONCLUIDO') {
            setStatus('success');
            setMessage(`Crédito de R$ ${latestOrder.paid_amount} adicionado com sucesso!`);
            
            // Dispara evento para atualizar o saldo
            window.dispatchEvent(new Event('balanceUpdated'));
          } else if (latestOrder.status === 'PENDENTE') {
            setStatus('loading');
            setMessage('Aguardando confirmação do pagamento...');
            
            // Verifica novamente após 3 segundos
            setTimeout(checkPaymentStatus, 3000);
          } else {
            setStatus('error');
            setMessage('Pagamento não confirmado. Verifique sua conta ou entre em contato.');
          }
        } else {
          setStatus('error');
          setMessage('Nenhum pedido encontrado.');
        }
      } catch {
        setStatus('error');
        setMessage('Erro ao verificar status do pagamento.');
      }
    };

    checkPaymentStatus();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'loading' && '⏳ Processando...'}
            {status === 'success' && '✅ Pagamento Confirmado'}
            {status === 'error' && '❌ Erro no Pagamento'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            {status === 'loading' && (
              <div>
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-700">{message}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Isso pode levar alguns segundos...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div>
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-lg text-gray-700 mb-2">{message}</p>
                {orderData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-left">
                    <p><strong>Pedido:</strong> {orderData.order_nsu?.substring(0, 8)}...</p>
                    <p><strong>Valor:</strong> R$ {orderData.paid_amount}</p>
                    <p><strong>Status:</strong> {orderData.status_display}</p>
                  </div>
                )}
              </div>
            )}

            {status === 'error' && (
              <div>
                <div className="text-6xl mb-4">⚠️</div>
                <p className="text-gray-700">{message}</p>
              </div>
            )}

            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full"
              disabled={status === 'loading'}
            >
              {status === 'success' ? 'Voltar ao Dashboard' : 'Tentar Novamente'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

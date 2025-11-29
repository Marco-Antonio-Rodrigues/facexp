'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ConfirmEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de confirmação não encontrado.');
      return;
    }

    const confirmEmail = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/user/confirm-email/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Erro ao confirmar e-mail');
        }

        setStatus('success');
        setMessage(data.message || 'E-mail confirmado com sucesso!');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Erro ao confirmar e-mail');
      }
    };

    confirmEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'loading' && 'Confirmando e-mail...'}
            {status === 'success' && 'E-mail confirmado! ✅'}
            {status === 'error' && 'Erro na confirmação ❌'}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Aguarde enquanto confirmamos seu e-mail...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-5xl mb-4">🎉</div>
                <p className="text-green-700 font-medium">{message}</p>
              </div>
              <p className="text-gray-600">
                Agora você pode fazer login na plataforma!
              </p>
              <Button
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Fazer login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{message}</p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-600">
                  O link pode ter expirado ou já foi usado.
                </p>
                <Link
                  href="/login"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Voltar para login
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

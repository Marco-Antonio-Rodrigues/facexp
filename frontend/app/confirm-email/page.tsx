'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import * as authHelpers from '@/lib/auth-helpers';

function ConfirmEmailContent() {
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
        await authHelpers.confirmEmail(token);

        setStatus('success');
        setMessage('E-mail confirmado com sucesso!');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Erro ao confirmar e-mail');
      }
    };

    confirmEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4">
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="text-4xl">🧪</div>
            <h1 className="text-2xl font-bold text-primary">Facexp</h1>
          </div>
          <CardTitle className="text-center">
            {status === 'loading' && 'Confirmando e-mail...'}
            {status === 'success' && 'E-mail confirmado!'}
            {status === 'error' && 'Erro na confirmação'}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Aguarde enquanto confirmamos seu e-mail...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                <div className="text-5xl mb-4">🎉</div>
                <p className="text-success font-medium">{message}</p>
              </div>
              <p className="text-muted-foreground">
                Agora você pode fazer login na plataforma!
              </p>
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Fazer login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-destructive font-medium">{message}</p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  O link pode ter expirado ou já foi usado.
                </p>
                <Link
                  href="/login"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
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

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">Carregando...</div>}>
      <ConfirmEmailContent />
    </Suspense>
  );
}

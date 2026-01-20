'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import * as authHelpers from '@/lib/auth-helpers';

export default function LoginPage() {
  const router = useRouter();
  const { login, requestLoginCode } = useAuth();
  
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setNeedsEmailConfirmation(false);
    setIsLoading(true);

    try {
      await requestLoginCode(email);
      setSuccess('Código enviado para seu e-mail!');
      setStep('code');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao solicitar código';
      
      // Verifica se o erro é sobre e-mail não confirmado
      if (errorMessage.includes('não confirmado') || errorMessage.includes('confirme seu email')) {
        setNeedsEmailConfirmation(true);
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await authHelpers.resendConfirmationEmail(email);
      
      setSuccess('E-mail de confirmação reenviado! Verifique sua caixa de entrada.');
      setNeedsEmailConfirmation(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao reenviar e-mail de confirmação';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, code);
      router.push('/experiments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await requestLoginCode(email);
      setSuccess('Novo código enviado!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reenviar código');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          {/* Brand */}
          <div className="text-center mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Facexp
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Design of Experiments Platform
            </p>
          </div>
          
          <CardTitle className="text-center text-xl">
            {step === 'email' ? 'Bem-vindo de volta!' : 'Digite o código'}
          </CardTitle>
          <p className="text-muted-foreground text-center mt-2 text-sm">
            {step === 'email' 
              ? 'Entre com seu e-mail para receber o código de acesso'
              : 'Enviamos um código de 6 dígitos para seu e-mail'}
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
              {needsEmailConfirmation && (
                <button
                  onClick={handleResendConfirmation}
                  className="mt-2 text-sm text-primary hover:text-primary/80 underline font-medium"
                  disabled={isLoading}
                >
                  Reenviar e-mail de confirmação
                </button>
              )}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-success text-sm">{success}</p>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <Input
                type="email"
                label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                isLoading={isLoading}
              >
                Enviar código
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="text"
                  label="Código de 6 dígitos"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                  maxLength={6}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enviado para: {email}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                isLoading={isLoading}
                disabled={code.length !== 6}
              >
                Entrar
              </Button>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                  disabled={isLoading}
                >
                  Reenviar código
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Usar outro e-mail
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Não tem uma conta?{' '}
              <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Cadastre-se
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

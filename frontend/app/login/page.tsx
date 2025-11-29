'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/user/resend-email-confirmation/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao reenviar e-mail de confirmação');
      }
      
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
      router.push('/dashboard');
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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {step === 'email' ? 'Bem-vindo de volta!' : 'Digite o código'}
          </CardTitle>
          <p className="text-gray-600 text-center mt-2">
            {step === 'email' 
              ? 'Entre com seu e-mail para receber o código de acesso'
              : 'Enviamos um código de 6 dígitos para seu e-mail'}
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
              {needsEmailConfirmation && (
                <button
                  onClick={handleResendConfirmation}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline font-medium"
                  disabled={isLoading}
                >
                  Reenviar e-mail de confirmação
                </button>
              )}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{success}</p>
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
                className="w-full"
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
                <p className="text-sm text-gray-500 mt-1">
                  Enviado para: {email}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                disabled={code.length !== 6}
              >
                Entrar
              </Button>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
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
                  className="text-sm text-gray-600 hover:text-gray-700 transition-colors"
                >
                  Usar outro e-mail
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Não tem uma conta?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                Cadastre-se
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

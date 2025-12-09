'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validações
    if (formData.name.length < 5) {
      setError('Nome deve ter pelo menos 5 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      await register(formData.name, formData.email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4">
        <Card className="w-full max-w-md border-primary/20 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="text-4xl">🧪</div>
              <h1 className="text-2xl font-bold text-primary">Facexp</h1>
            </div>
            <CardTitle className="text-center text-success">
              Conta criada com sucesso!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-success font-medium">
                Enviamos um e-mail de confirmação para <strong>{formData.email}</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
              </p>
            </div>
            <Button
              onClick={() => router.push('/login')}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Ir para login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 py-8">
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="text-4xl">🧪</div>
            <h1 className="text-2xl font-bold text-primary">Facexp</h1>
            <span className="ml-2 px-2 py-0.5 bg-science-500/10 text-science-700 text-xs font-mono rounded border border-science-500/20">
              DOE
            </span>
          </div>
          <CardTitle className="text-center">Criar conta</CardTitle>
          <p className="text-muted-foreground text-center mt-2">
            Preencha seus dados para começar
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              name="name"
              label="Nome completo"
              placeholder="João da Silva"
              value={formData.name}
              onChange={handleChange}
              required
              autoFocus
            />

            <Input
              type="email"
              name="email"
              label="E-mail"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              isLoading={isLoading}
            >
              Criar conta
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Faça login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

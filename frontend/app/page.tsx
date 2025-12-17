'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/experiments');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground font-mono text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 px-4">
      <div className="text-center max-w-3xl">
        {/* Logo/Brand */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold tracking-tight text-slate-900 mb-2">
            Facexp
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm font-mono">
            <span className="px-3 py-1.5 rounded-md bg-science-500/20 text-science-800 font-semibold border border-science-500/30">
              Design of Experiments
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-700 font-medium">DOE Platform</span>
          </div>
        </div>

        {/* Hero Text */}
        <p className="text-xl text-slate-700 mb-12 leading-relaxed">
          Plataforma profissional para planejamento, execução e análise de
          <span className="font-bold text-slate-900"> experimentos fatoriais</span>.
          Otimize processos com metodologia científica.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 border-2 border-primary text-primary font-medium rounded-lg hover:bg-accent transition-colors"
          >
            Criar conta
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-lg shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="text-3xl mb-3">🧪</div>
            <h3 className="font-bold text-slate-900 mb-2 text-lg">Design of Experiments</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Crie e gerencie experimentos fatoriais com interface intuitiva
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-bold text-slate-900 mb-2 text-lg">Análise Estatística</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Analise resultados com ferramentas estatísticas avançadas
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="text-3xl mb-3">🔬</div>
            <h3 className="font-bold text-slate-900 mb-2 text-lg">Metodologia Científica</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Baseado em metodologias comprovadas de DOE fatorial
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


"""
Script de exemplo para testar o endpoint de análise estatística.

Este script demonstra como usar o endpoint /api/experiments/{slug}/analysis/
com um experimento de exemplo.

Para executar:
1. Crie um experimento com fatores e variáveis de resposta
2. Gere runs e preencha os valores de resposta
3. Execute: python check_analysis.py <experiment-slug>
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from experiments.models import Experiment, Factor, ResponseVariable, ExperimentRun
from experiments.services import ExperimentAnalysisService
import json


def create_example_experiment():
    """
    Cria um experimento de exemplo 2^3 (3 fatores, 2 níveis cada).
    
    Design: Fatorial Completo 2^3
    Fatores: A (Temperature), B (Pressure), C (Time)
    Resposta: Yield (%)
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Buscar ou criar usuário de teste
    user, _ = User.objects.get_or_create(
        username='test_user',
        defaults={'email': 'test@example.com'}
    )
    
    # Criar experimento
    experiment = Experiment.objects.create(
        title='Otimização de Processo - Teste',
        description='Experimento fatorial 2^3 para teste de análise estatística',
        design_type=Experiment.DesignType.FULL_FACTORIAL,
        status=Experiment.Status.DATA_COLLECTION,
        owner=user,
        replicates=1
    )
    
    # Criar fatores
    factor_a = Factor.objects.create(
        experiment=experiment,
        name='Temperature',
        symbol='A',
        data_type=Factor.DataType.QUANTITATIVE,
        levels_config=[-1, 1]  # Low e High
    )
    
    factor_b = Factor.objects.create(
        experiment=experiment,
        name='Pressure',
        symbol='B',
        data_type=Factor.DataType.QUANTITATIVE,
        levels_config=[-1, 1]
    )
    
    factor_c = Factor.objects.create(
        experiment=experiment,
        name='Time',
        symbol='C',
        data_type=Factor.DataType.QUANTITATIVE,
        levels_config=[-1, 1]
    )
    
    # Criar variável de resposta
    response = ResponseVariable.objects.create(
        experiment=experiment,
        name='Yield',
        unit='%',
        optimization_goal=ResponseVariable.OptimizationGoal.MAXIMIZE
    )
    
    # Criar runs com dados simulados
    # Design: 2^3 = 8 runs
    runs_data = [
        # std, run, A, B, C, Yield
        (1, 3, -1, -1, -1, 60.2),
        (2, 7, 1, -1, -1, 72.5),
        (3, 1, -1, 1, -1, 54.8),
        (4, 5, 1, 1, -1, 83.1),
        (5, 2, -1, -1, 1, 61.5),
        (6, 8, 1, -1, 1, 88.4),
        (7, 4, -1, 1, 1, 56.2),
        (8, 6, 1, 1, 1, 95.7),
    ]
    
    for std, run, a, b, c, yield_val in runs_data:
        ExperimentRun.objects.create(
            experiment=experiment,
            standard_order=std,
            run_order=run,
            replicate_number=1,
            is_center_point=False,
            factor_values={
                str(factor_a.id): a,
                str(factor_b.id): b,
                str(factor_c.id): c
            },
            response_values={
                str(response.id): yield_val
            }
        )
    
    print(f"✅ Experimento criado: {experiment.slug}")
    print(f"   Fatores: {experiment.factors.count()}")
    print(f"   Variáveis de resposta: {experiment.response_variables.count()}")
    print(f"   Runs: {experiment.runs.count()}")
    
    return experiment


def test_analysis_service(experiment):
    """
    Testa o service de análise estatística.
    """
    print(f"\n🔬 Testando análise do experimento: {experiment.title}")
    print("=" * 70)
    
    try:
        # Inicializar service
        service = ExperimentAnalysisService(experiment)
        
        # Calcular análise
        results = service.compute_full_analysis()
        
        # Exibir resultados
        print("\n📊 METADATA")
        print(f"   Experimento: {results['metadata']['experiment_title']}")
        print(f"   Design: {results['metadata']['design_type']}")
        print(f"   Fatores: {results['metadata']['num_factors']}")
        print(f"   Runs: {results['metadata']['num_runs']}")
        
        print("\n📈 SUMMARY")
        print(f"   Média: {results['summary']['mean']:.2f}")
        print(f"   Desvio: {results['summary']['std']:.2f}")
        print(f"   CV: {results['summary']['cv']:.2f}%")
        
        print("\n📋 ANOVA")
        print(f"   R²: {results['anova']['r_squared']:.4f}")
        print(f"   R² Ajustado: {results['anova']['r_squared_adj']:.4f}")
        print(f"   F-statistic: {results['anova']['model_f_statistic']:.2f}")
        print(f"   p-value: {results['anova']['model_p_value']:.6f}")
        
        print("\n   Tabela ANOVA:")
        for row in results['anova']['table']:
            source = row['source'].ljust(15)
            f_val = f"{row['f_value']:.2f}" if row['f_value'] else "---"
            p_val = f"{row['p_value']:.4f}" if row['p_value'] else "---"
            sig = "***" if row['is_significant'] else ""
            print(f"     {source} F={f_val.rjust(8)}  p={p_val.rjust(8)}  {sig}")
        
        print("\n🎯 REGRESSION")
        print(f"   Equação: {results['regression']['equation']}")
        print(f"   RMSE: {results['regression']['rmse']:.2f}")
        
        print("\n⚡ EFEITOS PRINCIPAIS")
        for symbol, data in results['effects']['main_effects'].items():
            print(f"   {symbol} ({data['factor']}): {data['effect']:.2f}")
            print(f"      Baixo: {data['mean_low']:.2f}  Alto: {data['mean_high']:.2f}")
        
        print("\n🔀 INTERAÇÕES")
        for key, data in results['effects']['interactions'].items():
            print(f"   {key}: {data['effect']:.2f}")
        
        print("\n📐 RESÍDUOS")
        print(f"   Normalidade (Shapiro-Wilk):")
        print(f"      Statistic: {results['residuals']['normality_test']['statistic']:.4f}")
        print(f"      p-value: {results['residuals']['normality_test']['p_value']:.4f}")
        print(f"      Normal? {results['residuals']['normality_test']['is_normal']}")
        
        print("\n✅ Análise concluída com sucesso!")
        
        # Salvar JSON completo
        output_file = f"{experiment.slug}_analysis.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Resultados salvos em: {output_file}")
        
        return results
        
    except Exception as e:
        print(f"\n❌ Erro ao calcular análise: {str(e)}")
        raise


def test_endpoint_api():
    """
    Simula chamada ao endpoint da API.
    """
    print("\n🌐 TESTANDO ENDPOINT DA API")
    print("=" * 70)
    
    from django.test import RequestFactory
    from experiments.views import ExperimentViewSet
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    user = User.objects.get(username='test_user')
    
    # Buscar experimento
    experiment = Experiment.objects.filter(owner=user).first()
    
    if not experiment:
        print("❌ Nenhum experimento encontrado")
        return
    
    # Simular request
    factory = RequestFactory()
    request = factory.get(f'/api/experiments/{experiment.slug}/analysis/')
    request.user = user
    
    # Chamar view
    view = ExperimentViewSet.as_view({'get': 'experiment_analysis'})
    response = view(request, slug=experiment.slug)
    
    print(f"   Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("   ✅ Endpoint funcionando corretamente!")
        print(f"   Tamanho da resposta: {len(str(response.data))} bytes")
    else:
        print(f"   ❌ Erro: {response.data}")


if __name__ == '__main__':
    import sys
    
    print("🧪 TESTE DO ENDPOINT DE ANÁLISE ESTATÍSTICA")
    print("=" * 70)
    
    # Verificar se deve criar experimento de exemplo
    if len(sys.argv) > 1 and sys.argv[1] == '--create':
        experiment = create_example_experiment()
    else:
        # Buscar experimento existente
        if len(sys.argv) > 1:
            slug = sys.argv[1]
            try:
                experiment = Experiment.objects.get(slug=slug)
            except Experiment.DoesNotExist:
                print(f"❌ Experimento '{slug}' não encontrado")
                print("\nUso:")
                print("  python check_analysis.py --create  # Criar experimento de teste")
                print("  python check_analysis.py <slug>    # Analisar experimento existente")
                sys.exit(1)
        else:
            # Usar primeiro experimento disponível
            experiment = Experiment.objects.first()
            if not experiment:
                print("❌ Nenhum experimento encontrado")
                print("\nCrie um experimento com: python check_analysis.py --create")
                sys.exit(1)
    
    # Executar testes
    try:
        results = test_analysis_service(experiment)
        test_endpoint_api()
        
        print("\n" + "=" * 70)
        print("🎉 TODOS OS TESTES PASSARAM!")
        print(f"\n📍 URL do endpoint: /api/experiments/{experiment.slug}/analysis/")
        
    except Exception as e:
        print(f"\n💥 Erro durante os testes: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

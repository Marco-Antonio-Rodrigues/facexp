"""
Script para testar o cálculo corrigido de ANOVA com fatores categóricos.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from experiments.models import Experiment
from experiments.services import ExperimentAnalysisService

# Buscar o experimento mais recente
experiment = Experiment.objects.order_by('-created_at').first()

if not experiment:
    print("❌ Nenhum experimento encontrado")
    exit(1)

print("=" * 80)
print(f"🔬 Testando ANOVA com fatores categóricos")
print("=" * 80)
print(f"\nExperimento: {experiment.title}")
print(f"Slug: {experiment.slug}")
print()

# Listar fatores e seus níveis
print("📊 FATORES:")
for factor in experiment.factors.all():
    print(f"  • {factor.name} ({factor.symbol})")
    print(f"    - Tipo: {factor.data_type}")
    print(f"    - Níveis: {factor.levels_config}")
    print(f"    - Quantidade de níveis: {len(factor.levels_config)}")
print()

# Verificar runs
print(f"📋 RUNS: {experiment.runs.count()} total")
completed = sum(1 for run in experiment.runs.all() if run.response_values)
print(f"  • Com respostas: {completed}")
print()

# Calcular análise
try:
    print("🔄 Calculando ANOVA...")
    service = ExperimentAnalysisService(experiment)
    results = service.compute_full_analysis()
    
    print("\n✅ ANOVA CALCULADA COM SUCESSO!")
    print("=" * 80)
    
    # Mostrar tabela ANOVA
    print("\n📊 TABELA ANOVA:")
    print("-" * 80)
    print(f"{'Fonte':<20} {'GL':>6} {'SQ':>15} {'MQ':>15} {'F':>10} {'p-valor':>12}")
    print("-" * 80)
    
    for row in results['anova']['table']:
        source = row['source']
        df = row['df'] if row['df'] is not None else '-'
        sq = f"{row['sum_sq']:.4f}" if row['sum_sq'] is not None else '-'
        mq = f"{row['mean_sq']:.4f}" if row['mean_sq'] is not None else '-'
        f_val = f"{row['f_value']:.4f}" if row['f_value'] is not None else '-'
        p_val = f"{row['p_value']:.4f}" if row['p_value'] is not None else '-'
        
        sig = " ***" if row['is_significant'] else ""
        print(f"{source:<20} {str(df):>6} {sq:>15} {mq:>15} {f_val:>10} {p_val:>12}{sig}")
    
    print("-" * 80)
    print()
    
    # Qualidade do modelo
    print("📈 QUALIDADE DO MODELO:")
    print(f"  • R²:           {results['anova']['r_squared']:.4f}")
    print(f"  • R² Ajustado:  {results['anova']['r_squared_adj']:.4f}")
    print(f"  • F-statistic:  {results['anova']['model_f_statistic']:.4f}")
    print(f"  • p-value:      {results['anova']['model_p_value']:.6f}")
    print()
    
    print("=" * 80)
    print("✅ TESTE CONCLUÍDO!")
    print()
    print("💡 Agora recarregue a página de análise no navegador para ver os resultados atualizados.")
    print()
    
except Exception as e:
    print(f"\n❌ ERRO: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

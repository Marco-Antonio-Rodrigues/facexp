#!/usr/bin/env python
"""Script para verificar e limpar dados do experimento."""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from experiments.models import Experiment, ExperimentRun

# Busca o experimento
slug = 'experimento-fatorial-de-3-fatores'
exp = Experiment.objects.get(slug=slug)

print(f"Experimento: {exp.name}")
print(f"Replicates configurado: {exp.replicates}")
print(f"Status: {exp.status}")
print()

# Lista todas as runs
runs = ExperimentRun.objects.filter(experiment=exp).order_by('standard_order', 'replicate_number')
print(f"Total de runs: {runs.count()}")
print()

# Agrupa por standard_order
from collections import defaultdict
groups = defaultdict(list)
for run in runs:
    groups[run.standard_order].append(run)

print("Combinações e réplicas:")
for std_order in sorted(groups.keys()):
    runs_in_group = groups[std_order]
    print(f"  Standard Order {std_order}: {len(runs_in_group)} réplicas")
    for run in runs_in_group:
        print(f"    - Réplica {run.replicate_number}, Run Order: {run.run_order}")

print()
print("Para deletar as runs antigas e gerar novas:")
print("  ExperimentRun.objects.filter(experiment__slug='experimento-fatorial-de-3-fatores').delete()")

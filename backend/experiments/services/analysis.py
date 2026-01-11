"""
Serviço de análise estatística para experimentos fatoriais.

Este módulo contém toda a lógica de cálculo estatístico para DOE:
- ANOVA
- Regressão Linear
- Efeitos Principais e Interações
- Análise de Resíduos
- Dados para gráficos

Os cálculos são feitos em tempo real e NÃO são persistidos no banco de dados.
"""
import logging
import numpy as np
import pandas as pd
from scipy import stats

logger = logging.getLogger(__name__)
from typing import Dict, List, Any, Optional
from django.db.models import QuerySet


def clean_nan_values(obj):
    """
    Recursively clean NaN, inf, and -inf values from nested data structures.
    Replaces them with None for JSON compliance.
    
    Args:
        obj: Any Python object (dict, list, float, etc.)
    
    Returns:
        Same structure with NaN/inf values replaced by None
    """
    if isinstance(obj, dict):
        return {k: clean_nan_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan_values(item) for item in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    elif isinstance(obj, np.ndarray):
        return clean_nan_values(obj.tolist())
    elif pd.isna(obj):
        return None
    return obj


class ExperimentAnalysisService:
    """
    Service para calcular análises estatísticas de experimentos fatoriais.
    """
    
    def __init__(self, experiment):
        """
        Initialize service with experiment instance.
        
        Args:
            experiment: Experiment model instance
        """
        self.experiment = experiment
        self._validate_data()
        self._prepare_dataframes()
    
    def _validate_data(self):
        """Valida se há dados suficientes para análise."""
        runs = self.experiment.runs.filter(is_excluded=False)
        factors = self.experiment.factors.all()
        responses = self.experiment.response_variables.all()
        
        if not runs.exists():
            raise ValueError("Experimento não possui runs")
        
        if not factors.exists():
            raise ValueError("Experimento não possui fatores")
        
        if not responses.exists():
            raise ValueError("Experimento não possui variáveis de resposta")
        
        # Verificar se há runs completos
        complete_runs = [run for run in runs if run.is_complete]
        if len(complete_runs) == 0:
            raise ValueError("Nenhum run possui todas as respostas preenchidas")
        
        # Verificar número mínimo de runs
        num_factors = factors.count()
        min_runs = 2 ** num_factors  # Mínimo para fatorial completo 2^k
        
        if len(complete_runs) < min_runs:
            raise ValueError(
                f"Número insuficiente de runs completos. "
                f"Mínimo: {min_runs}, Atual: {len(complete_runs)}"
            )
    
    def _prepare_dataframes(self):
        """Prepara DataFrames com os dados do experimento."""
        # Buscar dados
        runs = self.experiment.runs.filter(is_excluded=False).order_by('standard_order')
        factors = list(self.experiment.factors.all().order_by('id'))
        responses = list(self.experiment.response_variables.all().order_by('id'))
        
        # Criar DataFrame de design (X)
        design_data = []
        for run in runs:
            row = {'run_order': run.run_order, 'standard_order': run.standard_order}
            for factor in factors:
                factor_value = run.factor_values.get(str(factor.id))
                if factor_value is not None:
                    row[factor.symbol] = float(factor_value)
            design_data.append(row)
        
        self.df_design = pd.DataFrame(design_data)
        
        # Criar DataFrame de respostas (Y)
        response_data = []
        for run in runs:
            row = {'run_order': run.run_order}
            for response in responses:
                response_value = run.response_values.get(str(response.id))
                if response_value is not None:
                    row[response.name] = float(response_value)
            response_data.append(row)
        
        self.df_responses = pd.DataFrame(response_data)
        
        # Metadata
        self.factors = factors
        self.responses = responses
        self.num_runs = len(runs)
    
    def compute_full_analysis(self, response_variable_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Calcula análise completa do experimento.
        
        Args:
            response_variable_name: Nome da variável de resposta a analisar.
                                   Se None, usa a primeira disponível.
        
        Returns:
            Dictionary com todas as seções de análise
        """
        logger.info(f"compute_full_analysis chamado com response_variable_name='{response_variable_name}'")
        
        # Selecionar variável de resposta
        if response_variable_name is None:
            response_variable_name = self.responses[0].name
            logger.info(f"Nenhuma variável especificada, usando a primeira: '{response_variable_name}'")
        
        logger.info(f"Variáveis de resposta disponíveis: {list(self.df_responses.columns)}")
        if response_variable_name not in self.df_responses.columns:
            logger.error(f"Variável '{response_variable_name}' não encontrada nas colunas: {list(self.df_responses.columns)}")
            raise ValueError(f"Variável de resposta '{response_variable_name}' não encontrada")
        
        # Calcular todas as seções
        results = {
            'metadata': self._compute_metadata(response_variable_name),
            'summary': self._compute_summary(response_variable_name),
            'anova': self._compute_anova(response_variable_name),
            'regression': self._compute_regression(response_variable_name),
            'effects': self._compute_effects(response_variable_name),
            'residuals': self._compute_residuals_analysis(response_variable_name),
            'plots_data': self._prepare_plots_data(response_variable_name),
            'interaction_data': self._compute_interaction_plot_data(response_variable_name),
            'design_matrix': self._compute_design_matrix_table(response_variable_name)
        }
        
        # Clean NaN values for JSON compliance
        results = clean_nan_values(results)
        
        return results
    
    def _compute_metadata(self, response_name: str) -> Dict[str, Any]:
        """Retorna metadados do experimento."""
        return {
            'experiment_id': self.experiment.id,
            'experiment_slug': self.experiment.slug,
            'experiment_title': self.experiment.title,
            'design_type': self.experiment.design_type,
            'response_variable': response_name,
            'num_factors': len(self.factors),
            'num_runs': self.num_runs,
            'factors': [
                {
                    'id': f.id,
                    'name': f.name,
                    'symbol': f.symbol,
                    'data_type': f.data_type
                }
                for f in self.factors
            ]
        }
    
    def _compute_summary(self, response_name: str) -> Dict[str, Any]:
        """Calcula estatísticas resumidas."""
        y = self.df_responses[response_name].values
        
        # Remove NaN values from the data
        y = y[~np.isnan(y)]
        
        if len(y) == 0:
            raise ValueError(f"Nenhum valor válido encontrado para '{response_name}'")
        
        # Estatísticas descritivas
        mean_val = float(np.mean(y))
        std_val = float(np.std(y, ddof=1)) if len(y) > 1 else 0.0
        
        summary = {
            'mean': mean_val,
            'std': std_val,
            'min': float(np.min(y)),
            'max': float(np.max(y)),
            'range': float(np.max(y) - np.min(y)),
            'cv': float(std_val / mean_val * 100) if mean_val != 0 else None
        }
        
        return summary
    
    def _compute_anova(self, response_name: str) -> Dict[str, Any]:
        """
        Calcula tabela ANOVA.
        
        Usa regressão linear para calcular Sum of Squares de cada fator.
        
        IMPORTANTE: Na ANOVA clássica de DOE, TODOS os fatores são tratados como
        categóricos (níveis discretos), independentemente da classificação do usuário.
        Isso garante compatibilidade com a literatura clássica de Design of Experiments.
        """
        try:
            from statsmodels.formula.api import ols
            from statsmodels.stats.anova import anova_lm
        except ImportError:
            raise ImportError("statsmodels é necessário para cálculo de ANOVA")
        
        # Preparar dados
        logger.info(f"[ANOVA] Preparando dados para response_name='{response_name}'")
        df = pd.concat([self.df_design, self.df_responses[[response_name]]], axis=1)
        
        # Renomear colunas que conflitam com funções do Patsy (C, I, Q)
        # Criar mapeamento de símbolos originais para aliases seguros
        patsy_reserved = ['C', 'I', 'Q']
        symbol_mapping = {}
        for f in self.factors:
            if f.symbol in patsy_reserved:
                safe_symbol = f"_{f.symbol}_"
                symbol_mapping[f.symbol] = safe_symbol
                df = df.rename(columns={f.symbol: safe_symbol})
            else:
                symbol_mapping[f.symbol] = f.symbol
        
        logger.info(f"[ANOVA] Mapeamento de símbolos: {symbol_mapping}")
        
        # Criar fórmula de regressão
        # ANOVA: SEMPRE trata fatores como categóricos (níveis discretos)
        factor_symbols = [f"C(Q('{symbol_mapping[f.symbol]}'))" for f in self.factors]
        # Usar Q() para suportar nomes com espaços e caracteres especiais
        formula = f"Q('{response_name}') ~ " + " + ".join(factor_symbols)
        logger.info(f"[ANOVA] Fórmula gerada: {formula}")
        logger.info(f"[ANOVA] Colunas do dataframe: {list(df.columns)}")
        logger.info(f"[ANOVA] Shape do dataframe: {df.shape}")
        
        # Adicionar interações de 2 fatores se houver mais de 1 fator
        if len(factor_symbols) > 1:
            interactions = [f"{f1}:{f2}" for i, f1 in enumerate(factor_symbols) 
                          for f2 in factor_symbols[i+1:]]
            if interactions:
                formula += " + " + " + ".join(interactions)
        
        # Fit do modelo
        model = ols(formula, data=df).fit()
        anova_table = anova_lm(model, typ=2)
        
        # Criar mapeamento de símbolos para nomes completos dos fatores
        # Ex: F -> Temperatura (F), M -> Material (M)
        symbol_to_name = {f.symbol: f"{f.name} ({f.symbol})" for f in self.factors}
        
        # Formatar tabela ANOVA
        anova_results = []
        total_ss = 0.0  # Para calcular SS Total
        
        for source, row in anova_table.iterrows():
            # Limpar nome da fonte: remover C() wrapper do Patsy
            # C(F) -> F, C(M) -> M, C(F):C(M) -> F:M
            clean_source = source.replace('C(', '').replace(')', '')
            
            # Substituir símbolos por "Nome (Símbolo)"
            # F -> Temperatura (F)
            # M -> Material (M)
            # F:M -> Temperatura (F):Material (M)
            display_source = clean_source
            for symbol, full_name in symbol_to_name.items():
                display_source = display_source.replace(symbol, full_name)
            
            # Safely extract values, handling NaN
            df_val = int(row['df']) if 'df' in row.index and not pd.isna(row['df']) else None
            sum_sq_val = float(row['sum_sq']) if 'sum_sq' in row.index and not pd.isna(row['sum_sq']) else None
            
            # Acumular SS Total
            if sum_sq_val is not None:
                total_ss += sum_sq_val
            
            # Calculate mean_sq safely
            mean_sq_val = None
            if df_val is not None and df_val > 0 and sum_sq_val is not None:
                mean_sq_val = float(sum_sq_val / df_val)
            
            f_val = float(row['F']) if 'F' in row.index and not pd.isna(row['F']) else None
            p_val = float(row['PR(>F)']) if 'PR(>F)' in row.index and not pd.isna(row['PR(>F)']) else None
            
            anova_results.append({
                'source': display_source,
                'df': df_val,
                'sum_sq': sum_sq_val,
                'mean_sq': mean_sq_val,
                'f_value': f_val,
                'p_value': p_val,
                'is_significant': p_val < 0.05 if p_val is not None else False
            })
        
        # Adicionar linha Total ao final
        # Total GL = soma de todos os GL (n - 1)
        total_df = sum(row['df'] for row in anova_results if row['df'] is not None)
        
        anova_results.append({
            'source': 'Total',
            'df': total_df,
            'sum_sq': total_ss,
            'mean_sq': None,  # Não se calcula MQ para Total
            'f_value': None,
            'p_value': None,
            'is_significant': False
        })
        
        # Safely extract model statistics
        model_f = float(model.fvalue) if not pd.isna(model.fvalue) else None
        model_p = float(model.f_pvalue) if not pd.isna(model.f_pvalue) else None
        r_sq = float(model.rsquared) if not pd.isna(model.rsquared) else None
        r_sq_adj = float(model.rsquared_adj) if not pd.isna(model.rsquared_adj) else None
        
        return {
            'table': anova_results,
            'model_f_statistic': model_f,
            'model_p_value': model_p,
            'r_squared': r_sq,
            'r_squared_adj': r_sq_adj
        }
    
    def _compute_regression(self, response_name: str) -> Dict[str, Any]:
        """Calcula coeficientes de regressão."""
        try:
            from statsmodels.formula.api import ols
        except ImportError:
            raise ImportError("statsmodels é necessário para regressão")
        
        # Preparar dados
        df = pd.concat([self.df_design, self.df_responses[[response_name]]], axis=1)
        
        # Renomear colunas que conflitam com funções do Patsy (C, I, Q)
        patsy_reserved = ['C', 'I', 'Q']
        symbol_mapping = {}
        for f in self.factors:
            if f.symbol in patsy_reserved:
                safe_symbol = f"_{f.symbol}_"
                symbol_mapping[f.symbol] = safe_symbol
                df = df.rename(columns={f.symbol: safe_symbol})
            else:
                symbol_mapping[f.symbol] = f.symbol
        
        # Criar fórmula (usar mesma lógica da ANOVA para consistência)
        factor_symbols = []
        for f in self.factors:
            safe_sym = symbol_mapping[f.symbol]
            if f.data_type == 'categorical':
                # Fator categórico: tratamento discreto
                factor_symbols.append(f"C(Q('{safe_sym}'))")
            else:
                # Fator quantitativo: usar valores reais
                factor_symbols.append(f"Q('{safe_sym}')")
        
        # Usar Q() para suportar nomes com espaços e caracteres especiais
        formula = f"Q('{response_name}') ~ " + " + ".join(factor_symbols)
        logger.info(f"[REGRESSÃO] Fórmula gerada: {formula}")
        logger.info(f"[REGRESSÃO] Colunas do dataframe: {list(df.columns)}")
        
        # Adicionar interações
        if len(factor_symbols) > 1:
            interactions = [f"{f1}:{f2}" for i, f1 in enumerate(factor_symbols) 
                          for f2 in factor_symbols[i+1:]]
            if interactions:
                formula += " + " + " + ".join(interactions)
        
        # Fit do modelo
        model = ols(formula, data=df).fit()
        
        # Criar mapeamento de símbolo para nome descritivo
        symbol_to_name = {f.symbol: f"{f.name} ({f.symbol})" for f in self.factors}
        
        # Extrair coeficientes
        coefficients = []
        for i, (term, coef) in enumerate(model.params.items()):
            std_err = model.bse.iloc[i]
            t_value = model.tvalues.iloc[i]
            p_value = model.pvalues.iloc[i]
            conf_int = model.conf_int().iloc[i]
            
            # Limpar notação C() e substituir por nomes descritivos
            clean_term = term.replace('C(', '').replace(')', '')
            
            # Substituir símbolos por nomes descritivos
            display_term = clean_term
            for symbol, name in symbol_to_name.items():
                display_term = display_term.replace(symbol, name)
            
            # Safely handle NaN values
            coef_val = float(coef) if not pd.isna(coef) else None
            std_err_val = float(std_err) if not pd.isna(std_err) else None
            t_val = float(t_value) if not pd.isna(t_value) else None
            p_val = float(p_value) if not pd.isna(p_value) else None
            ci_lower_val = float(conf_int[0]) if not pd.isna(conf_int[0]) else None
            ci_upper_val = float(conf_int[1]) if not pd.isna(conf_int[1]) else None
            
            coefficients.append({
                'term': display_term,
                'coefficient': coef_val,
                'std_error': std_err_val,
                't_value': t_val,
                'p_value': p_val,
                'ci_lower': ci_lower_val,
                'ci_upper': ci_upper_val,
                'is_significant': p_val < 0.05 if p_val is not None else False
            })
        
        # Criar equação legível
        equation_parts = []
        for coef_data in coefficients:
            term = coef_data['term']
            value = coef_data['coefficient']
            
            if value is not None:
                if term == 'Intercept':
                    equation_parts.append(f"{value:.3f}")
                else:
                    sign = '+' if value >= 0 else ''
                    equation_parts.append(f"{sign}{value:.3f}*{term}")
        
        equation = f"{response_name} = " + " ".join(equation_parts)
        
        # Safely extract model statistics
        r_sq = float(model.rsquared) if not pd.isna(model.rsquared) else None
        r_sq_adj = float(model.rsquared_adj) if not pd.isna(model.rsquared_adj) else None
        rmse = float(np.sqrt(model.mse_resid)) if not pd.isna(model.mse_resid) else None
        aic_val = float(model.aic) if not pd.isna(model.aic) else None
        bic_val = float(model.bic) if not pd.isna(model.bic) else None
        
        return {
            'coefficients': coefficients,
            'equation': equation,
            'r_squared': r_sq,
            'r_squared_adj': r_sq_adj,
            'rmse': rmse,
            'aic': aic_val,
            'bic': bic_val
        }
    
    def _compute_effects(self, response_name: str) -> Dict[str, Any]:
        """Calcula efeitos principais e interações."""
        # Efeitos principais (diferença entre níveis)
        main_effects = {}
        
        for factor in self.factors:
            symbol = factor.symbol
            
            # Get unique levels for this factor
            levels = sorted(self.df_design[symbol].unique())
            
            if len(levels) < 2:
                continue  # Skip if only one level
            
            # Calculate means for each level
            level_means = []
            for level in levels:
                y_at_level = self.df_responses.loc[
                    self.df_design[symbol] == level, 
                    response_name
                ].values
                
                # Remove NaN values
                y_at_level = y_at_level[~np.isnan(y_at_level)]
                
                if len(y_at_level) > 0:
                    level_means.append(float(np.mean(y_at_level)))
                else:
                    level_means.append(None)
            
            # Calculate effect as range (max - min mean)
            valid_means = [m for m in level_means if m is not None]
            if len(valid_means) >= 2:
                effect = float(max(valid_means) - min(valid_means))
                
                main_effects[symbol] = {
                    'factor': factor.name,
                    'symbol': symbol,
                    'effect': effect,
                    'levels': [float(l) for l in levels],
                    'means': level_means
                }
        
        # Interações de 2 fatores
        interactions = {}
        factor_symbols = [f.symbol for f in self.factors]
        
        if len(factor_symbols) > 1:
            for i, f1 in enumerate(factor_symbols):
                for f2 in factor_symbols[i+1:]:
                    # Get levels for both factors
                    levels_f1 = sorted(self.df_design[f1].unique())
                    levels_f2 = sorted(self.df_design[f2].unique())
                    
                    # Calculate cell means for all combinations
                    cell_means = {}
                    for lv1 in levels_f1:
                        for lv2 in levels_f2:
                            mask = (self.df_design[f1] == lv1) & (self.df_design[f2] == lv2)
                            y_cell = self.df_responses.loc[mask, response_name].values
                            y_cell = y_cell[~np.isnan(y_cell)]
                            
                            if len(y_cell) > 0:
                                cell_means[f'{f1}={lv1},{f2}={lv2}'] = float(np.mean(y_cell))
                    
                    # For 2-level factors, calculate traditional interaction effect
                    # For multi-level factors, calculate range of cell means
                    if len(cell_means) > 0:
                        cell_values = list(cell_means.values())
                        effect = float(max(cell_values) - min(cell_values))
                        
                        interaction_key = f"{f1}:{f2}"
                        interactions[interaction_key] = {
                            'factors': [f1, f2],
                            'effect': effect,
                            'cell_means': cell_means
                        }
        
        return {
            'main_effects': main_effects,
            'interactions': interactions
        }
    
    def _compute_residuals_analysis(self, response_name: str) -> Dict[str, Any]:
        """Calcula análise de resíduos."""
        try:
            from statsmodels.formula.api import ols
        except ImportError:
            raise ImportError("statsmodels é necessário para análise de resíduos")
        
        # Preparar dados e fit do modelo
        logger.info(f"[RESÍDUOS] Preparando dados para response_name='{response_name}'")
        df = pd.concat([self.df_design, self.df_responses[[response_name]]], axis=1)
        
        # Renomear colunas que conflitam com funções do Patsy (C, I, Q)
        patsy_reserved = ['C', 'I', 'Q']
        symbol_mapping = {}
        for f in self.factors:
            if f.symbol in patsy_reserved:
                safe_symbol = f"_{f.symbol}_"
                symbol_mapping[f.symbol] = safe_symbol
                df = df.rename(columns={f.symbol: safe_symbol})
            else:
                symbol_mapping[f.symbol] = f.symbol
        
        factor_symbols = [f"C(Q('{symbol_mapping[f.symbol]}'))" for f in self.factors]
        # Usar Q() para suportar nomes com espaços e caracteres especiais
        formula = f"Q('{response_name}') ~ " + " + ".join(factor_symbols)
        logger.info(f"[RESÍDUOS] Fórmula gerada: {formula}")
        logger.info(f"[RESÍDUOS] Colunas do dataframe: {list(df.columns)}")
        logger.info(f"[ANOVA] Colunas do dataframe: {list(df.columns)}")
        logger.info(f"[ANOVA] Shape do dataframe: {df.shape}")
        logger.info(f"[RESÍDUOS] Fórmula gerada: {formula}")
        logger.info(f"[RESÍDUOS] Colunas do dataframe: {list(df.columns)}")
        
        if len(factor_symbols) > 1:
            interactions = [f"{f1}:{f2}" for i, f1 in enumerate(factor_symbols) 
                          for f2 in factor_symbols[i+1:]]
            if interactions:
                formula += " + " + " + ".join(interactions)
        
        model = ols(formula, data=df).fit()
        
        # Extrair resíduos e valores ajustados
        residuals = model.resid.values
        fitted = model.fittedvalues.values
        standardized_residuals = residuals / np.std(residuals, ddof=1)
        
        # Teste de normalidade (Shapiro-Wilk)
        shapiro_stat, shapiro_p = stats.shapiro(residuals)
        
        # Teste de Durbin-Watson (autocorrelação)
        from statsmodels.stats.stattools import durbin_watson
        dw_stat = durbin_watson(residuals)
        
        return {
            'residuals': residuals.tolist(),
            'fitted_values': fitted.tolist(),
            'standardized_residuals': standardized_residuals.tolist(),
            'normality_test': {
                'test': 'Shapiro-Wilk',
                'statistic': float(shapiro_stat),
                'p_value': float(shapiro_p),
                'is_normal': float(shapiro_p) > 0.05
            },
            'autocorrelation_test': {
                'test': 'Durbin-Watson',
                'statistic': float(dw_stat),
                'interpretation': 'no autocorrelation' if 1.5 < dw_stat < 2.5 else 'possible autocorrelation'
            },
            'residual_stats': {
                'mean': float(np.mean(residuals)),
                'std': float(np.std(residuals, ddof=1)),
                'min': float(np.min(residuals)),
                'max': float(np.max(residuals))
            }
        }
    
    def _prepare_plots_data(self, response_name: str) -> Dict[str, Any]:
        """Prepara dados formatados para os gráficos do frontend."""
        effects_data = self._compute_effects(response_name)
        residuals_data = self._compute_residuals_analysis(response_name)
        
        # Dados para gráfico de Pareto
        all_effects = []
        
        # Adicionar efeitos principais
        for symbol, data in effects_data['main_effects'].items():
            all_effects.append({
                'term': symbol,
                'effect': abs(data['effect']),
                'is_interaction': False
            })
        
        # Adicionar interações
        for key, data in effects_data['interactions'].items():
            all_effects.append({
                'term': key,
                'effect': abs(data['effect']),
                'is_interaction': True
            })
        
        # Ordenar por magnitude
        all_effects.sort(key=lambda x: x['effect'], reverse=True)
        
        # Calcular percentual acumulado para Pareto
        total_effect = sum(e['effect'] for e in all_effects)
        cumulative = []
        cumulative_sum = 0
        for e in all_effects:
            cumulative_sum += e['effect']
            cumulative.append((cumulative_sum / total_effect * 100) if total_effect > 0 else 0)
        
        # Gráfico de Pareto - formato esperado pelo frontend
        pareto_data = {
            'labels': [e['term'] for e in all_effects],
            'values': [e['effect'] for e in all_effects],
            'cumulative': cumulative
        }
        
        # Dados para Main Effects Plot - formato esperado pelo frontend
        main_effects_plot_data = {}
        for symbol, data in effects_data['main_effects'].items():
            main_effects_plot_data[symbol] = {
                'levels': data['levels'],
                'means': data['means']
            }
        
        # Dados para Interaction Plot (matriz de interações)
        interaction_plot_data = []
        for key, data in effects_data['interactions'].items():
            interaction_plot_data.append({
                'interaction': key,
                'factors': data['factors'],
                'cell_means': data['cell_means']
            })
        
        return {
            'pareto': pareto_data,
            'main_effects': main_effects_plot_data,
            'interactions': interaction_plot_data,
            'residuals': {
                'residuals': residuals_data['residuals'],
                'fitted': residuals_data['fitted_values'],
                'standardized': residuals_data['standardized_residuals']
            }
        }
    
    def _compute_interaction_plot_data(self, response_name: str) -> Dict[str, Any]:
        """
        Calcula dados para gráfico de interação dinâmico.
        
        Retorna todas as combinações possíveis de fatores para que o frontend
        possa permitir ao usuário escolher qual interação visualizar.
        
        Returns:
            Dict com dados estruturados para gráficos de interação
        """
        df = pd.concat([self.df_design, self.df_responses[[response_name]]], axis=1)
        
        # Estrutura: Para cada par de fatores (factor_x, factor_lines)
        # calcular médias e desvios padrão para cada combinação
        interaction_combinations = []
        
        for i, factor_x in enumerate(self.factors):
            for j, factor_lines in enumerate(self.factors):
                if i == j:
                    continue  # Skip same factor
                
                # Get unique levels for both factors
                x_levels = sorted(df[factor_x.symbol].unique())
                line_levels = sorted(df[factor_lines.symbol].unique())
                
                # Calculate means and std for each combination
                plot_data = {
                    'factor_x': {
                        'id': factor_x.id,
                        'name': factor_x.name,
                        'symbol': factor_x.symbol,
                        'levels': [float(lv) if isinstance(lv, (int, float)) else str(lv) for lv in x_levels]
                    },
                    'factor_lines': {
                        'id': factor_lines.id,
                        'name': factor_lines.name,
                        'symbol': factor_lines.symbol,
                        'levels': [float(lv) if isinstance(lv, (int, float)) else str(lv) for lv in line_levels]
                    },
                    'series': []
                }
                
                # For each level of the line factor, create a series
                for line_level in line_levels:
                    series_data = {
                        'name': f"{factor_lines.name} = {line_level}",
                        'level': float(line_level) if isinstance(line_level, (int, float)) else str(line_level),
                        'points': []
                    }
                    
                    # For each level of X axis
                    for x_level in x_levels:
                        # Filter data for this combination
                        mask = (df[factor_x.symbol] == x_level) & (df[factor_lines.symbol] == line_level)
                        y_values = df.loc[mask, response_name].values
                        y_values = y_values[~np.isnan(y_values)]
                        
                        if len(y_values) > 0:
                            mean_val = float(np.mean(y_values))
                            std_val = float(np.std(y_values, ddof=1)) if len(y_values) > 1 else 0.0
                            
                            series_data['points'].append({
                                'x': float(x_level) if isinstance(x_level, (int, float)) else str(x_level),
                                'y': mean_val,
                                'std': std_val,
                                'n': int(len(y_values)),
                                'raw_values': y_values.tolist()
                            })
                        else:
                            series_data['points'].append({
                                'x': float(x_level) if isinstance(x_level, (int, float)) else str(x_level),
                                'y': None,
                                'std': None,
                                'n': 0,
                                'raw_values': []
                            })
                    
                    plot_data['series'].append(series_data)
                
                interaction_combinations.append(plot_data)
        
        return {
            'combinations': interaction_combinations,
            'default_x': self.factors[0].symbol if len(self.factors) > 0 else None,
            'default_lines': self.factors[1].symbol if len(self.factors) > 1 else None
        }
    
    def _compute_design_matrix_table(self, response_name: str) -> Dict[str, Any]:
        """
        Calcula a tabela de sinais (design matrix) com valores codificados,
        interações, totais e efeitos.
        
        Returns:
            Dictionary com headers, runs, totais, médias e efeitos
        """
        # Buscar runs ordenados por standard_order
        runs = list(self.experiment.runs.filter(is_excluded=False).order_by('standard_order'))
        
        # Verificar se é um experimento 2^k (todos os fatores quantitativos com exatamente 2 níveis)
        is_two_level_factorial = True
        factor_level_mapping = {}  # {factor_id: {real_value: coded_value}}
        
        for factor in self.factors:
            if factor.data_type != 'quantitative':
                is_two_level_factorial = False
                break
            
            # Coletar valores únicos deste fator
            unique_values = set()
            for run in runs:
                val = run.factor_values.get(str(factor.id))
                if val is not None:
                    unique_values.add(float(val))
            
            if len(unique_values) != 2:
                is_two_level_factorial = False
                break
            
            # Mapear valores reais para -1 e +1
            sorted_values = sorted(unique_values)
            factor_level_mapping[factor.id] = {
                sorted_values[0]: -1,  # Menor valor = -1
                sorted_values[1]: +1   # Maior valor = +1
            }
        
        # Construir headers
        headers = []
        
        # 1. Intercepto
        headers.append({
            'symbol': 'I',
            'name': 'Intercepto',
            'type': 'intercept'
        })
        
        # 2. Fatores
        factor_symbols = []
        for factor in self.factors:
            header_data = {
                'symbol': factor.symbol,
                'name': factor.name,
                'type': 'factor',
                'factor_id': factor.id,
                'data_type': factor.data_type
            }
            
            # Adicionar mapeamento de níveis se for 2^k
            if is_two_level_factorial and factor.id in factor_level_mapping:
                # Criar mapeamento legível: {-1: valor_baixo, +1: valor_alto}
                mapping = factor_level_mapping[factor.id]
                reverse_mapping = {v: k for k, v in mapping.items()}
                header_data['level_mapping'] = reverse_mapping
            
            headers.append(header_data)
            factor_symbols.append(factor.symbol)
        
        # 3. Todas as interações (2ª ordem, 3ª ordem, ..., ordem completa)
        from itertools import combinations
        interaction_combinations = []
        
        if len(factor_symbols) > 1:
            # Gerar interações de todas as ordens (2, 3, ..., n)
            for order in range(2, len(factor_symbols) + 1):
                for factor_combo in combinations(range(len(factor_symbols)), order):
                    # Símbolos e nomes dos fatores na interação
                    symbols = [factor_symbols[i] for i in factor_combo]
                    interaction_symbol = ''.join(symbols)
                    interaction_combinations.append((factor_combo, symbols, interaction_symbol))
                    
                    # Nomes dos fatores
                    factor_names = [self.factors[i].name for i in factor_combo]
                    
                    headers.append({
                        'symbol': interaction_symbol,
                        'name': ' × '.join(factor_names),
                        'type': 'interaction',
                        'factors': symbols,
                        'order': order
                    })
        
        # 4. Resposta
        headers.append({
            'symbol': 'Y',
            'name': response_name,
            'type': 'response'
        })
        
        # Construir linhas de runs
        run_rows = []
        for run in runs:
            values = []
            values_coded = []  # Valores codificados para exibição
            
            # Intercepto (sempre 1)
            values.append(1)
            values_coded.append(1)
            
            # Fatores
            for factor in self.factors:
                factor_value = run.factor_values.get(str(factor.id))
                
                if factor.data_type == 'categorical':
                    # Para categóricos, mostrar como texto
                    values.append(str(factor_value) if factor_value is not None else '')
                    values_coded.append(str(factor_value) if factor_value is not None else '')
                else:
                    # Para quantitativos, usar valor real
                    real_value = float(factor_value) if factor_value is not None else 0
                    values.append(real_value)
                    
                    # Se for 2^k, também guardar o valor codificado
                    if is_two_level_factorial and factor.id in factor_level_mapping:
                        coded_value = factor_level_mapping[factor.id].get(real_value, 0)
                        values_coded.append(coded_value)
                    else:
                        values_coded.append(real_value)
            
            # Interações (produto dos valores dos fatores envolvidos)
            for factor_indices, symbols, _ in interaction_combinations:
                # Pegar valores de todos os fatores na interação
                interaction_value = 1
                interaction_coded = 1
                is_valid = True
                
                for idx in factor_indices:
                    v = values[1 + idx]  # +1 por causa do intercepto
                    v_coded = values_coded[1 + idx]
                    
                    if not isinstance(v, (int, float)):
                        is_valid = False
                        break
                    
                    interaction_value *= v
                    if isinstance(v_coded, (int, float)):
                        interaction_coded *= v_coded
                
                if is_valid:
                    values.append(interaction_value)
                    values_coded.append(interaction_coded)
                else:
                    values.append(None)
                    values_coded.append(None)
            
            # Resposta
            response_value = run.response_values.get(str(
                next(r.id for r in self.responses if r.name == response_name)
            ))
            values.append(float(response_value) if response_value is not None else None)
            values_coded.append(float(response_value) if response_value is not None else None)
            
            run_rows.append({
                'run_order': run.run_order,
                'standard_order': run.standard_order,
                'is_center_point': run.is_center_point,
                'values': values,
                'values_coded': values_coded  # Valores codificados (-1, +1) para 2^k
            })
        
        # Calcular totais (produto de valor_codificado × resposta, somado)
        # Total = Σ(valor_codificado × Y)
        n_cols = len(headers)
        totals = []
        
        for col_idx in range(n_cols):
            col_type = headers[col_idx]['type']
            
            if col_type == 'response':
                # Soma das respostas
                col_sum = sum(row['values'][col_idx] for row in run_rows 
                             if row['values'][col_idx] is not None)
                totals.append(col_sum)
            elif col_type in ['intercept', 'factor', 'interaction']:
                # Total = Σ(valor_codificado × resposta)
                col_sum = 0
                for row in run_rows:
                    coded_val = row['values_coded'][col_idx]
                    response_val = row['values'][-1]  # Última coluna é a resposta
                    
                    if isinstance(coded_val, (int, float)) and response_val is not None:
                        col_sum += coded_val * response_val
                
                totals.append(col_sum)
            else:
                totals.append(None)
        
        # Calcular médias (total/n)
        n_runs = len(run_rows)
        means = []
        for col_idx, total in enumerate(totals):
            if total is not None and n_runs > 0:
                means.append(total / n_runs)
            else:
                means.append(None)
        
        # Calcular efeitos
        # Efeito = Total / (n/2) para experimentos fatoriais 2^k
        effects = []
        
        for col_idx in range(n_cols):
            col_type = headers[col_idx]['type']
            total = totals[col_idx]
            
            if col_type == 'intercept':
                # Intercepto não tem efeito
                effects.append(None)
            elif col_type in ['factor', 'interaction']:
                # Efeito = Total / (n/2)
                if total is not None and n_runs > 0:
                    effect = total / (n_runs / 2)
                    effects.append(effect)
                else:
                    effects.append(None)
            else:
                # Resposta não tem efeito
                effects.append(None)
        
        # Calcular contribuição percentual de cada efeito
        # Contribuição = (2^k × q²) / SST × 100%, onde q = efeito/2
        contributions = []
        
        # Calcular SST = Σ(2^k × q²) para todos os efeitos
        sst = 0
        for col_idx in range(n_cols):
            col_type = headers[col_idx]['type']
            effect = effects[col_idx]
            
            if col_type in ['factor', 'interaction'] and effect is not None:
                q = effect / 2
                sst += n_runs * (q ** 2)
        
        # Calcular contribuição de cada efeito
        for col_idx in range(n_cols):
            col_type = headers[col_idx]['type']
            effect = effects[col_idx]
            
            if col_type == 'intercept' or col_type == 'response':
                contributions.append(None)
            elif col_type in ['factor', 'interaction']:
                if effect is not None and sst > 0:
                    q = effect / 2
                    contribution = (n_runs * (q ** 2)) / sst * 100
                    contributions.append(contribution)
                else:
                    contributions.append(None)
            else:
                contributions.append(None)
        
        return {
            'headers': headers,
            'runs': run_rows,
            'totals': totals,
            'means': means,
            'effects': effects,
            'contributions': contributions,
            'n_runs': n_runs,
            'is_two_level_factorial': is_two_level_factorial
        }

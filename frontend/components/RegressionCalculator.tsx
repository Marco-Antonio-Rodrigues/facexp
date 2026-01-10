'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Factor {
  id: number;
  name: string;
  symbol: string;
  data_type: string;
}

interface RegressionCoefficient {
  term: string;
  coefficient: number;
  std_error: number;
  t_value: number;
  p_value: number;
  is_significant: boolean;
}

interface RegressionData {
  coefficients: RegressionCoefficient[];
  equation: string;
  equation_coded: string;
}

interface RegressionCalculatorProps {
  regression: RegressionData;
  factors: Factor[];
  responseVariableName: string;
  experimentData?: {
    factors: Record<string, (number | string)[]>;
  };
}

export function RegressionCalculator({ regression, factors, responseVariableName, experimentData }: RegressionCalculatorProps) {
  // Initialize factor values with empty strings
  const [factorValues, setFactorValues] = useState<Record<string, string>>(
    factors.reduce((acc, f) => ({ ...acc, [f.symbol]: '' }), {})
  );

  const handleInputChange = (symbol: string, value: string) => {
    setFactorValues(prev => ({ ...prev, [symbol]: value }));
  };

  // Get unique levels for each factor from experiment data
  const factorLevels = useMemo(() => {
    if (!experimentData?.factors) return {};
    
    const levels: Record<string, (number | string)[]> = {};
    factors.forEach(factor => {
      if (experimentData.factors[factor.symbol]) {
        const uniqueLevels = Array.from(new Set(experimentData.factors[factor.symbol]));
        levels[factor.symbol] = uniqueLevels.sort((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          return String(a).localeCompare(String(b));
        });
      }
    });
    return levels;
  }, [experimentData, factors]);

  // Calculate prediction
  const prediction = useMemo(() => {
    // Check if all values are filled
    const allFilled = factors.every(f => factorValues[f.symbol] !== '');
    if (!allFilled) return null;

    // Start with intercept
    const interceptCoef = regression.coefficients.find(c => c.term === 'Intercept');
    if (!interceptCoef) return null;

    let result = interceptCoef.coefficient;

    // Parse factor values
    const parsedValues: Record<string, number> = {};
    for (const factor of factors) {
      const val = parseFloat(factorValues[factor.symbol]);
      if (isNaN(val)) return null;
      parsedValues[factor.symbol] = val;
    }

    // Add main effects and interactions
    for (const coef of regression.coefficients) {
      if (coef.term === 'Intercept') continue;

      const term = coef.term;
      
      // Check for categorical effects like "Tipo Material (M)[T.2.0]"
      const categoricalMatch = term.match(/(.+)\[T\.(.+)\]/);
      if (categoricalMatch) {
        const factorName = categoricalMatch[1].trim();
        const level = parseFloat(categoricalMatch[2]);
        
        // Find which factor this belongs to
        const factor = factors.find(f => 
          factorName.includes(f.symbol) || factorName.includes(f.name)
        );
        
        if (factor && parsedValues[factor.symbol] === level) {
          result += coef.coefficient;
        }
        continue;
      }

      // Check for interactions like "Temperatura (F):Tipo Material (M)[T.2.0]"
      const interactionMatch = term.match(/(.+):(.+)\[T\.(.+)\]/);
      if (interactionMatch) {
        const factor1Name = interactionMatch[1].trim();
        const factor2Name = interactionMatch[2].trim();
        const level = parseFloat(interactionMatch[3]);

        const factor1 = factors.find(f => 
          factor1Name.includes(f.symbol) || factor1Name.includes(f.name)
        );
        const factor2 = factors.find(f => 
          factor2Name.includes(f.symbol) || factor2Name.includes(f.name)
        );

        if (factor1 && factor2 && parsedValues[factor2.symbol] === level) {
          result += coef.coefficient * parsedValues[factor1.symbol];
        }
        continue;
      }

      // Simple linear term
      const factor = factors.find(f => 
        term.includes(f.symbol) || term.includes(f.name)
      );
      if (factor) {
        result += coef.coefficient * parsedValues[factor.symbol];
      }
    }

    return result;
  }, [factorValues, factors, regression.coefficients]);

  // Get significant coefficients
  const significantCoefficients = regression.coefficients.filter(c => c.is_significant);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Calculadora de Predição</CardTitle>
        <CardDescription>
          Use o modelo de regressão para prever o resultado para novas combinações de fatores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground">Insira os valores dos fatores:</h3>
              <div className="space-y-3">
                {factors.map(factor => {
                  const isCategorical = factor.data_type === 'categorical';
                  const levels = factorLevels[factor.symbol] || [];
                  
                  return (
                    <div key={factor.symbol} className="space-y-1">
                      <label htmlFor={`factor-${factor.symbol}`} className="text-sm text-muted-foreground">
                        {factor.name} ({factor.symbol})
                        {isCategorical && levels.length > 0 && (
                          <span className="ml-2 text-xs text-emerald-600">
                            Níveis: {levels.join(', ')}
                          </span>
                        )}
                      </label>
                      
                      {isCategorical && levels.length > 0 ? (
                        <Select
                          value={factorValues[factor.symbol]}
                          onValueChange={(value) => handleInputChange(factor.symbol, value)}
                        >
                          <SelectTrigger id={`factor-${factor.symbol}`}>
                            <SelectValue placeholder="Selecione um nível">
                              {factorValues[factor.symbol] || 'Selecione um nível'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {levels.map((level) => (
                              <SelectItem key={String(level)} value={String(level)}>
                                {String(level)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`factor-${factor.symbol}`}
                          type="number"
                          step="any"
                          placeholder={`Digite o valor de ${factor.symbol}`}
                          value={factorValues[factor.symbol]}
                          onChange={(e) => handleInputChange(factor.symbol, e.target.value)}
                          className="w-full"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prediction Result */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-2 border-emerald-500/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Valor Previsto:</p>
              {prediction !== null ? (
                <div>
                  <p className="text-3xl font-bold text-emerald-600">
                    {prediction.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{responseVariableName}</p>
                </div>
              ) : (
                <p className="text-lg text-muted-foreground italic">
                  Preencha todos os fatores
                </p>
              )}
            </div>
          </div>

          {/* Equation Display */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Modelo de Regressão:</h3>
              <div className="bg-muted/30 p-4 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-2">Equação em Variáveis Reais:</p>
                <p className="font-mono text-sm text-foreground break-words">
                  {regression.equation}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground flex items-center gap-2">
                Coeficientes Significativos 
                <Badge variant="default" className="bg-emerald-600">
                  {significantCoefficients.length}
                </Badge>
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {significantCoefficients.map((coef, idx) => (
                  <div 
                    key={idx}
                    className="bg-emerald-50 border border-emerald-200 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-sm text-gray-800 font-medium">
                        {coef.term}
                      </span>
                      <span className="text-sm font-bold text-emerald-700">
                        {coef.coefficient > 0 ? '+' : ''}{coef.coefficient.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-600">
                      <span>t = {coef.t_value.toFixed(2)}</span>
                      <span>p = {coef.p_value.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

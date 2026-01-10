'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Point {
  x: number | string;
  y: number | null;
  std: number | null;
  n: number;
  raw_values: number[];
}

interface Series {
  name: string;
  level: number | string;
  points: Point[];
}

interface Factor {
  id: number;
  name: string;
  symbol: string;
  levels: (number | string)[];
}

interface PlotCombination {
  factor_x: Factor;
  factor_lines: Factor;
  series: Series[];
}

interface InteractionData {
  combinations: PlotCombination[];
  default_x: string | null;
  default_lines: string | null;
}

interface InteractionPlotProps {
  data: InteractionData;
  responseVariableName: string;
}

export function InteractionPlot({ data, responseVariableName }: InteractionPlotProps) {
  const [selectedX, setSelectedX] = useState<string>(data.default_x || '');
  const [selectedLines, setSelectedLines] = useState<string>(data.default_lines || '');
  const [showPoints, setShowPoints] = useState(false);
  const [showErrorBars, setShowErrorBars] = useState(true);

  // Get current plot combination
  const currentCombination = useMemo(() => {
    return data.combinations.find(
      (combo) =>
        combo.factor_x.symbol === selectedX &&
        combo.factor_lines.symbol === selectedLines
    );
  }, [data.combinations, selectedX, selectedLines]);

  // Generate available factors for dropdowns
  const availableFactors = useMemo(() => {
    const factorsMap = new Map<string, Factor>();
    data.combinations.forEach((combo) => {
      factorsMap.set(combo.factor_x.symbol, combo.factor_x);
      factorsMap.set(combo.factor_lines.symbol, combo.factor_lines);
    });
    return Array.from(factorsMap.values());
  }, [data.combinations]);

  // Get selected factor names for display
  const selectedXFactor = useMemo(() => {
    return availableFactors.find(f => f.symbol === selectedX);
  }, [availableFactors, selectedX]);

  const selectedLinesFactor = useMemo(() => {
    return availableFactors.find(f => f.symbol === selectedLines);
  }, [availableFactors, selectedLines]);

  // Generate plot traces
  const chartOption = useMemo(() => {
    if (!currentCombination) return {};

    const series: unknown[] = [];
    const allXValues: (number | string)[] = [];
    
    // Cores vibrantes para melhor visualização em fundo escuro
    const vibrantColors = [
      '#60a5fa', // blue-400
      '#f472b6', // pink-400
      '#34d399', // green-400
      '#fbbf24', // yellow-400
      '#a78bfa', // purple-400
      '#fb923c', // orange-400
      '#2dd4bf', // teal-400
      '#f87171', // red-400
    ];
    
    // Collect all x values
    if (currentCombination.series.length > 0) {
      currentCombination.series[0].points.forEach((p) => {
        allXValues.push(p.x);
      });
    }

    currentCombination.series.forEach((seriesData, index) => {
      const yValues = seriesData.points.map((p) => p.y);
      const upperErrors = seriesData.points.map((p) => 
        p.y !== null && p.std !== null ? p.y + p.std : p.y
      );
      const lowerErrors = seriesData.points.map((p) => 
        p.y !== null && p.std !== null ? p.y - p.std : p.y
      );

      const lineColor = vibrantColors[index % vibrantColors.length];

      // Main line
      series.push({
        name: seriesData.name,
        type: 'line',
        data: yValues,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: lineColor,
        },
        itemStyle: {
          color: lineColor,
        },
      });

      // Error bars
      if (showErrorBars) {
        series.push({
          name: `${seriesData.name} (erro)`,
          type: 'custom',
          renderItem: (params: unknown, api: {
            value: (idx: number) => number;
            coord: (point: [number, number]) => [number, number];
            size?: (point: [number, number]) => [number, number];
          }) => {
            const paramsCasted = params as { dataIndex: number };
            const xValue = api.coord([paramsCasted.dataIndex, 0])[0];
            const yUpper = api.coord([paramsCasted.dataIndex, upperErrors[paramsCasted.dataIndex] || 0])[1];
            const yLower = api.coord([paramsCasted.dataIndex, lowerErrors[paramsCasted.dataIndex] || 0])[1];
            
            return {
              type: 'group',
              children: [
                {
                  type: 'line',
                  shape: {
                    x1: xValue,
                    y1: yUpper,
                    x2: xValue,
                    y2: yLower,
                  },
                  style: {
                    stroke: lineColor,
                    lineWidth: 1.5,
                    opacity: 0.6,
                  },
                },
                {
                  type: 'line',
                  shape: {
                    x1: xValue - 3,
                    y1: yUpper,
                    x2: xValue + 3,
                    y2: yUpper,
                  },
                  style: {
                    stroke: lineColor,
                    lineWidth: 1.5,
                    opacity: 0.6,
                  },
                },
                {
                  type: 'line',
                  shape: {
                    x1: xValue - 3,
                    y1: yLower,
                    x2: xValue + 3,
                    y2: yLower,
                  },
                  style: {
                    stroke: lineColor,
                    lineWidth: 1.5,
                    opacity: 0.6,
                  },
                },
              ],
            };
          },
          data: yValues,
          silent: true,
          z: -1,
        });
      }

      // Individual points
      if (showPoints) {
        seriesData.points.forEach((point, pointIndex) => {
          if (point.raw_values && point.raw_values.length > 0) {
            // Para cada valor individual, criar um ponto no índice correto do eixo X
            const pointData = point.raw_values.map((val) => ({
              value: [pointIndex, val],
              itemStyle: {
                color: lineColor,
                opacity: 0.4,
              },
            }));
            
            series.push({
              name: `${seriesData.name} (individual)`,
              type: 'scatter',
              data: pointData,
              symbol: 'circle',
              symbolSize: 5,
              itemStyle: {
                color: lineColor,
                opacity: 0.4,
              },
              silent: false,
              legendHoverLink: false,
            });
          }
        });
      }
    });

    return {
      title: {
        text: `Gráfico de Interação: ${currentCombination.factor_x.name} × ${currentCombination.factor_lines.name}`,
        left: 'center',
        textStyle: {
          fontSize: 16,
          color: '#e5e7eb',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#ccc',
        textStyle: {
          color: '#333',
        },
      },
      legend: {
        data: currentCombination.series.map((s) => s.name),
        top: 30,
        type: 'scroll',
        textStyle: {
          color: '#e5e7eb',
        },
      },
      grid: {
        left: '10%',
        right: '15%',
        bottom: '10%',
        top: '20%',
      },
      xAxis: {
        type: 'category',
        data: allXValues,
        name: currentCombination.factor_x.name,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: '#e5e7eb',
          fontSize: 12,
        },
        axisLabel: {
          color: '#d1d5db',
        },
        axisLine: {
          lineStyle: {
            color: '#4b5563',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: responseVariableName,
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: '#e5e7eb',
          fontSize: 12,
        },
        axisLabel: {
          color: '#d1d5db',
        },
        axisLine: {
          lineStyle: {
            color: '#4b5563',
          },
        },
        splitLine: {
          lineStyle: {
            color: '#374151',
            type: 'dashed',
          },
        },
      },
      series,
    };
  }, [currentCombination, showPoints, showErrorBars, responseVariableName]);

  if (!currentCombination) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gráfico de Interação</CardTitle>
          <CardDescription>
            Nenhuma combinação de fatores disponível
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gráfico de Interação</CardTitle>
        <CardDescription>
          Visualize como os fatores interagem entre si
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="factor-x">Eixo X (Horizontal)</Label>
              <Select value={selectedX} onValueChange={setSelectedX}>
                <SelectTrigger id="factor-x">
                  <SelectValue>
                    {selectedXFactor ? `${selectedXFactor.name} (${selectedXFactor.symbol})` : 'Selecione um fator'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableFactors.map((factor) => (
                    <SelectItem
                      key={factor.symbol}
                      value={factor.symbol}
                      disabled={factor.symbol === selectedLines}
                    >
                      {factor.name} ({factor.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="factor-lines">Linhas (Séries)</Label>
              <Select value={selectedLines} onValueChange={setSelectedLines}>
                <SelectTrigger id="factor-lines">
                  <SelectValue>
                    {selectedLinesFactor ? `${selectedLinesFactor.name} (${selectedLinesFactor.symbol})` : 'Selecione um fator'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableFactors.map((factor) => (
                    <SelectItem
                      key={factor.symbol}
                      value={factor.symbol}
                      disabled={factor.symbol === selectedX}
                    >
                      {factor.name} ({factor.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Options */}
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-points"
                checked={showPoints}
                onCheckedChange={(checked: boolean | 'indeterminate') => setShowPoints(checked === true)}
              />
              <Label
                htmlFor="show-points"
                className="text-sm font-normal cursor-pointer"
              >
                Mostrar pontos individuais
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-error-bars"
                checked={showErrorBars}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setShowErrorBars(checked === true)
                }
              />
              <Label
                htmlFor="show-error-bars"
                className="text-sm font-normal cursor-pointer"
              >
                Mostrar barras de erro
              </Label>
            </div>
          </div>

          {/* Plot */}
          <div className="w-full">
            <ReactECharts
              key={`${selectedX}-${selectedLines}-${showPoints}-${showErrorBars}`}
              option={chartOption}
              style={{ width: '100%', height: '500px' }}
              opts={{ renderer: 'canvas' }}
              notMerge={true}
              lazyUpdate={false}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

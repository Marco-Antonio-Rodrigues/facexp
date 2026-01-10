'use client';

import ReactECharts from 'echarts-for-react';

interface ResidualsVsFittedData {
  fitted_values: number[];
  residuals: number[];
}

interface ResidualsVsFittedChartProps {
  data: ResidualsVsFittedData;
  title?: string;
}

export default function ResidualsVsFittedChart({ data, title = 'Resíduos vs Valores Ajustados' }: ResidualsVsFittedChartProps) {
  // Preparar dados para scatter plot
  const scatterData = data.fitted_values.map((x, i) => [x, data.residuals[i]]);

  const option = {
    title: {
      text: title,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#e5e7eb'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `Ajustado: ${params.value[0].toFixed(3)}<br/>Resíduo: ${params.value[1].toFixed(3)}`;
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ccc',
      textStyle: {
        color: '#333'
      }
    },
    legend: {
      data: ['Resíduos'],
      top: 30,
      textStyle: {
        color: '#e5e7eb'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '20%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: 'Valores Ajustados',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: {
        color: '#e5e7eb',
        fontSize: 12
      },
      axisLabel: {
        color: '#d1d5db'
      },
      axisLine: {
        lineStyle: {
          color: '#4b5563'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#374151',
          type: 'dashed'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: 'Resíduos',
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: {
        color: '#e5e7eb',
        fontSize: 12
      },
      axisLabel: {
        color: '#d1d5db'
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: '#4b5563'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#374151',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: 'Resíduos',
        type: 'scatter',
        data: scatterData,
        symbolSize: 8,
        itemStyle: {
          color: '#3b82f6'
        }
      },
      {
        // Linha horizontal em y=0
        name: 'Referência',
        type: 'line',
        data: [
          [Math.min(...data.fitted_values), 0],
          [Math.max(...data.fitted_values), 0]
        ],
        lineStyle: {
          color: '#ef4444',
          width: 2,
          type: 'dashed'
        },
        symbol: 'none',
        silent: true
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '400px', width: '100%' }} />;
}

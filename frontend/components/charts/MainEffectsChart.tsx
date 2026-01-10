'use client';

import ReactECharts from 'echarts-for-react';

interface MainEffectsData {
  [factor: string]: {
    levels: (string | number)[];
    means: number[];
  };
}

interface MainEffectsChartProps {
  data: MainEffectsData;
  title?: string;
}

export default function MainEffectsChart({ data, title = 'Efeitos Principais' }: MainEffectsChartProps) {
  const factors = Object.keys(data);
  const series = factors.map((factor) => ({
    name: factor,
    type: 'line',
    data: data[factor].means,
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: {
      width: 2
    }
  }));

  // Usa os níveis do primeiro fator como categorias (assumindo design balanceado)
  const categories = data[factors[0]]?.levels.map(String) || [];

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
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ccc',
      textStyle: {
        color: '#333'
      }
    },
    legend: {
      data: factors,
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
      type: 'category',
      data: categories,
      name: 'Nível',
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
      }
    },
    yAxis: {
      type: 'value',
      name: 'Média da Resposta',
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
    series: series
  };

  return <ReactECharts option={option} style={{ height: '400px', width: '100%' }} />;
}

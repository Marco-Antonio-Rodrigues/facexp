'use client';

import ReactECharts from 'echarts-for-react';

interface NormalPlotData {
  theoretical_quantiles: number[];
  sample_quantiles: number[];
  fit_line: {
    x: number[];
    y: number[];
  };
}

interface NormalProbabilityPlotProps {
  data: NormalPlotData;
  title?: string;
}

export default function NormalProbabilityPlot({ data, title = 'Normal Probability Plot' }: NormalProbabilityPlotProps) {
  // Preparar dados para scatter plot
  const scatterData = data.theoretical_quantiles.map((x, i) => [x, data.sample_quantiles[i]]);
  const lineData = data.fit_line.x.map((x, i) => [x, data.fit_line.y[i]]);

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
        if (params.seriesName === 'Resíduos') {
          return `Teórico: ${params.value[0].toFixed(3)}<br/>Observado: ${params.value[1].toFixed(3)}`;
        }
        return '';
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ccc',
      textStyle: {
        color: '#333'
      }
    },
    legend: {
      data: ['Resíduos', 'Linha de Referência'],
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
      name: 'Quantis Teóricos',
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
      name: 'Quantis Amostrais',
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
        name: 'Linha de Referência',
        type: 'line',
        data: lineData,
        lineStyle: {
          color: '#ef4444',
          width: 2,
          type: 'dashed'
        },
        symbol: 'none'
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '400px', width: '100%' }} />;
}

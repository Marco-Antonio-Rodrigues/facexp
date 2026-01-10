'use client';

import ReactECharts from 'echarts-for-react';

interface ParetoData {
  labels: string[];
  values: number[];
  cumulative: number[];
}

interface ParetoChartProps {
  data: ParetoData;
  title?: string;
}

export default function ParetoChart({ data, title = 'Gráfico de Pareto' }: ParetoChartProps) {
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
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ccc',
      textStyle: {
        color: '#333'
      }
    },
    legend: {
      data: ['Efeito Absoluto', 'Acumulado'],
      top: 30,
      textStyle: {
        color: '#e5e7eb'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '20%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: data.labels,
        axisLabel: {
          rotate: 45,
          interval: 0,
          color: '#d1d5db'
        },
        axisLine: {
          lineStyle: {
            color: '#4b5563'
          }
        }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: 'Efeito',
        position: 'left',
        nameTextStyle: {
          color: '#e5e7eb',
          fontSize: 12
        },
        axisLabel: {
          formatter: '{value}',
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
      {
        type: 'value',
        name: 'Acumulado (%)',
        position: 'right',
        min: 0,
        max: 100,
        nameTextStyle: {
          color: '#e5e7eb',
          fontSize: 12
        },
        axisLabel: {
          formatter: '{value}%',
          color: '#d1d5db'
        },
        axisLine: {
          lineStyle: {
            color: '#4b5563'
          }
        },
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: 'Efeito Absoluto',
        type: 'bar',
        data: data.values,
        itemStyle: {
          color: '#3b82f6'
        }
      },
      {
        name: 'Acumulado',
        type: 'line',
        yAxisIndex: 1,
        data: data.cumulative,
        itemStyle: {
          color: '#ef4444'
        },
        lineStyle: {
          width: 2
        },
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '400px', width: '100%' }} />;
}

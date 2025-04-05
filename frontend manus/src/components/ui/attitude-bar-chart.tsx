'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
 ChartData, TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { AiAttitude } from '@/store/useGameStore';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AttitudeBarChartProps {
  attitudes: AiAttitude[];
}

export default function AttitudeBarChart({ attitudes }: AttitudeBarChartProps) {
  const [chartData, setChartData] = useState<ChartData<'bar'> | null>(null);
  
  useEffect(() => {
    if (attitudes.length === 0) {return;}
    
    // Prepare data for the chart
    // Truncate long attitude names for better display
    const labels = attitudes.map(att => 
      att.attitude.length > 25 ? `${att.attitude.substring(0, 25)}...` : att.attitude
    );
    
    const values = attitudes.map(att => att.strength);
    
    setChartData({
      labels,
      datasets: [
        {
          label: 'Your AI Attitudes',
          data: values,
          backgroundColor: [
            'rgba(99, 102, 241, 0.7)',
            'rgba(79, 70, 229, 0.7)',
            'rgba(67, 56, 202, 0.7)',
            'rgba(55, 48, 163, 0.7)',
            'rgba(49, 46, 129, 0.7)',
          ],
          borderColor: [
            'rgba(99, 102, 241, 1)',
            'rgba(79, 70, 229, 1)',
            'rgba(67, 56, 202, 1)',
            'rgba(55, 48, 163, 1)',
            'rgba(49, 46, 129, 1)',
          ],
          borderWidth: 1,
        },
      ],
    });
  }, [attitudes]);
  
  const options = {
    indexAxis: 'y' as const,
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'bar'>) {
            return `${context.raw}%`;
          },
          title: function(context: TooltipItem<'bar'>[]) {
            const index = context[0].dataIndex;
            return attitudes[index]?.attitude || '';
          }
        }
      }
    },
    maintainAspectRatio: false,
  };
  
  if (!chartData) {
    return <div className="h-64 flex items-center justify-center">Loading chart data...</div>;
  }
  
  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}

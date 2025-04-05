'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
, ChartData, TooltipItem } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Trait } from '@/store/useGameStore';

// Register ChartJS components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface TraitRadarChartProps {
  traits: Trait[];
  showAiComparison?: boolean;
}

export default function TraitRadarChart({ traits, showAiComparison = true }: TraitRadarChartProps) {
  const [chartData, setChartData] = useState<ChartData<'radar'> | null>(null);
  
  useEffect(() => {
    if (traits.length === 0) {return;}
    
    // Prepare data for the chart
    const labels = traits.map(trait => trait.name);
    const userValues = traits.map(trait => trait.value);
    
    // Generate simulated AI values for comparison
    // In a real implementation, these would come from an API or be calculated
    const aiValues = traits.map(trait => {
      // Simulate AI being stronger in some areas and weaker in others
      // This is just for demonstration - in a real app, use actual data
      const baseValue = Math.min(trait.value * 0.8, 70); // AI is generally weaker in human traits
      return Math.max(30, Math.min(100, baseValue + (Math.random() * 20 - 10)));
    });
    
    setChartData({
      labels,
      datasets: [
        {
          label: 'Your Traits',
          data: userValues,
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(99, 102, 241, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(99, 102, 241, 1)',
        },
        ...(showAiComparison ? [{
          label: 'AI Capabilities',
          data: aiValues,
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(239, 68, 68, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(239, 68, 68, 1)',
        }] : []),
      ],
    });
  }, [traits, showAiComparison]);
  
  const options = {
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          backdropColor: 'transparent',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        pointLabels: {
          font: {
            size: 12,
          },
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'radar'>) {
            return `${context.dataset.label}: ${context.raw}%`;
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
    <div className="h-64 md:h-80">
      <Radar data={chartData} options={options} />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { Trait } from '@/store/useGameStore';

interface TraitBarChartProps {
  traits: Trait[];
  showAiComparison?: boolean;
}

type ChartDataItem = {
  name: string;
  user: number;
  ai?: number;
  description?: string;
};

export default function TraitBarChart({ traits, showAiComparison = true }: TraitBarChartProps) {
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  
  useEffect(() => {
    if (traits.length === 0) {return;}
    
    // Prepare data for the chart
    const data = traits.map(trait => {
      // Simulate AI being stronger in some areas and weaker in others
      // This is just for demonstration - in a real app, use actual data
      const aiValue = showAiComparison ? 
        Math.max(30, Math.min(100, trait.value * 0.8 + (Math.random() * 20 - 10))) :
        undefined;
        
      return {
        name: trait.name,
        user: trait.value,
        ...(showAiComparison ? { ai: aiValue } : {}),
        description: trait.description
      };
    });
    
    // Sort by user trait value (descending)
    data.sort((a, b) => b.user - a.user);
    
    // Take the top 5 traits for better visualization
    setChartData(data.slice(0, 5));
  }, [traits, showAiComparison]);
  
  // Define custom tooltip for the bar chart
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      value: number;
      name: string;
      dataKey: string;
    }>;
    label?: string;
  }
  
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const traitInfo = chartData.find(item => item.name === label);
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-md shadow-md">
          <p className="font-bold text-gray-900 dark:text-gray-100">{label}</p>
          <p className="text-indigo-600 dark:text-indigo-400">{`Your Score: ${payload[0].value}`}</p>
          {payload.length > 1 && (
            <p className="text-red-600 dark:text-red-400">{`AI Capability: ${payload[1].value.toFixed(0)}`}</p>
          )}
          {traitInfo?.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 max-w-xs">
              {traitInfo.description}
            </p>
          )}
        </div>
      );
    }
    
    return null;
  };
  
  if (chartData.length === 0) {
    return <div className="text-center py-8 text-gray-500">No trait data available</div>;
  }
  
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis 
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={70}
            interval={0}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 100]}
            label={{ value: 'Score', angle: -90, position: 'insideLeft', dx: -10 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ bottom: 0 }} />
          <Bar 
            dataKey="user" 
            name="Your Score" 
            fill="#6366f1" 
            radius={[4, 4, 0, 0]}
          >
            <LabelList dataKey="user" position="top" formatter={(value: number) => `${Math.round(value)}`} />
          </Bar>
          {showAiComparison && (
            <Bar 
              dataKey="ai" 
              name="AI Capability" 
              fill="#ef4444" 
              radius={[4, 4, 0, 0]}
              opacity={0.7}
            >
              <LabelList dataKey="ai" position="top" formatter={(value: number) => value ? `${Math.round(value)}` : ''} />
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
        Your top traits compared to estimated AI capabilities
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { TestHistory as TestHistoryType } from '../types/api';
import { getTestHistory, clearTestHistory, formatResponseTime } from '../utils/apiUtils';

interface TestHistoryProps {
  onSelectHistoryItem: (history: TestHistoryType) => void;
}

const TestHistory: React.FC<TestHistoryProps> = ({ onSelectHistoryItem }) => {
  const [history, setHistory] = useState<TestHistoryType[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Load history when component mounts
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const historyData = getTestHistory();
    setHistory(historyData);
  };

  const handleClearHistory = () => {
    clearTestHistory();
    setHistory([]);
    setSelectedIndex(null);
  };

  const handleSelectItem = (index: number) => {
    setSelectedIndex(index);
    onSelectHistoryItem(history[index]);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (history.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4">Request History</h3>
        <p className="text-gray-500 text-center py-10">No history available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h3 className="text-xl font-semibold">Request History</h3>
        <button
          className="px-3 py-1 bg-red-100 text-red-600 rounded border border-red-300 text-sm hover:bg-red-200"
          onClick={handleClearHistory}
        >
          Clear History
        </button>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-240px)]">
        {history.map((item, index) => (
          <div
            key={index}
            className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${
              selectedIndex === index ? 'bg-blue-50' : ''
            } ${item.result.success ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}
            onClick={() => handleSelectItem(index)}
          >
            <div className="flex justify-between items-center mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                item.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                item.method === 'POST' ? 'bg-green-100 text-green-800' :
                item.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                item.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {item.method}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                item.result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {item.result.success ? 'Success' : 'Error'}
              </span>
            </div>

            <div className="font-mono text-sm mb-2 truncate">
              {item.endpoint}
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{formatTimestamp(item.result.timestamp)}</span>
              {item.result.responseTime && (
                <span className="font-mono">
                  {formatResponseTime(item.result.responseTime)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestHistory;

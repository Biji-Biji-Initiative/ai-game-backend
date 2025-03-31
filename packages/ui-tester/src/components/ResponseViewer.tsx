import React, { useState } from 'react';

interface ResponseViewerProps {
  response: any;
}

const ResponseViewer: React.FC<ResponseViewerProps> = ({ response }) => {
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');

  if (!response) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-center items-center h-full text-gray-500">
          <p>No response data yet. Send a request to see results here.</p>
        </div>
      </div>
    );
  }

  const { data, status, statusText, headers, responseTime } = response;

  const formatResponse = () => {
    if (viewMode === 'pretty') {
      return JSON.stringify(data, null, 2);
    } else {
      return JSON.stringify(data);
    }
  };

  const isSuccess = status >= 200 && status < 300;

  const statusClass = isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h3 className="text-base font-semibold m-0 text-gray-700">Response</h3>
        <div className="flex">
          <div className="flex border border-gray-300 rounded overflow-hidden">
            <button
              className={`px-3 py-1.5 border-none text-sm cursor-pointer ${viewMode === 'pretty' ? 'bg-blue-500 text-white' : 'bg-transparent'}`}
              onClick={() => setViewMode('pretty')}
            >
              Pretty
            </button>
            <button
              className={`px-3 py-1.5 border-none text-sm cursor-pointer ${viewMode === 'raw' ? 'bg-blue-500 text-white' : 'bg-transparent'}`}
              onClick={() => setViewMode('raw')}
            >
              Raw
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between p-2.5 bg-gray-50 text-sm">
        <div className="flex items-center">
          <span className={`inline-block px-2 py-1 rounded ${statusClass}`}>
            {status}
          </span>
          <span className="text-gray-600 ml-2">{statusText}</span>
        </div>
        <div className="text-gray-600">
          <span>Time: {responseTime}ms</span>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button className="px-3 py-2 border-none bg-transparent text-sm border-b-2 border-blue-500 font-semibold">Body</button>
        <button className="px-3 py-2 border-none bg-transparent text-sm text-gray-500">Headers</button>
      </div>

      <div className="flex-1 overflow-auto p-0">
        <pre className="m-0 p-2.5 font-mono text-sm whitespace-pre-wrap overflow-x-auto">{formatResponse()}</pre>
      </div>
    </div>
  );
};

export default ResponseViewer;

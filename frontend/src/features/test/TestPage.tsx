'use client';

import React from 'react';

/**
 * Test page to check basic functionality
 */
export default function TestPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400">
        Test Page
      </h1>
      
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8">
        <p className="mb-4">
          This is a simple test page to verify that the application is working correctly.
        </p>
        
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="font-medium mb-2">If you can see this page, it means:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>The Next.js server is running correctly</li>
            <li>The App Router is functioning properly</li>
            <li>React components are rendering</li>
            <li>Basic styling is working</li>
          </ul>
        </div>
      </div>
      
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Global Object Test</h2>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <span className="font-medium mr-2">exports object:</span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
              {typeof window !== 'undefined' && typeof window.exports !== 'undefined' 
                ? '✅ Available' 
                : '❌ Not available'}
            </span>
          </div>
          
          <div className="flex items-center">
            <span className="font-medium mr-2">module object:</span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
              {typeof window !== 'undefined' && typeof window.module !== 'undefined' 
                ? '✅ Available' 
                : '❌ Not available'}
            </span>
          </div>
          
          <div className="flex items-center">
            <span className="font-medium mr-2">_interop_require_default:</span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
              {typeof window !== 'undefined' && 
               '_interop_require_default' in (window as Window & typeof globalThis) 
                ? '✅ Available' 
                : '❓ Not detected (may be normal)'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center space-x-4">
        <button 
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition"
        >
          Go to Home
        </button>
        
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
} 
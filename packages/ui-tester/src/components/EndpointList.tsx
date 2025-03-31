import React, { useState, useMemo, useCallback } from 'react';
import { ApiEndpoint } from '../types/api';

interface EndpointListProps {
  endpoints: ApiEndpoint[];
  selectedEndpoint: ApiEndpoint | null;
  onSelectEndpoint: (endpoint: ApiEndpoint) => void;
}

interface GroupedEndpoints {
  [category: string]: ApiEndpoint[];
}

const EndpointList: React.FC<EndpointListProps> = ({
  endpoints,
  selectedEndpoint,
  onSelectEndpoint
}) => {
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Group endpoints by category and apply filter
  const { groupedEndpoints, categories, filteredCount } = useMemo(() => {
    // First, apply text filter
    const filteredEndpoints = endpoints.filter(endpoint =>
      endpoint.name.toLowerCase().includes(filter.toLowerCase()) ||
      endpoint.path.toLowerCase().includes(filter.toLowerCase()) ||
      endpoint.method.toLowerCase().includes(filter.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(filter.toLowerCase())
    );

    // Group by category
    const grouped: GroupedEndpoints = {};
    const allCategories = new Set<string>();

    filteredEndpoints.forEach(endpoint => {
      const category = endpoint.category || 'Other';
      allCategories.add(category);

      if (!grouped[category]) {
        grouped[category] = [];
      }

      // Only add if category filter is not applied or matches
      if (!categoryFilter || categoryFilter === 'All' || category === categoryFilter) {
        grouped[category].push(endpoint);
      }
    });

    // Calculate total filtered count
    let totalCount = 0;
    Object.values(grouped).forEach(endpoints => {
      totalCount += endpoints.length;
    });

    // Sort categories alphabetically with 'Other' at the end
    const sortedCategories = Array.from(allCategories).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });

    return {
      groupedEndpoints: grouped,
      categories: ['All', ...sortedCategories],
      filteredCount: totalCount
    };
  }, [endpoints, filter, categoryFilter]);

  // Initialize expanded state for new categories
  useMemo(() => {
    const newExpandedState = { ...expandedCategories };

    categories.forEach(category => {
      if (category !== 'All' && expandedCategories[category] === undefined) {
        // Default to expanded if no filter, collapsed if filter is applied
        newExpandedState[category] = !filter;
      }
    });

    if (Object.keys(newExpandedState).length !== Object.keys(expandedCategories).length) {
      setExpandedCategories(newExpandedState);
    }
  }, [categories, expandedCategories, filter]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);

  const handleCategoryFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCategoryFilter(value === 'All' ? null : value);

    // Expand the selected category
    if (value !== 'All') {
      setExpandedCategories(prev => ({
        ...prev,
        [value]: true
      }));
    }
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold mt-0 mb-2.5">API Endpoints ({filteredCount})</h2>
        <div className="flex flex-col gap-2.5">
          <input
            type="text"
            placeholder="Search endpoints..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />

          <div className="flex items-center gap-1">
            <label htmlFor="category-select" className="text-sm">Category:</label>
            <select
              id="category-select"
              value={categoryFilter || 'All'}
              onChange={handleCategoryFilterChange}
              className="flex-1 p-2 border border-gray-300 rounded text-sm"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredCount > 0 ? (
        <div className="flex-1 overflow-y-auto">
          {categories.slice(1).map(category => {
            const categoryEndpoints = groupedEndpoints[category] || [];

            // Skip empty categories
            if (categoryEndpoints.length === 0) return null;

            const isExpanded = expandedCategories[category];

            return (
              <div key={category} className="mb-1">
                <div
                  className="flex items-center p-2.5 bg-gray-100 border-b border-gray-300 cursor-pointer transition-colors hover:bg-gray-200"
                  onClick={() => toggleCategory(category)}
                >
                  <span className="text-xs mr-2 text-gray-600">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <h3 className="flex-1 m-0 text-sm font-semibold">{category}</h3>
                  <span className="bg-gray-300 text-gray-700 text-xs py-0.5 px-1.5 rounded-full min-w-5 text-center">
                    {categoryEndpoints.length}
                  </span>
                </div>

                {isExpanded && (
                  <ul className="list-none p-0 m-0">
                    {categoryEndpoints.map((endpoint, index) => (
                      <li
                        key={`${endpoint.method}-${endpoint.path}-${index}`}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50
                          ${selectedEndpoint === endpoint ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                        onClick={() => onSelectEndpoint(endpoint)}
                      >
                        <div className="flex items-center mb-1">
                          <span className={`method ${endpoint.method.toLowerCase()}`}>
                            {endpoint.method}
                          </span>
                          <span className="font-semibold text-base">{endpoint.name}</span>
                        </div>
                        <div className="font-mono mb-1 text-sm">{endpoint.path}</div>
                        <div className="text-sm text-gray-600">{endpoint.description}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-5 text-center text-gray-500">
          <p>No endpoints match your search criteria</p>
        </div>
      )}
    </div>
  );
};

export default EndpointList;

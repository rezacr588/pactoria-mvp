import React, { useState, useCallback, useEffect } from 'react';
import { SearchService } from '../../services/api';
import { 
  ContractSearchRequest, 
  ContractSearchResults, 
  ContractSearchFilters,
  SortCriteria 
} from '../../types';
import { useFormValidation } from '../../hooks/useFormValidation';

interface AdvancedSearchProps {
  onResults?: (results: ContractSearchResults) => void;
  onError?: (error: string) => void;
  initialFilters?: ContractSearchFilters;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onResults,
  onError,
  initialFilters = {}
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ContractSearchFilters>(initialFilters);
  const [operator, setOperator] = useState<'AND' | 'OR' | 'NOT'>('AND');
  const [sort, setSort] = useState<SortCriteria[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { errors, validateField, clearErrors } = useFormValidation(
    { searchQuery: '' },
    { searchQuery: { required: false } }
  );

  // Get search suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await SearchService.getContractSearchSuggestions({
        q: query,
        limit: 5
      });
      setSuggestions(response.suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  }, []);

  // Debounced suggestion fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        fetchSuggestions(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchSuggestions]);

  // Perform search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() && Object.keys(filters).length === 0) {
      // Show error for empty search
      onError?.('Please enter a search query or apply filters');
      return;
    }

    clearErrors();
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const request: ContractSearchRequest = {
        query: searchQuery.trim(),
        operator,
        filters,
        sort: sort.length > 0 ? sort : undefined,
        page: 1,
        size: 20,
        include_total: true,
        highlight: true
      };

      const results = await SearchService.searchContracts(request);
      onResults?.(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, operator, filters, sort, onResults, onError, validateField, clearErrors]);

  // Update filter
  const updateFilter = useCallback((key: keyof ContractSearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Add sort criteria
  const addSort = useCallback((field: string, direction: 'ASC' | 'DESC') => {
    setSort(prev => {
      const existing = prev.findIndex(s => s.field === field);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { field, direction };
        return updated;
      }
      return [...prev, { field, direction }];
    });
  }, []);

  // Remove sort criteria
  const removeSort = useCallback((field: string) => {
    setSort(prev => prev.filter(s => s.field !== field));
  }, []);

  // Handle suggestion selection
  const selectSuggestion = useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    handleSearch();
  }, [handleSearch]);

  return (
    <div className="advanced-search bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="search-header">
        <h2>Advanced Search</h2>
        <p>Search contracts with advanced filtering and sorting options</p>
      </div>

      {/* Main Search Input */}
      <div className="search-input-section">
        <div className="search-input-group">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search contracts, clients, content..."
              className={`search-input ${errors.searchQuery ? 'error' : ''}`}
              aria-label="Search query"
            />
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    className="suggestion-item"
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value as 'AND' | 'OR' | 'NOT')}
            className="operator-select"
            aria-label="Search operator"
          >
            <option value="AND">AND (all terms)</option>
            <option value="OR">OR (any term)</option>
            <option value="NOT">NOT (exclude terms)</option>
          </select>

          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="search-button primary"
            aria-label="Perform search"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {errors.searchQuery && (
          <div className="error-message" role="alert">
            {errors.searchQuery}
          </div>
        )}
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <h3>Filters</h3>
        
        <div className="filters-grid">
          {/* Status Filter */}
          <div className="filter-group">
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              multiple
              value={filters.status || []}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                updateFilter('status', values.length > 0 ? values : undefined);
              }}
              className="filter-select"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="EXPIRED">Expired</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>

          {/* Contract Type Filter */}
          <div className="filter-group">
            <label htmlFor="type-filter">Contract Type</label>
            <select
              id="type-filter"
              multiple
              value={filters.contract_type || []}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                updateFilter('contract_type', values.length > 0 ? values : undefined);
              }}
              className="filter-select"
            >
              <option value="SERVICE_AGREEMENT">Service Agreement</option>
              <option value="EMPLOYMENT_CONTRACT">Employment Contract</option>
              <option value="SUPPLIER_AGREEMENT">Supplier Agreement</option>
              <option value="NDA">NDA</option>
              <option value="TERMS_CONDITIONS">Terms & Conditions</option>
              <option value="CONSULTANCY">Consultancy</option>
              <option value="PARTNERSHIP">Partnership</option>
              <option value="LEASE">Lease</option>
            </select>
          </div>

          {/* Client Name Filter */}
          <div className="filter-group">
            <label htmlFor="client-filter">Client Name</label>
            <input
              id="client-filter"
              type="text"
              value={filters.client_name || ''}
              onChange={(e) => updateFilter('client_name', e.target.value || undefined)}
              placeholder="Enter client name"
              className="filter-input"
            />
          </div>

          {/* Contract Value Range */}
          <div className="filter-group">
            <label>Contract Value Range</label>
            <div className="range-inputs">
              <input
                type="number"
                value={filters.contract_value?.gte || ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : undefined;
                  updateFilter('contract_value', {
                    ...filters.contract_value,
                    gte: value
                  });
                }}
                placeholder="Min value"
                className="filter-input"
              />
              <input
                type="number"
                value={filters.contract_value?.lte || ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : undefined;
                  updateFilter('contract_value', {
                    ...filters.contract_value,
                    lte: value
                  });
                }}
                placeholder="Max value"
                className="filter-input"
              />
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="filter-group">
            <label>Creation Date Range</label>
            <div className="date-inputs">
              <input
                type="date"
                value={filters.created_at?.gte || ''}
                onChange={(e) => {
                  const value = e.target.value || undefined;
                  updateFilter('created_at', {
                    ...filters.created_at,
                    gte: value
                  });
                }}
                className="filter-input"
              />
              <input
                type="date"
                value={filters.created_at?.lte || ''}
                onChange={(e) => {
                  const value = e.target.value || undefined;
                  updateFilter('created_at', {
                    ...filters.created_at,
                    lte: value
                  });
                }}
                className="filter-input"
              />
            </div>
          </div>

          {/* Compliance Score Filter */}
          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={filters.has_compliance_score === true}
                onChange={(e) => updateFilter('has_compliance_score', e.target.checked || undefined)}
              />
              Has Compliance Score
            </label>
          </div>
        </div>

        {/* Clear Filters */}
        <div className="filter-actions">
          <button
            type="button"
            onClick={() => setFilters({})}
            className="button secondary"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Sorting Section */}
      <div className="sorting-section">
        <h3>Sort Results</h3>
        
        <div className="sort-controls">
          <select
            onChange={(e) => {
              if (e.target.value) {
                addSort(e.target.value, 'ASC');
                e.target.value = '';
              }
            }}
            className="sort-select"
            defaultValue=""
          >
            <option value="">Add sort field...</option>
            <option value="title">Title</option>
            <option value="created_at">Created Date</option>
            <option value="updated_at">Updated Date</option>
            <option value="contract_value">Contract Value</option>
            <option value="start_date">Start Date</option>
            <option value="end_date">End Date</option>
            <option value="compliance_score">Compliance Score</option>
          </select>
        </div>

        {sort.length > 0 && (
          <div className="active-sorts">
            {sort.map((sortItem, index) => (
              <div key={index} className="sort-item">
                <span>{sortItem.field}</span>
                <button
                  type="button"
                  onClick={() => addSort(sortItem.field, sortItem.direction === 'ASC' ? 'DESC' : 'ASC')}
                  className="sort-direction-toggle"
                  title={`Currently ${sortItem.direction}. Click to toggle.`}
                >
                  {sortItem.direction === 'ASC' ? '↑' : '↓'}
                </button>
                <button
                  type="button"
                  onClick={() => removeSort(sortItem.field)}
                  className="remove-sort"
                  title="Remove sort"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default AdvancedSearch;
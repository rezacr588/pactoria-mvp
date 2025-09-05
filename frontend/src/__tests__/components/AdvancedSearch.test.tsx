import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdvancedSearch from '../../components/search/AdvancedSearch';
import { SearchService } from '../../services/api';

// Mock the search service
vi.mock('../../services/api', () => ({
  SearchService: {
    searchContracts: vi.fn(),
    getContractSearchSuggestions: vi.fn(),
  }
}));

// Mock the useFormValidation hook
vi.mock('../../hooks/useFormValidation', () => ({
  useFormValidation: () => ({
    errors: {},
    validateField: vi.fn(),
    clearErrors: vi.fn(),
  })
}));

describe('AdvancedSearch', () => {
  const mockSearchService = SearchService as any;
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders search form with all elements', () => {
    render(<AdvancedSearch />);

    expect(screen.getByLabelText('Search query')).toBeInTheDocument();
    expect(screen.getByLabelText('Search operator')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Perform search' })).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Sort Results')).toBeInTheDocument();
  });

  it('displays search suggestions when typing', async () => {
    const mockSuggestions = {
      suggestions: ['service agreement', 'service contract'],
      query: 'service',
      total: 2
    };

    mockSearchService.getContractSearchSuggestions.mockResolvedValue(mockSuggestions);

    render(<AdvancedSearch />);

    const searchInput = screen.getByLabelText('Search query');
    await user.type(searchInput, 'service');

    await waitFor(() => {
      expect(mockSearchService.getContractSearchSuggestions).toHaveBeenCalledWith({
        q: 'service',
        limit: 5
      });
    });

    await waitFor(() => {
      expect(screen.getByText('service agreement')).toBeInTheDocument();
      expect(screen.getByText('service contract')).toBeInTheDocument();
    });
  });

  it('performs search when search button is clicked', async () => {
    const mockResults = {
      items: [
        {
          id: '1',
          title: 'Test Contract',
          contract_type: 'SERVICE_AGREEMENT',
          status: 'ACTIVE',
          created_at: '2024-01-01T00:00:00Z',
          version: 1
        }
      ],
      total: 1,
      page: 1,
      size: 20,
      took_ms: 150,
      query: 'test',
      filters_applied: {}
    };

    mockSearchService.searchContracts.mockResolvedValue(mockResults);

    const mockOnResults = vi.fn();
    render(<AdvancedSearch onResults={mockOnResults} />);

    const searchInput = screen.getByLabelText('Search query');
    const searchButton = screen.getByRole('button', { name: 'Perform search' });

    await user.type(searchInput, 'test');
    await user.click(searchButton);

    await waitFor(() => {
      expect(mockSearchService.searchContracts).toHaveBeenCalledWith({
        query: 'test',
        operator: 'AND',
        filters: {},
        page: 1,
        size: 20,
        include_total: true,
        highlight: true
      });
    });

    expect(mockOnResults).toHaveBeenCalledWith(mockResults);
  });

  it('updates filters correctly', async () => {
    render(<AdvancedSearch />);

    // Update status filter
    const statusFilter = screen.getByLabelText('Status');
    await user.selectOptions(statusFilter, 'ACTIVE');

    // Update client name filter
    const clientFilter = screen.getByLabelText('Client Name');
    await user.type(clientFilter, 'Test Client');

    // Update contract value range
    const minValueInput = screen.getByPlaceholderText('Min value');
    const maxValueInput = screen.getByPlaceholderText('Max value');

    await user.type(minValueInput, '1000');
    await user.type(maxValueInput, '5000');

    // These changes should be reflected in the component state
    // We can verify this by triggering a search and checking the filters
    const mockResults = {
      items: [],
      total: 0,
      page: 1,
      size: 20,
      took_ms: 50,
      query: '',
      filters_applied: {}
    };

    mockSearchService.searchContracts.mockResolvedValue(mockResults);

    const searchButton = screen.getByRole('button', { name: 'Perform search' });
    await user.click(searchButton);

    await waitFor(() => {
      expect(mockSearchService.searchContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            contract_value: {
              gte: 1000,
              lte: 5000
            }
          })
        })
      );
    });
  });

  it('handles sort criteria', async () => {
    render(<AdvancedSearch />);

    // Add a sort field
    const sortSelect = screen.getByDisplayValue('Add sort field...');
    await user.selectOptions(sortSelect, 'title');

    // Should show the active sort
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByTitle('Currently ASC. Click to toggle.')).toBeInTheDocument();

    // Toggle sort direction
    const sortToggle = screen.getByTitle('Currently ASC. Click to toggle.');
    await user.click(sortToggle);

    // Should show DESC direction
    expect(screen.getByTitle('Currently DESC. Click to toggle.')).toBeInTheDocument();
  });

  it('clears all filters when clear button is clicked', async () => {
    render(<AdvancedSearch />);

    // Set some filters first
    const clientFilter = screen.getByLabelText('Client Name');
    await user.type(clientFilter, 'Test Client');

    const clearButton = screen.getByText('Clear All Filters');
    await user.click(clearButton);

    // Client filter should be cleared
    expect(clientFilter).toHaveValue('');
  });

  it('shows error message when search fails', async () => {
    const mockOnError = vi.fn();
    mockSearchService.searchContracts.mockRejectedValue(new Error('Search failed'));

    render(<AdvancedSearch onError={mockOnError} />);

    const searchInput = screen.getByLabelText('Search query');
    const searchButton = screen.getByRole('button', { name: 'Perform search' });

    await user.type(searchInput, 'test');
    await user.click(searchButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Search failed');
    });
  });

  it('handles suggestion selection', async () => {
    const mockSuggestions = {
      suggestions: ['service agreement'],
      query: 'service',
      total: 1
    };

    const mockResults = {
      items: [],
      total: 0,
      page: 1,
      size: 20,
      took_ms: 50,
      query: 'service agreement',
      filters_applied: {}
    };

    mockSearchService.getContractSearchSuggestions.mockResolvedValue(mockSuggestions);
    mockSearchService.searchContracts.mockResolvedValue(mockResults);

    render(<AdvancedSearch />);

    const searchInput = screen.getByLabelText('Search query');
    await user.type(searchInput, 'service');

    await waitFor(() => {
      expect(screen.getByText('service agreement')).toBeInTheDocument();
    });

    const suggestion = screen.getByText('service agreement');
    await user.click(suggestion);

    // Should update the search input and trigger search
    expect(searchInput).toHaveValue('service agreement');
  });

  it('respects initial filters prop', () => {
    const initialFilters = {
      status: ['ACTIVE'],
      client_name: 'Test Client'
    };

    render(<AdvancedSearch initialFilters={initialFilters} />);

    const clientFilter = screen.getByLabelText('Client Name');
    expect(clientFilter).toHaveValue('Test Client');
  });

  it('handles compliance score filter', async () => {
    render(<AdvancedSearch />);

    const complianceCheckbox = screen.getByLabelText('Has Compliance Score');
    await user.click(complianceCheckbox);

    expect(complianceCheckbox).toBeChecked();
  });

  it('handles date range filters', async () => {
    render(<AdvancedSearch />);

    const creationStartDate = screen.getByDisplayValue('');
    await user.type(creationStartDate, '2024-01-01');

    const creationEndDate = screen.getAllByDisplayValue('')[1];
    await user.type(creationEndDate, '2024-12-31');

    // These should be reflected in the filters when searching
    const mockResults = {
      items: [],
      total: 0,
      page: 1,
      size: 20,
      took_ms: 50,
      query: '',
      filters_applied: {}
    };

    mockSearchService.searchContracts.mockResolvedValue(mockResults);

    const searchButton = screen.getByRole('button', { name: 'Perform search' });
    await user.click(searchButton);

    await waitFor(() => {
      expect(mockSearchService.searchContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            created_at: {
              gte: '2024-01-01',
              lte: '2024-12-31'
            }
          })
        })
      );
    });
  });

  it('validates empty search and no filters', async () => {
    const mockValidateField = vi.fn();
    
    // Mock the validation hook to return our mock function
    vi.mocked(require('../../hooks/useFormValidation').useFormValidation).mockReturnValue({
      errors: {},
      validateField: mockValidateField,
      clearErrors: vi.fn(),
    });

    render(<AdvancedSearch />);

    const searchButton = screen.getByRole('button', { name: 'Perform search' });
    await user.click(searchButton);

    expect(mockValidateField).toHaveBeenCalledWith(
      'searchQuery',
      'Please enter a search query or apply filters'
    );
  });
});
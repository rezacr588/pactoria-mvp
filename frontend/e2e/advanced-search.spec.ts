import { test, expect } from '@playwright/test';

test.describe('Advanced Search', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the backend API calls
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        json: {
          id: 'test-user-id',
          email: 'test@example.com',
          full_name: 'Test User',
          is_active: true,
          timezone: 'UTC',
          company_id: 'test-company-id',
          created_at: '2024-01-01T00:00:00Z',
          last_login_at: '2024-01-01T00:00:00Z'
        }
      });
    });

    // Mock search endpoints
    await page.route('**/api/v1/search/contracts', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      await route.fulfill({
        json: {
          items: [
            {
              id: '1',
              title: 'Service Agreement with ACME Corp',
              contract_type: 'SERVICE_AGREEMENT',
              status: 'ACTIVE',
              client_name: 'ACME Corp',
              supplier_name: 'Test Company',
              contract_value: 50000,
              currency: 'GBP',
              start_date: '2024-01-01',
              end_date: '2024-12-31',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-15T00:00:00Z',
              version: 1,
              compliance_score: 95,
              risk_score: 15,
              highlights: postData.highlight ? [
                {
                  field: 'title',
                  fragments: ['<mark>Service</mark> Agreement with ACME Corp']
                }
              ] : undefined
            },
            {
              id: '2',
              title: 'Employment Contract - John Doe',
              contract_type: 'EMPLOYMENT_CONTRACT',
              status: 'ACTIVE',
              client_name: 'John Doe',
              contract_value: 75000,
              currency: 'GBP',
              start_date: '2024-02-01',
              created_at: '2024-01-20T00:00:00Z',
              version: 1,
              compliance_score: 98,
              risk_score: 5
            }
          ],
          total: 2,
          page: postData.page || 1,
          size: postData.size || 20,
          pages: 1,
          took_ms: 150,
          query: postData.query || '',
          filters_applied: postData.filters || {}
        }
      });
    });

    await page.route('**/api/v1/search/suggestions/contracts', async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q');
      
      await route.fulfill({
        json: {
          suggestions: query ? [
            `${query} agreement`,
            `${query} contract`,
            `${query} template`
          ].slice(0, 3) : [],
          query: query || '',
          total: query ? 3 : 0
        }
      });
    });

    await page.route('**/api/v1/search/facets/contracts', async (route) => {
      await route.fulfill({
        json: {
          facets: {
            status: [
              { value: 'DRAFT', count: 25 },
              { value: 'ACTIVE', count: 150 },
              { value: 'COMPLETED', count: 75 },
              { value: 'TERMINATED', count: 10 }
            ],
            contract_type: [
              { value: 'SERVICE_AGREEMENT', count: 100 },
              { value: 'EMPLOYMENT_CONTRACT', count: 80 },
              { value: 'NDA', count: 40 }
            ],
            value_ranges: [
              { min: 0, max: 1000, count: 50 },
              { min: 1000, max: 10000, count: 120 },
              { min: 10000, max: 100000, count: 80 }
            ]
          },
          generated_at: '2024-01-01T00:00:00Z'
        }
      });
    });

    // Navigate to advanced search page (assuming it's integrated into the app)
    await page.goto('/contracts/search');
    await page.waitForLoadState('networkidle');
  });

  test('should display advanced search form @smoke', async ({ page }) => {
    // Check that main search elements are visible
    await expect(page.getByLabel('Search query')).toBeVisible();
    await expect(page.getByLabel('Search operator')).toBeVisible();
    await expect(page.getByRole('button', { name: /perform search|search/i })).toBeVisible();

    // Check that filter sections are visible
    await expect(page.getByText('Filters')).toBeVisible();
    await expect(page.getByText('Sort Results')).toBeVisible();

    // Check specific filter fields
    await expect(page.getByLabel('Status')).toBeVisible();
    await expect(page.getByLabel('Client Name')).toBeVisible();
    await expect(page.getByPlaceholderText('Min value')).toBeVisible();
    await expect(page.getByPlaceholderText('Max value')).toBeVisible();
  });

  test('should perform basic search @regression', async ({ page }) => {
    const searchInput = page.getByLabel('Search query');
    const searchButton = page.getByRole('button', { name: /perform search|search/i });

    // Perform a search
    await searchInput.fill('service');
    await searchButton.click();

    // Should see loading state briefly, then results
    await page.waitForResponse('**/api/v1/search/contracts');

    // Results should be displayed (mocked data includes 2 contracts)
    await expect(page.getByText('Service Agreement with ACME Corp')).toBeVisible();
    await expect(page.getByText('Employment Contract - John Doe')).toBeVisible();
  });

  test('should show search suggestions @regression', async ({ page }) => {
    const searchInput = page.getByLabel('Search query');

    // Type in search input
    await searchInput.fill('service');
    
    // Wait for suggestions to appear
    await page.waitForResponse('**/api/v1/search/suggestions/contracts');

    // Check that suggestions are displayed
    await expect(page.getByText('service agreement')).toBeVisible();
    await expect(page.getByText('service contract')).toBeVisible();
  });

  test('should select suggestion and perform search @regression', async ({ page }) => {
    const searchInput = page.getByLabel('Search query');

    // Type to trigger suggestions
    await searchInput.fill('service');
    await page.waitForResponse('**/api/v1/search/suggestions/contracts');

    // Click on a suggestion
    await page.getByText('service agreement').click();

    // Should update search input and trigger search
    await expect(searchInput).toHaveValue('service agreement');
    await page.waitForResponse('**/api/v1/search/contracts');
  });

  test('should apply status filter @regression', async ({ page }) => {
    const statusFilter = page.getByLabel('Status');
    const searchButton = page.getByRole('button', { name: /perform search|search/i });

    // Select ACTIVE status
    await statusFilter.selectOption('ACTIVE');
    await searchButton.click();

    // Verify the API was called with the correct filter
    const response = await page.waitForResponse('**/api/v1/search/contracts');
    const requestBody = response.request().postDataJSON();
    expect(requestBody.filters.status).toEqual(['ACTIVE']);
  });

  test('should apply multiple filters @regression', async ({ page }) => {
    const clientNameInput = page.getByLabel('Client Name');
    const minValueInput = page.getByPlaceholderText('Min value');
    const maxValueInput = page.getByPlaceholderText('Max value');
    const searchButton = page.getByRole('button', { name: /perform search|search/i });

    // Apply multiple filters
    await clientNameInput.fill('ACME');
    await minValueInput.fill('1000');
    await maxValueInput.fill('100000');
    await searchButton.click();

    // Verify the API was called with all filters
    const response = await page.waitForResponse('**/api/v1/search/contracts');
    const requestBody = response.request().postDataJSON();
    
    expect(requestBody.filters.client_name).toBe('ACME');
    expect(requestBody.filters.contract_value).toEqual({
      gte: 1000,
      lte: 100000
    });
  });

  test('should add and manage sort criteria @regression', async ({ page }) => {
    const sortSelect = page.getByDisplayValue('Add sort field...');

    // Add a sort field
    await sortSelect.selectOption('title');

    // Should show the active sort
    await expect(page.getByText('title')).toBeVisible();
    await expect(page.getByTitle(/currently asc/i)).toBeVisible();

    // Toggle sort direction
    const sortToggle = page.getByTitle(/currently asc/i);
    await sortToggle.click();

    // Should show DESC
    await expect(page.getByTitle(/currently desc/i)).toBeVisible();

    // Remove sort
    const removeSort = page.getByTitle('Remove sort');
    await removeSort.click();

    // Sort should be removed
    await expect(page.getByText('title')).not.toBeVisible();
  });

  test('should clear all filters @regression', async ({ page }) => {
    const clientNameInput = page.getByLabel('Client Name');
    const clearButton = page.getByText('Clear All Filters');

    // Set a filter
    await clientNameInput.fill('Test Client');

    // Clear filters
    await clearButton.click();

    // Input should be cleared
    await expect(clientNameInput).toHaveValue('');
  });

  test('should change search operator @regression', async ({ page }) => {
    const operatorSelect = page.getByLabel('Search operator');
    const searchInput = page.getByLabel('Search query');
    const searchButton = page.getByRole('button', { name: /perform search|search/i });

    // Change operator to OR
    await operatorSelect.selectOption('OR');
    await searchInput.fill('test query');
    await searchButton.click();

    // Verify API was called with OR operator
    const response = await page.waitForResponse('**/api/v1/search/contracts');
    const requestBody = response.request().postDataJSON();
    expect(requestBody.operator).toBe('OR');
  });

  test('should handle search errors gracefully @regression', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/search/contracts', async (route) => {
      await route.fulfill({
        status: 400,
        json: {
          message: 'Invalid search parameters',
          details: 'Query too short'
        }
      });
    });

    const searchInput = page.getByLabel('Search query');
    const searchButton = page.getByRole('button', { name: /perform search|search/i });

    await searchInput.fill('ab');
    await searchButton.click();

    // Should show error message
    await expect(page.getByText(/invalid search parameters|query too short/i)).toBeVisible();
  });

  test('should display search result highlights @regression', async ({ page }) => {
    const searchInput = page.getByLabel('Search query');
    const searchButton = page.getByRole('button', { name: /perform search|search/i });

    // Perform search with highlighting enabled
    await searchInput.fill('service');
    await searchButton.click();

    await page.waitForResponse('**/api/v1/search/contracts');

    // Should show highlighted text (mocked as <mark> tags)
    await expect(page.getByText(/service/i)).toBeVisible();
  });

  test('should validate empty search with no filters @regression', async ({ page }) => {
    const searchButton = page.getByRole('button', { name: /perform search|search/i });

    // Try to search with empty input and no filters
    await searchButton.click();

    // Should show validation error
    await expect(page.getByText(/please enter a search query or apply filters/i)).toBeVisible();
  });

  test('should handle pagination in results @regression', async ({ page }) => {
    // Mock API response with pagination
    await page.route('**/api/v1/search/contracts', async (route) => {
      const requestBody = route.request().postDataJSON();
      const page_num = requestBody.page || 1;
      
      await route.fulfill({
        json: {
          items: Array.from({ length: requestBody.size || 20 }, (_, i) => ({
            id: `${page_num}-${i + 1}`,
            title: `Contract ${page_num}-${i + 1}`,
            contract_type: 'SERVICE_AGREEMENT',
            status: 'ACTIVE',
            created_at: '2024-01-01T00:00:00Z',
            version: 1,
            compliance_score: 95
          })),
          total: 100,
          page: page_num,
          size: requestBody.size || 20,
          pages: 5,
          took_ms: 150,
          query: requestBody.query || '',
          filters_applied: {}
        }
      });
    });

    const searchInput = page.getByLabel('Search query');
    const searchButton = page.getByRole('button', { name: /perform search|search/i });

    await searchInput.fill('contract');
    await searchButton.click();

    await page.waitForResponse('**/api/v1/search/contracts');

    // Should show pagination info
    await expect(page.getByText(/100.*results/i)).toBeVisible();
  });
});
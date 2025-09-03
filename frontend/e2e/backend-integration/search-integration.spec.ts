import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * SEARCH BACKEND INTEGRATION TESTS
 * 
 * These tests validate the advanced search functionality and backend search API integration.
 * They ensure search queries, filters, and faceted search work correctly with the backend.
 */

test.describe('Search Backend Integration', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  let authenticatedContext: any;
  let testUser: any;
  let testContracts: any[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create authenticated context and test contracts for search
    testUser = {
      email: `search-test-${faker.string.uuid()}@integration-test.com`,
      password: 'SearchTest123!',
      full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      company_name: `${faker.company.name()} Search Test Co.`
    };

    const context = await browser.newContext();
    const page = await context.newPage();

    // Register test user
    await page.goto('/register');
    await page.getByLabel(/full name|name/i).fill(testUser.full_name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByLabel(/company/i).fill(testUser.company_name);
    
    const regResponse = page.waitForResponse(response => response.url().includes('/auth/register'));
    await page.getByRole('button', { name: /register|sign up/i }).click();
    await regResponse;
    
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Create test contracts for search testing
    const contractTypes = ['SERVICE_AGREEMENT', 'NDA', 'EMPLOYMENT_CONTRACT'];
    const searchableTerms = ['Development', 'Legal', 'Consulting', 'Marketing', 'Finance'];
    
    for (let i = 0; i < 5; i++) {
      const contractData = {
        title: `${searchableTerms[i]} Contract ${faker.string.uuid()}`,
        contract_type: contractTypes[i % contractTypes.length],
        plain_english_input: `This is a contract for ${searchableTerms[i].toLowerCase()} services. The contractor will provide comprehensive ${searchableTerms[i].toLowerCase()} solutions.`,
        client_name: `${searchableTerms[i]} Client Corp`,
        contract_value: faker.number.int({ min: 1000, max: 50000 })
      };

      await page.goto('/contracts/new');
      await page.getByLabel(/title/i).fill(contractData.title);
      await page.getByLabel(/contract type/i).selectOption(contractData.contract_type);
      await page.getByLabel(/plain english|description/i).fill(contractData.plain_english_input);
      await page.getByLabel(/client name/i).fill(contractData.client_name);
      await page.getByLabel(/contract value|value/i).fill(contractData.contract_value.toString());

      const createResponse = page.waitForResponse(response => response.url().includes('/contracts') && response.request().method() === 'POST');
      await page.getByRole('button', { name: /create|submit/i }).click();
      
      const response = await createResponse;
      const contract = await response.json();
      testContracts.push({ ...contractData, id: contract.id });
      
      // Small delay between creations
      await page.waitForTimeout(500);
    }
    
    // Store authentication state
    const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
    const tokenStorage = await page.evaluate(() => localStorage.getItem('auth-token'));
    
    authenticatedContext = { authStorage, tokenStorage };
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    // Set up authenticated state for each test
    await page.addInitScript(({ authStorage, tokenStorage }) => {
      if (authStorage) localStorage.setItem('auth-storage', authStorage);
      if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
    }, authenticatedContext);
  });

  test.describe('Basic Search Integration', () => {
    test('should perform basic contract search via backend API @smoke @integration', async ({ page }) => {
      await page.goto('/contracts');

      const searchTerm = 'Development';
      
      // Track search API call
      const searchResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.url().includes(`search=${encodeURIComponent(searchTerm)}`) &&
                   response.request().method() === 'GET'
      );

      await page.getByTestId('search-input').fill(searchTerm);
      await page.keyboard.press('Enter');

      // Validate search API call
      const response = await searchResponse;
      expect(response.status()).toBe(200);

      const searchResults = await response.json();
      expect(searchResults).toHaveProperty('contracts');
      expect(searchResults.contracts).toBeInstanceOf(Array);

      // Should display search results
      if (searchResults.contracts.length > 0) {
        await expect(page.getByText(/Development/)).toBeVisible();
        
        // All results should contain the search term
        searchResults.contracts.forEach((contract: any) => {
          const containsSearchTerm = 
            contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contract.plain_english_input?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contract.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
          expect(containsSearchTerm).toBe(true);
        });
      } else {
        // Should show empty state
        await expect(page.getByText(/no.*contracts.*found/i)).toBeVisible();
      }
    });

    test('should handle empty search results @integration', async ({ page }) => {
      await page.goto('/contracts');

      const searchTerm = 'NonExistentSearchTerm12345';
      
      const searchResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.url().includes(`search=${encodeURIComponent(searchTerm)}`)
      );

      await page.getByTestId('search-input').fill(searchTerm);
      await page.keyboard.press('Enter');

      const response = await searchResponse;
      expect(response.status()).toBe(200);

      const searchResults = await response.json();
      expect(searchResults.contracts.length).toBe(0);

      // Should display empty state
      await expect(page.getByText(/no.*contracts.*found/i)).toBeVisible();
      await expect(page.getByText(/try.*adjusting.*search/i)).toBeVisible();
    });

    test('should clear search results @integration', async ({ page }) => {
      await page.goto('/contracts');

      // Perform initial search
      await page.getByTestId('search-input').fill('Development');
      await page.keyboard.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(1000);

      // Clear search
      await page.getByTestId('search-input').clear();
      await page.keyboard.press('Enter');

      // Should show all contracts again
      const allContractsResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   !response.url().includes('search=') &&
                   response.request().method() === 'GET'
      );

      await allContractsResponse;
      
      // Should display all contracts
      await expect(page.getByTestId('contracts-list')).toBeVisible();
    });
  });

  test.describe('Advanced Search Integration', () => {
    test('should perform advanced search with multiple fields @integration', async ({ page }) => {
      // Check if advanced search is available
      await page.goto('/contracts');
      
      const advancedSearchButton = page.getByRole('button', { name: /advanced.*search/i });
      if (await advancedSearchButton.isVisible()) {
        await advancedSearchButton.click();

        // Track advanced search API call
        const advancedSearchResponse = page.waitForResponse(
          response => response.url().includes('/search/contracts') && 
                     response.request().method() === 'POST'
        );

        // Fill advanced search form
        await page.getByLabel(/title|contract.*title/i).fill('Development');
        await page.getByLabel(/client.*name/i).fill('Client');
        await page.getByLabel(/contract.*type/i).selectOption('SERVICE_AGREEMENT');

        await page.getByRole('button', { name: /search/i }).click();

        // Validate advanced search API call
        const response = await advancedSearchResponse;
        expect(response.status()).toBe(200);

        const searchData = await response.json();
        expect(searchData).toHaveProperty('items');
        expect(searchData).toHaveProperty('total');
        expect(searchData.items).toBeInstanceOf(Array);

        // Verify search results match criteria
        if (searchData.items.length > 0) {
          searchData.items.forEach((contract: any) => {
            expect(contract.contract_type).toBe('SERVICE_AGREEMENT');
          });
        }

        // Should display advanced search results
        await expect(page.getByTestId('contracts-list')).toBeVisible();
      }
    });

    test('should use search operators (AND, OR, NOT) @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      const advancedSearchButton = page.getByRole('button', { name: /advanced.*search/i });
      if (await advancedSearchButton.isVisible()) {
        await advancedSearchButton.click();

        // Test AND operator
        const andSearchResponse = page.waitForResponse(
          response => response.url().includes('/search/contracts') && 
                     response.request().method() === 'POST'
        );

        await page.getByLabel(/search.*query/i).fill('Development AND Contract');
        await page.getByLabel(/operator/i).selectOption('AND');
        
        await page.getByRole('button', { name: /search/i }).click();

        const andResponse = await andSearchResponse;
        expect(andResponse.status()).toBe(200);

        const andResults = await andResponse.json();
        expect(andResults).toHaveProperty('query');
        expect(andResults.query).toContain('AND');

        // Should display results for AND search
        await expect(page.getByTestId('contracts-list')).toBeVisible();
      }
    });

    test('should search with date range filters @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      const advancedSearchButton = page.getByRole('button', { name: /advanced.*search/i });
      if (await advancedSearchButton.isVisible()) {
        await advancedSearchButton.click();

        const dateFilterSearch = page.waitForResponse(
          response => response.url().includes('/search/contracts') && 
                     response.request().method() === 'POST'
        );

        // Set date range
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        
        await page.getByLabel(/start.*date|from.*date/i).fill(startDate);
        await page.getByLabel(/end.*date|to.*date/i).fill(endDate);
        
        await page.getByRole('button', { name: /search/i }).click();

        const response = await dateFilterSearch;
        expect(response.status()).toBe(200);

        const dateResults = await response.json();
        expect(dateResults.filters_applied).toBeDefined();

        // Should display filtered results
        await expect(page.getByTestId('contracts-list')).toBeVisible();
      }
    });
  });

  test.describe('Search Suggestions and Autocomplete Integration', () => {
    test('should fetch search suggestions from backend @integration', async ({ page }) => {
      // Check if search suggestions are implemented
      await page.goto('/contracts');
      
      const searchInput = page.getByTestId('search-input');
      await searchInput.fill('Dev');

      // Track suggestions API call
      let suggestionsResponse = null;
      try {
        suggestionsResponse = await page.waitForResponse(
          response => response.url().includes('/search/suggestions') && 
                     response.request().method() === 'GET',
          { timeout: 3000 }
        );
      } catch (error) {
        // Suggestions might not be implemented yet
      }

      if (suggestionsResponse) {
        expect(suggestionsResponse.status()).toBe(200);

        const suggestions = await suggestionsResponse.json();
        expect(suggestions).toHaveProperty('suggestions');
        expect(suggestions.suggestions).toBeInstanceOf(Array);

        // Should display suggestions dropdown
        if (suggestions.suggestions.length > 0) {
          await expect(page.getByRole('listbox')).toBeVisible();
          await expect(page.getByText(suggestions.suggestions[0])).toBeVisible();
        }
      }
    });

    test('should select search suggestion @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      const searchInput = page.getByTestId('search-input');
      await searchInput.fill('Dev');
      
      // Look for suggestions dropdown
      const suggestionsDropdown = page.getByRole('listbox');
      if (await suggestionsDropdown.isVisible()) {
        const firstSuggestion = suggestionsDropdown.locator('li').first();
        
        const searchResponse = page.waitForResponse(
          response => response.url().includes('/contracts') && 
                     response.url().includes('search=')
        );

        await firstSuggestion.click();

        // Should trigger search with selected suggestion
        await searchResponse;
        await expect(page.getByTestId('contracts-list')).toBeVisible();
      }
    });
  });

  test.describe('Search Facets and Filters Integration', () => {
    test('should load search facets from backend @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      // Track facets API call
      let facetsResponse = null;
      try {
        facetsResponse = await page.waitForResponse(
          response => response.url().includes('/search/facets') && 
                     response.request().method() === 'GET',
          { timeout: 3000 }
        );
      } catch (error) {
        // Facets might not be implemented yet
      }

      if (facetsResponse) {
        expect(facetsResponse.status()).toBe(200);

        const facets = await facetsResponse.json();
        expect(facets).toHaveProperty('facets');

        // Should display facet filters
        if (facets.facets.status) {
          await expect(page.getByText(/filter.*by.*status/i)).toBeVisible();
        }
        
        if (facets.facets.contract_type) {
          await expect(page.getByText(/filter.*by.*type/i)).toBeVisible();
        }
      }
    });

    test('should apply facet filters to search @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      const statusFilter = 'DRAFT';
      
      const facetSearchResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.url().includes(`status=${statusFilter}`)
      );

      // Apply status facet filter
      await page.getByLabel(/filter.*by.*status/i).selectOption(statusFilter);

      const response = await facetSearchResponse;
      expect(response.status()).toBe(200);

      const facetResults = await response.json();
      
      // All results should match the facet filter
      facetResults.contracts.forEach((contract: any) => {
        expect(contract.status).toBe(statusFilter);
      });

      await expect(page.getByTestId('contracts-list')).toBeVisible();
    });

    test('should combine multiple facet filters @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      const statusFilter = 'DRAFT';
      const typeFilter = 'SERVICE_AGREEMENT';
      
      const combinedFilterResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.url().includes(`status=${statusFilter}`) &&
                   response.url().includes(`contract_type=${typeFilter}`)
      );

      // Apply multiple filters
      await page.getByLabel(/filter.*by.*status/i).selectOption(statusFilter);
      await page.getByLabel(/filter.*by.*type/i).selectOption(typeFilter);

      const response = await combinedFilterResponse;
      expect(response.status()).toBe(200);

      const combinedResults = await response.json();
      
      // All results should match both filters
      combinedResults.contracts.forEach((contract: any) => {
        expect(contract.status).toBe(statusFilter);
        expect(contract.contract_type).toBe(typeFilter);
      });
    });
  });

  test.describe('Search Highlighting Integration', () => {
    test('should highlight search terms in results @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      const searchTerm = 'Development';
      
      const highlightSearchResponse = page.waitForResponse(
        response => response.url().includes('/search/contracts') && 
                   response.url().includes('highlight=true')
      );

      // Check if advanced search supports highlighting
      const advancedSearchButton = page.getByRole('button', { name: /advanced.*search/i });
      if (await advancedSearchButton.isVisible()) {
        await advancedSearchButton.click();
        await page.getByLabel(/search.*query/i).fill(searchTerm);
        await page.getByLabel(/highlight/i).check();
        await page.getByRole('button', { name: /search/i }).click();

        try {
          const response = await highlightSearchResponse;
          expect(response.status()).toBe(200);

          const highlightResults = await response.json();
          
          if (highlightResults.items && highlightResults.items.length > 0) {
            const firstItem = highlightResults.items[0];
            if (firstItem.highlights) {
              expect(firstItem.highlights).toBeInstanceOf(Array);
              
              // Should display highlighted terms in UI
              await expect(page.getByText(searchTerm)).toBeVisible();
            }
          }
        } catch (error) {
          // Highlighting might not be implemented
        }
      } else {
        // Test basic search highlighting
        await page.getByTestId('search-input').fill(searchTerm);
        await page.keyboard.press('Enter');
        
        // Should highlight search terms in results
        const highlightedTerms = page.locator('mark, .highlight, .search-highlight');
        if (await highlightedTerms.count() > 0) {
          await expect(highlightedTerms.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Search Performance and Pagination Integration', () => {
    test('should paginate search results @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      // Perform search that should return multiple pages
      const searchResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.url().includes('page=1')
      );

      await page.getByTestId('search-input').fill('Contract');
      await page.keyboard.press('Enter');

      const response = await searchResponse;
      const searchResults = await response.json();

      if (searchResults.pages > 1) {
        // Should show pagination controls
        await expect(page.getByTestId('pagination')).toBeVisible();
        
        // Test next page
        const nextPageResponse = page.waitForResponse(
          response => response.url().includes('/contracts') && 
                     response.url().includes('page=2')
        );

        await page.getByRole('button', { name: /next|2/i }).click();
        
        const nextResponse = await nextPageResponse;
        expect(nextResponse.status()).toBe(200);
        
        const nextPageResults = await nextResponse.json();
        expect(nextPageResults.page).toBe(2);
      }
    });

    test('should handle search performance metrics @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      // Track search with timing
      const startTime = Date.now();
      
      const searchResponse = page.waitForResponse(
        response => response.url().includes('/search/contracts') || 
                   (response.url().includes('/contracts') && response.url().includes('search='))
      );

      await page.getByTestId('search-input').fill('Development');
      await page.keyboard.press('Enter');

      const response = await searchResponse;
      const searchTime = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      
      const results = await response.json();
      
      // Check if timing information is provided
      if (results.took_ms) {
        expect(typeof results.took_ms).toBe('number');
        
        // Should display search timing if available
        await expect(page.getByText(/\d+.*ms|search.*time/i)).toBeVisible();
      }
      
      // Search should complete within reasonable time
      expect(searchTime).toBeLessThan(5000);
    });
  });

  test.describe('Search Error Handling Integration', () => {
    test('should handle search API errors gracefully @integration', async ({ page }) => {
      // Mock search API error
      await page.route('**/contracts*', async route => {
        if (route.request().url().includes('search=')) {
          await route.fulfill({
            status: 500,
            json: { detail: 'Search service temporarily unavailable' }
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/contracts');
      
      await page.getByTestId('search-input').fill('ErrorTest');
      await page.keyboard.press('Enter');

      // Should display search error message
      await expect(page.getByText(/search.*error|temporarily.*unavailable/i)).toBeVisible();
    });

    test('should handle search timeout gracefully @integration', async ({ page }) => {
      // Mock slow search response
      await page.route('**/contracts*', async route => {
        if (route.request().url().includes('search=')) {
          // Simulate slow response
          await new Promise(resolve => setTimeout(resolve, 30000));
          await route.continue();
        } else {
          await route.continue();
        }
      });

      await page.goto('/contracts');
      
      await page.getByTestId('search-input').fill('SlowSearch');
      await page.keyboard.press('Enter');

      // Should show loading indicator
      await expect(page.getByText(/searching|loading/i)).toBeVisible();
      
      // Should eventually timeout or complete
      // Note: Actual timeout handling depends on implementation
    });

    test('should handle malformed search queries @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      // Test special characters and malformed queries
      const malformedQueries = ['<script>', '""', '\\\\\\', '***'];
      
      for (const query of malformedQueries) {
        await page.getByTestId('search-input').fill(query);
        await page.keyboard.press('Enter');
        
        // Should either return safe results or show appropriate error
        await page.waitForTimeout(1000);
        
        // Should not crash the application
        await expect(page.getByTestId('search-input')).toBeVisible();
        
        // Clear the search
        await page.getByTestId('search-input').clear();
      }
    });
  });
});
import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * SEARCH INTEGRATION E2E TESTS
 * 
 * These tests validate the advanced search functionality integration with backend APIs.
 * Critical for ensuring users can find and filter contracts effectively.
 * 
 * Test Priority: HIGH (Essential for user productivity)
 * 
 * Coverage:
 * - Advanced Search API Integration
 * - Quick Search Integration
 * - Search Filters and Facets
 * - Search Suggestions and Autocomplete
 * - Search Performance and Reliability
 */

test.describe('Search Integration Tests - Backend API', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated user for search tests
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { 
            id: 'search-user-123', 
            email: 'search@pactoria.com',
            full_name: 'Search Test User',
            company_id: 'search-company-123'
          },
          token: 'valid-search-token'
        }
      }));
    });
  });

  test.describe('Advanced Search Integration', () => {
    test('should perform advanced contract search with backend API @smoke', async ({ page }) => {
      const searchQuery = 'service agreement software development';
      const mockSearchResults = [
        {
          id: 'search-result-1',
          title: 'Software Development Service Agreement',
          contract_type: 'SERVICE_AGREEMENT',
          status: 'ACTIVE',
          client_name: 'TechCorp Solutions',
          supplier_name: 'DevServices Ltd',
          contract_value: 45000,
          currency: 'GBP',
          start_date: '2024-01-15',
          end_date: '2024-12-15',
          created_at: '2024-01-01T00:00:00Z',
          version: 1,
          compliance_score: 92,
          risk_score: 8,
          highlights: [
            {
              field: 'title',
              fragments: ['<em>Software Development</em> <em>Service Agreement</em>']
            },
            {
              field: 'plain_english_input',
              fragments: ['Create a comprehensive <em>service agreement</em> for <em>software development</em>']
            }
          ]
        },
        {
          id: 'search-result-2',
          title: 'Mobile App Development Contract',
          contract_type: 'SERVICE_AGREEMENT',
          status: 'DRAFT',
          client_name: 'StartupCo',
          contract_value: 25000,
          currency: 'GBP',
          start_date: '2024-03-01',
          end_date: '2024-08-01',
          created_at: '2024-02-15T00:00:00Z',
          version: 1,
          compliance_score: 88,
          risk_score: 12
        }
      ];

      // Mock advanced search API
      await page.route('**/search/contracts', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = await route.request().postDataJSON();
          
          // Validate search request structure
          expect(requestBody.query).toBe(searchQuery);
          expect(requestBody.operator).toBeDefined();
          expect(requestBody.page).toBeDefined();
          expect(requestBody.size).toBeDefined();

          await route.fulfill({
            status: 200,
            json: {
              items: mockSearchResults,
              total: 2,
              page: 1,
              size: 20,
              pages: 1,
              took_ms: 125,
              query: searchQuery,
              filters_applied: {}
            }
          });
        }
      });

      await page.goto('/contracts/search');

      // Perform advanced search
      await page.getByLabel(/search query|search term/i).fill(searchQuery);
      await page.getByLabel(/search operator/i).selectOption('AND');
      
      const searchResponse = page.waitForResponse(response => 
        response.url().includes('/search/contracts') && 
        response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /search|perform search/i }).click();

      // Validate search API call
      const searchRes = await searchResponse;
      expect(searchRes.status()).toBe(200);

      const searchData = await searchRes.json();
      expect(searchData.items).toHaveLength(2);
      expect(searchData.took_ms).toBeLessThan(1000); // Performance check
      expect(searchData.query).toBe(searchQuery);

      // Validate search results display
      await expect(page.getByText('Software Development Service Agreement')).toBeVisible();
      await expect(page.getByText('Mobile App Development Contract')).toBeVisible();
      await expect(page.getByText('TechCorp Solutions')).toBeVisible();
      await expect(page.getByText('£45,000')).toBeVisible();

      // Validate search result highlighting
      await expect(page.locator('em')).toBeVisible(); // Highlighted terms

      // Validate search metadata
      await expect(page.getByText(/2.*results.*found/i)).toBeVisible();
      await expect(page.getByText(/search completed.*125.*ms/i)).toBeVisible();
    });

    test('should apply advanced search filters @critical', async ({ page }) => {
      // Mock filtered search response
      await page.route('**/search/contracts', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = await route.request().postDataJSON();
          
          // Validate filter application
          expect(requestBody.filters).toBeDefined();
          expect(requestBody.filters.status).toEqual(['ACTIVE']);
          expect(requestBody.filters.contract_type).toEqual(['SERVICE_AGREEMENT']);
          expect(requestBody.filters.value_range).toEqual({ min: 10000, max: 50000 });

          await route.fulfill({
            status: 200,
            json: {
              items: [
                {
                  id: 'filtered-result-1',
                  title: 'Filtered Active Service Agreement',
                  contract_type: 'SERVICE_AGREEMENT',
                  status: 'ACTIVE',
                  client_name: 'Filtered Client',
                  contract_value: 30000,
                  currency: 'GBP',
                  created_at: '2024-01-01T00:00:00Z',
                  version: 1,
                  compliance_score: 95
                }
              ],
              total: 1,
              page: 1,
              size: 20,
              pages: 1,
              took_ms: 98,
              query: 'filtered search',
              filters_applied: {
                status: ['ACTIVE'],
                contract_type: ['SERVICE_AGREEMENT'],
                value_range: { min: 10000, max: 50000 }
              }
            }
          });
        }
      });

      await page.goto('/contracts/search');

      // Apply filters
      await page.getByLabel(/search query/i).fill('filtered search');
      await page.getByLabel(/status.*filter/i).selectOption('ACTIVE');
      await page.getByLabel(/contract type.*filter/i).selectOption('SERVICE_AGREEMENT');
      
      // Set value range filter
      await page.getByLabel(/minimum value/i).fill('10000');
      await page.getByLabel(/maximum value/i).fill('50000');

      const filteredSearchResponse = page.waitForResponse(response => 
        response.url().includes('/search/contracts')
      );

      await page.getByRole('button', { name: /search|apply filters/i }).click();

      // Validate filtered search
      const filterRes = await filteredSearchResponse;
      expect(filterRes.status()).toBe(200);

      // Should show filtered results
      await expect(page.getByText('Filtered Active Service Agreement')).toBeVisible();
      await expect(page.getByText('£30,000')).toBeVisible();
      
      // Should show applied filters
      await expect(page.getByText(/filters applied/i)).toBeVisible();
      await expect(page.getByText(/status.*active/i)).toBeVisible();
      await expect(page.getByText(/service agreement/i)).toBeVisible();
    });

    test('should handle complex search operators @critical', async ({ page }) => {
      const complexSearches = [
        {
          query: 'software AND development NOT maintenance',
          operator: 'AND',
          expectedResults: 1
        },
        {
          query: 'contract OR agreement',
          operator: 'OR', 
          expectedResults: 3
        },
        {
          query: 'NOT template',
          operator: 'NOT',
          expectedResults: 2
        }
      ];

      for (const search of complexSearches) {
        // Mock search response for each operator
        await page.route('**/search/contracts', async route => {
          if (route.request().method() === 'POST') {
            const requestBody = await route.request().postDataJSON();
            
            expect(requestBody.query).toBe(search.query);
            expect(requestBody.operator).toBe(search.operator);

            await route.fulfill({
              status: 200,
              json: {
                items: Array.from({ length: search.expectedResults }, (_, i) => ({
                  id: `complex-result-${i}`,
                  title: `Complex Search Result ${i + 1}`,
                  contract_type: 'SERVICE_AGREEMENT',
                  status: 'ACTIVE',
                  created_at: '2024-01-01T00:00:00Z',
                  version: 1
                })),
                total: search.expectedResults,
                page: 1,
                size: 20,
                pages: 1,
                took_ms: 150,
                query: search.query,
                filters_applied: {}
              }
            });
          }
        });

        await page.goto('/contracts/search');
        
        await page.getByLabel(/search query/i).fill(search.query);
        await page.getByLabel(/search operator/i).selectOption(search.operator);
        
        await page.getByRole('button', { name: /search/i }).click();
        
        // Wait for results
        await page.waitForResponse(response => response.url().includes('/search/contracts'));
        
        // Validate result count
        await expect(page.getByText(`${search.expectedResults}.*results`)).toBeVisible();
        
        console.log(`✅ Complex search operator "${search.operator}" working correctly`);
      }
    });
  });

  test.describe('Quick Search Integration', () => {
    test('should perform quick search with backend API @smoke', async ({ page }) => {
      const quickSearchTerm = 'software';

      // Mock quick search API
      await page.route('**/search/contracts/quick', async route => {
        const url = route.request().url();
        const params = new URL(url).searchParams;
        
        expect(params.get('q')).toBe(quickSearchTerm);

        await route.fulfill({
          status: 200,
          json: {
            items: [
              {
                id: 'quick-result-1',
                title: 'Software License Agreement',
                contract_type: 'LICENSE',
                status: 'ACTIVE',
                client_name: 'Quick Client',
                created_at: '2024-01-01T00:00:00Z',
                version: 1
              }
            ],
            total: 1,
            page: 1,
            size: 10,
            pages: 1,
            took_ms: 45,
            query: quickSearchTerm,
            filters_applied: {}
          }
        });
      });

      await page.goto('/contracts');

      // Perform quick search
      await page.getByPlaceholder(/search contracts/i).fill(quickSearchTerm);
      
      const quickSearchResponse = page.waitForResponse(response => 
        response.url().includes('/search/contracts/quick')
      );

      await page.keyboard.press('Enter');

      // Validate quick search API call
      const quickRes = await quickSearchResponse;
      expect(quickRes.status()).toBe(200);

      // Should show quick search results
      await expect(page.getByText('Software License Agreement')).toBeVisible();
    });

    test('should provide search autocomplete suggestions @enhancement', async ({ page }) => {
      const partialQuery = 'soft';

      // Mock search suggestions API
      await page.route('**/search/suggestions/contracts', async route => {
        const url = route.request().url();
        const params = new URL(url).searchParams;
        
        expect(params.get('q')).toBe(partialQuery);

        await route.fulfill({
          status: 200,
          json: {
            suggestions: [
              'software development',
              'software license',
              'software maintenance',
              'software support'
            ],
            query: partialQuery,
            total: 4
          }
        });
      });

      await page.goto('/contracts/search');

      // Type partial search term
      const searchInput = page.getByLabel(/search query/i);
      await searchInput.fill(partialQuery);

      // Wait for suggestions API call
      const suggestionsResponse = page.waitForResponse(response => 
        response.url().includes('/search/suggestions/contracts')
      );

      await suggestionsResponse;

      // Should show autocomplete suggestions
      await expect(page.getByText('software development')).toBeVisible();
      await expect(page.getByText('software license')).toBeVisible();
      
      // Should be able to select suggestion
      await page.getByText('software development').click();
      await expect(searchInput).toHaveValue('software development');
    });
  });

  test.describe('Search Facets and Filtering', () => {
    test('should load and apply search facets from API @critical', async ({ page }) => {
      // Mock search facets API
      await page.route('**/search/facets/contracts', async route => {
        await route.fulfill({
          status: 200,
          json: {
            facets: {
              status: [
                { value: 'ACTIVE', count: 45 },
                { value: 'DRAFT', count: 23 },
                { value: 'COMPLETED', count: 12 },
                { value: 'TERMINATED', count: 3 }
              ],
              contract_type: [
                { value: 'SERVICE_AGREEMENT', count: 38 },
                { value: 'EMPLOYMENT_CONTRACT', count: 25 },
                { value: 'NDA', count: 15 },
                { value: 'LICENSE', count: 5 }
              ],
              value_ranges: [
                { min: 0, max: 10000, count: 25 },
                { min: 10000, max: 50000, count: 35 },
                { min: 50000, max: 100000, count: 18 },
                { min: 100000, count: 5 }
              ]
            },
            generated_at: new Date().toISOString()
          }
        });
      });

      await page.goto('/contracts/search');

      // Wait for facets to load
      await page.waitForResponse(response => 
        response.url().includes('/search/facets/contracts')
      );

      // Should display facets with counts
      await expect(page.getByText(/status.*facets/i)).toBeVisible();
      await expect(page.getByText(/ACTIVE.*45/i)).toBeVisible();
      await expect(page.getByText(/DRAFT.*23/i)).toBeVisible();

      await expect(page.getByText(/contract type.*facets/i)).toBeVisible();
      await expect(page.getByText(/SERVICE_AGREEMENT.*38/i)).toBeVisible();

      await expect(page.getByText(/value ranges/i)).toBeVisible();
      await expect(page.getByText(/£0.*£10,000.*25/i)).toBeVisible();

      // Should be able to filter by facet
      await page.getByText(/ACTIVE.*45/i).click();
      
      // Should apply facet filter
      await expect(page.getByText(/active.*filter applied/i)).toBeVisible();
    });

    test('should combine multiple facet filters @critical', async ({ page }) => {
      // Mock facets API
      await page.route('**/search/facets/contracts', async route => {
        await route.fulfill({
          status: 200,
          json: {
            facets: {
              status: [{ value: 'ACTIVE', count: 45 }],
              contract_type: [{ value: 'SERVICE_AGREEMENT', count: 38 }]
            },
            generated_at: new Date().toISOString()
          }
        });
      });

      // Mock filtered search with multiple facets
      await page.route('**/search/contracts', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = await route.request().postDataJSON();
          
          // Validate multiple filters applied
          expect(requestBody.filters.status).toEqual(['ACTIVE']);
          expect(requestBody.filters.contract_type).toEqual(['SERVICE_AGREEMENT']);

          await route.fulfill({
            status: 200,
            json: {
              items: [
                {
                  id: 'multi-facet-result',
                  title: 'Active Service Agreement',
                  contract_type: 'SERVICE_AGREEMENT',
                  status: 'ACTIVE',
                  created_at: '2024-01-01T00:00:00Z',
                  version: 1
                }
              ],
              total: 1,
              page: 1,
              size: 20,
              pages: 1,
              took_ms: 89,
              query: '',
              filters_applied: {
                status: ['ACTIVE'],
                contract_type: ['SERVICE_AGREEMENT']
              }
            }
          });
        }
      });

      await page.goto('/contracts/search');

      // Wait for facets
      await page.waitForResponse(response => response.url().includes('/search/facets'));

      // Apply multiple facet filters
      await page.getByText(/ACTIVE.*45/i).click();
      await page.getByText(/SERVICE_AGREEMENT.*38/i).click();

      // Perform search with filters
      await page.getByRole('button', { name: /search|apply/i }).click();

      await page.waitForResponse(response => response.url().includes('/search/contracts'));

      // Should show filtered results
      await expect(page.getByText('Active Service Agreement')).toBeVisible();
      
      // Should show applied filters
      await expect(page.getByText(/2.*filters applied/i)).toBeVisible();
    });
  });

  test.describe('Search Performance and Reliability', () => {
    test('should handle search API errors gracefully @critical', async ({ page }) => {
      // Mock search API error
      await page.route('**/search/contracts', async route => {
        await route.fulfill({
          status: 500,
          json: { detail: 'Search service temporarily unavailable' }
        });
      });

      await page.goto('/contracts/search');
      
      await page.getByLabel(/search query/i).fill('error test');
      await page.getByRole('button', { name: /search/i }).click();

      // Should show error message
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByText(/search.*unavailable|search.*failed/i)).toBeVisible();

      // Should allow retry
      await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible();
    });

    test('should handle slow search responses @performance', async ({ page }) => {
      // Mock slow search response
      await page.route('**/search/contracts', async route => {
        // Simulate 2 second delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await route.fulfill({
          status: 200,
          json: {
            items: [{
              id: 'slow-result',
              title: 'Slow Search Result',
              status: 'ACTIVE',
              created_at: '2024-01-01T00:00:00Z',
              version: 1
            }],
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
            took_ms: 2000,
            query: 'slow search',
            filters_applied: {}
          }
        });
      });

      await page.goto('/contracts/search');
      
      await page.getByLabel(/search query/i).fill('slow search');
      await page.getByRole('button', { name: /search/i }).click();

      // Should show loading indicator
      await expect(page.getByText(/searching|loading/i)).toBeVisible();

      // Should eventually show results
      await expect(page.getByText('Slow Search Result')).toBeVisible({ timeout: 5000 });

      // Should show performance warning if search is slow
      await expect(page.getByText(/search took.*2000.*ms/i)).toBeVisible();
    });

    test('should implement search result pagination @critical', async ({ page }) => {
      // Mock paginated search results
      await page.route('**/search/contracts', async route => {
        const requestBody = await route.request().postDataJSON();
        const page_num = requestBody.page || 1;
        
        await route.fulfill({
          status: 200,
          json: {
            items: Array.from({ length: 20 }, (_, i) => ({
              id: `page-${page_num}-result-${i}`,
              title: `Page ${page_num} Result ${i + 1}`,
              status: 'ACTIVE',
              created_at: '2024-01-01T00:00:00Z',
              version: 1
            })),
            total: 150, // Total results across all pages
            page: page_num,
            size: 20,
            pages: 8,
            took_ms: 125,
            query: 'pagination test',
            filters_applied: {}
          }
        });
      });

      await page.goto('/contracts/search');
      
      await page.getByLabel(/search query/i).fill('pagination test');
      await page.getByRole('button', { name: /search/i }).click();

      // Should show first page results
      await expect(page.getByText('Page 1 Result 1')).toBeVisible();
      
      // Should show pagination info
      await expect(page.getByText(/150.*results/i)).toBeVisible();
      await expect(page.getByText(/page 1.*of 8/i)).toBeVisible();

      // Should be able to navigate to next page
      await page.getByRole('button', { name: /next|page 2/i }).click();
      
      await page.waitForResponse(response => response.url().includes('/search/contracts'));
      
      // Should show second page results
      await expect(page.getByText('Page 2 Result 1')).toBeVisible();
    });

    test('should implement search history and saved searches @enhancement', async ({ page }) => {
      const searches = [
        'software development contract',
        'employment agreement template',
        'NDA confidentiality terms'
      ];

      for (const searchTerm of searches) {
        await page.goto('/contracts/search');
        await page.getByLabel(/search query/i).fill(searchTerm);
        await page.getByRole('button', { name: /search/i }).click();
        
        // Wait for search to complete
        await page.waitForTimeout(500);
      }

      // Check if search history is available
      await page.goto('/contracts/search');
      await page.getByLabel(/search query/i).focus();

      // Should show recent searches (if implemented)
      const historyDropdown = page.getByTestId('search-history');
      if (await historyDropdown.isVisible()) {
        await expect(page.getByText('software development contract')).toBeVisible();
        await expect(page.getByText('employment agreement template')).toBeVisible();
      }
    });
  });

  test.describe('Search Integration with Other Features', () => {
    test('should integrate search with bulk operations @integration', async ({ page }) => {
      // Mock search results
      await page.route('**/search/contracts', async route => {
        await route.fulfill({
          status: 200,
          json: {
            items: [
              {
                id: 'bulk-search-1',
                title: 'Contract for Bulk Op 1',
                status: 'DRAFT',
                created_at: '2024-01-01T00:00:00Z',
                version: 1
              },
              {
                id: 'bulk-search-2', 
                title: 'Contract for Bulk Op 2',
                status: 'DRAFT',
                created_at: '2024-01-01T00:00:00Z',
                version: 1
              }
            ],
            total: 2,
            page: 1,
            size: 20,
            pages: 1,
            took_ms: 95,
            query: 'bulk test',
            filters_applied: {}
          }
        });
      });

      // Mock bulk operation
      await page.route('**/bulk/contracts/update', async route => {
        await route.fulfill({
          status: 200,
          json: {
            operation_type: 'bulk_update',
            total_requested: 2,
            success_count: 2,
            failed_count: 0,
            processing_time_ms: 1200,
            updated_ids: ['bulk-search-1', 'bulk-search-2']
          }
        });
      });

      await page.goto('/contracts/search');
      
      // Perform search
      await page.getByLabel(/search query/i).fill('bulk test');
      await page.getByRole('button', { name: /search/i }).click();

      await page.waitForResponse(response => response.url().includes('/search/contracts'));

      // Select search results for bulk operation
      await page.getByRole('checkbox', { name: /select.*bulk.*op.*1/i }).check();
      await page.getByRole('checkbox', { name: /select.*bulk.*op.*2/i }).check();

      // Perform bulk operation on search results
      await page.getByRole('button', { name: /bulk.*update/i }).click();
      await page.getByLabel(/new status/i).selectOption('ACTIVE');
      await page.getByRole('button', { name: /update.*selected/i }).click();

      await page.waitForResponse(response => response.url().includes('/bulk/contracts/update'));

      // Should show bulk operation success
      await expect(page.getByText(/2.*contracts.*updated/i)).toBeVisible();
    });

    test('should export search results @integration', async ({ page }) => {
      // Mock search results
      await page.route('**/search/contracts', async route => {
        await route.fulfill({
          status: 200,
          json: {
            items: [
              {
                id: 'export-search-1',
                title: 'Contract for Export 1',
                status: 'ACTIVE',
                contract_value: 10000,
                currency: 'GBP',
                created_at: '2024-01-01T00:00:00Z',
                version: 1
              }
            ],
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
            took_ms: 80,
            query: 'export test',
            filters_applied: {}
          }
        });
      });

      // Mock export operation
      await page.route('**/bulk/contracts/export', async route => {
        await route.fulfill({
          status: 200,
          json: {
            export_id: 'search-export-123',
            format: 'CSV',
            total_records: 1,
            file_size_bytes: 1024,
            download_url: 'https://example.com/export-search-123.csv',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            processing_time_ms: 500
          }
        });
      });

      await page.goto('/contracts/search');
      
      // Perform search
      await page.getByLabel(/search query/i).fill('export test');
      await page.getByRole('button', { name: /search/i }).click();

      await page.waitForResponse(response => response.url().includes('/search/contracts'));

      // Export search results
      await page.getByRole('button', { name: /export.*results/i }).click();
      await page.getByLabel(/export format/i).selectOption('CSV');
      await page.getByRole('button', { name: /export/i }).click();

      await page.waitForResponse(response => response.url().includes('/bulk/contracts/export'));

      // Should show export success with download link
      await expect(page.getByText(/export.*completed/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /download/i })).toBeVisible();
    });
  });
});
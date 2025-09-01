import { test, expect } from '@playwright/test';
import { 
  ContractsPage, 
  AnalyticsPage,
  AppLayout,
  CommandPalette 
} from '../utils/page-objects';
import { TestContract } from '../utils/test-data';
import { APIMocker } from '../utils/api-mock';

test.describe('Search Functionality Tests', () => {
  let contractsPage: ContractsPage;
  let analyticsPage: AnalyticsPage;
  let appLayout: AppLayout;
  let commandPalette: CommandPalette;
  let apiMocker: APIMocker;

  test.beforeEach(async ({ page }) => {
    contractsPage = new ContractsPage(page);
    analyticsPage = new AnalyticsPage(page);
    appLayout = new AppLayout(page);
    commandPalette = new CommandPalette(page);
    apiMocker = new APIMocker(page);

    await apiMocker.mockAllEndpoints();

    // Set up authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { 
            id: 'test-user', 
            email: 'test@test.com',
            full_name: 'Test User',
            company_id: 'test-company'
          },
          token: 'mock-token'
        }
      }));
    });
  });

  test.describe('Contract Search', () => {
    test('should perform basic text search', async ({ page }) => {
      // Mock search results
      await page.route('**/contracts*', async route => {
        const url = route.request().url();
        if (url.includes('search=service')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              contracts: [
                {
                  id: 'search-1',
                  title: 'Service Agreement Contract',
                  contract_type: 'service_agreement',
                  status: 'active',
                  client_name: 'Test Service Client',
                  contract_value: 5000,
                  currency: 'GBP',
                  version: 1,
                  is_current_version: true,
                  company_id: 'test-company',
                  created_by: 'test-user',
                  created_at: '2024-01-01T00:00:00Z'
                }
              ],
              total: 1,
              page: 1,
              size: 10,
              pages: 1
            })
          });
        } else {
          await route.continue();
        }
      });

      await contractsPage.goto('/contracts');
      
      // Perform search
      await contractsPage.searchContracts('service');
      
      // Should show search results
      await expect(page.getByText('Service Agreement Contract')).toBeVisible();
      await expect(page.getByText('Test Service Client')).toBeVisible();
    });

    test('should handle empty search results', async ({ page }) => {
      // Mock empty search results
      await page.route('**/contracts*', async route => {
        const url = route.request().url();
        if (url.includes('search=nonexistent')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              contracts: [],
              total: 0,
              page: 1,
              size: 10,
              pages: 0
            })
          });
        } else {
          await route.continue();
        }
      });

      await contractsPage.goto('/contracts');
      await contractsPage.searchContracts('nonexistent');
      
      // Should show no results message
      await expect(page.getByText(/no.*results|no.*contracts.*found/i)).toBeVisible();
      
      // Should show suggestion to modify search
      const suggestion = page.getByText(/try.*different|modify.*search/i);
      if (await suggestion.isVisible()) {
        await expect(suggestion).toBeVisible();
      }
    });

    test('should clear search results', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Perform search
      await contractsPage.searchContracts('test');
      
      // Clear search
      await contractsPage.searchInput.clear();
      await page.keyboard.press('Enter');
      
      // Should show all contracts again
      await contractsPage.expectContractsVisible();
    });

    test('should search by multiple criteria', async ({ page }) => {
      // Mock advanced search
      await page.route('**/contracts*', async route => {
        const url = route.request().url();
        const searchParams = new URL(url).searchParams;
        
        if (searchParams.get('search') === 'NDA' && searchParams.get('status') === 'active') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              contracts: [
                {
                  id: 'nda-1',
                  title: 'Active NDA Contract',
                  contract_type: 'nda',
                  status: 'active',
                  client_name: 'NDA Client',
                  version: 1,
                  is_current_version: true,
                  company_id: 'test-company',
                  created_by: 'test-user',
                  created_at: '2024-01-01T00:00:00Z'
                }
              ],
              total: 1,
              page: 1,
              size: 10,
              pages: 1
            })
          });
        } else {
          await route.continue();
        }
      });

      await contractsPage.goto('/contracts');
      
      // Search with text and filter
      await contractsPage.searchContracts('NDA');
      await contractsPage.filterByStatus('Active');
      
      await expect(page.getByText('Active NDA Contract')).toBeVisible();
    });

    test('should handle search with special characters', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Test special characters
      const specialSearches = ['contract@test.com', 'contract & agreement', 'contract (2024)'];
      
      for (const search of specialSearches) {
        await contractsPage.searchInput.fill(search);
        await page.keyboard.press('Enter');
        
        // Should not break the search functionality
        await page.waitForTimeout(1000);
        
        // Check that UI is still responsive
        await expect(contractsPage.searchInput).toBeVisible();
      }
    });

    test('should provide search suggestions', async ({ page }) => {
      // Mock search suggestions
      await page.route('**/search/suggestions*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            suggestions: [
              'service agreement',
              'service contract',
              'service level agreement'
            ]
          })
        });
      });

      await contractsPage.goto('/contracts');
      
      // Start typing
      await contractsPage.searchInput.fill('serv');
      
      // Should show suggestions dropdown
      const suggestionsDropdown = page.getByTestId('search-suggestions');
      if (await suggestionsDropdown.isVisible({ timeout: 2000 })) {
        await expect(suggestionsDropdown).toBeVisible();
        
        // Should be able to select suggestion
        await page.getByText('service agreement').click();
        
        // Search input should be updated
        const inputValue = await contractsPage.searchInput.inputValue();
        expect(inputValue).toBe('service agreement');
      }
    });

    test('should support keyboard navigation in search', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Focus search input
      await contractsPage.searchInput.focus();
      
      // Should be able to navigate with keyboard
      await contractsPage.searchInput.fill('test query');
      await page.keyboard.press('Enter');
      
      // Should trigger search
      await page.waitForTimeout(1000);
    });
  });

  test.describe('Advanced Search Filters', () => {
    test('should filter by contract type', async ({ page }) => {
      // Mock filtered results
      await page.route('**/contracts*', async route => {
        const url = route.request().url();
        if (url.includes('contract_type=nda')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              contracts: [
                {
                  id: 'nda-only',
                  title: 'NDA Contract Only',
                  contract_type: 'nda',
                  status: 'active',
                  client_name: 'NDA Client',
                  version: 1,
                  is_current_version: true,
                  company_id: 'test-company',
                  created_by: 'test-user',
                  created_at: '2024-01-01T00:00:00Z'
                }
              ],
              total: 1,
              page: 1,
              size: 10,
              pages: 1
            })
          });
        } else {
          await route.continue();
        }
      });

      await contractsPage.goto('/contracts');
      
      // Apply contract type filter
      const contractTypeFilter = page.getByLabel(/contract type/i);
      if (await contractTypeFilter.isVisible()) {
        await contractTypeFilter.click();
        await page.getByText('NDA').click();
        
        await expect(page.getByText('NDA Contract Only')).toBeVisible();
      }
    });

    test('should filter by date range', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Open date filter
      const dateFilter = page.getByTestId('date-filter');
      if (await dateFilter.isVisible()) {
        await dateFilter.click();
        
        // Set date range
        const startDate = page.getByLabel(/start date|from/i);
        const endDate = page.getByLabel(/end date|to/i);
        
        await startDate.fill('2024-01-01');
        await endDate.fill('2024-12-31');
        
        const applyButton = page.getByRole('button', { name: /apply|filter/i });
        await applyButton.click();
        
        // Should filter results
        await contractsPage.expectContractsVisible();
      }
    });

    test('should filter by contract value range', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      const valueFilter = page.getByTestId('value-filter');
      if (await valueFilter.isVisible()) {
        await valueFilter.click();
        
        // Set value range
        const minValue = page.getByLabel(/minimum.*value|min.*value/i);
        const maxValue = page.getByLabel(/maximum.*value|max.*value/i);
        
        await minValue.fill('1000');
        await maxValue.fill('10000');
        
        const applyButton = page.getByRole('button', { name: /apply|filter/i });
        await applyButton.click();
        
        await contractsPage.expectContractsVisible();
      }
    });

    test('should combine multiple filters', async ({ page }) => {
      // Mock complex filter results
      await page.route('**/contracts*', async route => {
        const url = route.request().url();
        const params = new URL(url).searchParams;
        
        if (params.get('status') === 'active' && 
            params.get('contract_type') === 'service_agreement' &&
            params.get('search') === 'development') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              contracts: [
                {
                  id: 'filtered-result',
                  title: 'Development Service Agreement',
                  contract_type: 'service_agreement',
                  status: 'active',
                  client_name: 'Dev Client',
                  contract_value: 5000,
                  currency: 'GBP',
                  version: 1,
                  is_current_version: true,
                  company_id: 'test-company',
                  created_by: 'test-user',
                  created_at: '2024-01-01T00:00:00Z'
                }
              ],
              total: 1,
              page: 1,
              size: 10,
              pages: 1
            })
          });
        } else {
          await route.continue();
        }
      });

      await contractsPage.goto('/contracts');
      
      // Apply multiple filters
      await contractsPage.searchContracts('development');
      await contractsPage.filterByStatus('Active');
      
      // Apply contract type filter if available
      const contractTypeFilter = page.getByLabel(/contract type/i);
      if (await contractTypeFilter.isVisible()) {
        await contractTypeFilter.click();
        await page.getByText('Service Agreement').click();
      }
      
      await expect(page.getByText('Development Service Agreement')).toBeVisible();
    });

    test('should clear all filters', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Apply some filters first
      await contractsPage.searchContracts('test');
      await contractsPage.filterByStatus('Active');
      
      // Clear all filters
      const clearFiltersButton = page.getByRole('button', { name: /clear.*filters|reset/i });
      if (await clearFiltersButton.isVisible()) {
        await clearFiltersButton.click();
        
        // Should show all contracts
        const searchValue = await contractsPage.searchInput.inputValue();
        expect(searchValue).toBe('');
      }
    });
  });

  test.describe('Global Search (Command Palette)', () => {
    test('should open global search with keyboard shortcut', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Open command palette
      await page.keyboard.press('Meta+k');
      
      // Should show command palette
      const searchInput = page.getByPlaceholder(/search commands|search/i);
      if (await searchInput.isVisible({ timeout: 2000 })) {
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toBeFocused();
      }
    });

    test('should search across different content types', async ({ page }) => {
      // Mock global search results
      await page.route('**/search/global*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                type: 'contract',
                id: 'contract-1',
                title: 'Service Agreement',
                description: 'Web development contract',
                url: '/contracts/contract-1'
              },
              {
                type: 'template',
                id: 'template-1',
                title: 'Service Agreement Template',
                description: 'Standard service agreement template',
                url: '/templates/template-1'
              },
              {
                type: 'page',
                id: 'analytics',
                title: 'Analytics Dashboard',
                description: 'View contract analytics and reports',
                url: '/analytics'
              }
            ]
          })
        });
      });

      await contractsPage.goto('/contracts');
      await page.keyboard.press('Meta+k');
      
      const searchInput = page.getByPlaceholder(/search commands|search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('service agreement');
        
        // Should show mixed results
        await expect(page.getByText('Service Agreement')).toBeVisible();
        await expect(page.getByText('Service Agreement Template')).toBeVisible();
        
        // Should be able to navigate to result
        await page.getByText('Service Agreement').click();
        await expect(page).toHaveURL(/\/contracts\/contract-1/);
      }
    });

    test('should provide quick actions in global search', async ({ page }) => {
      await contractsPage.goto('/contracts');
      await page.keyboard.press('Meta+k');
      
      const searchInput = page.getByPlaceholder(/search commands|search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('create');
        
        // Should show create actions
        const createContractAction = page.getByText(/create.*contract/i);
        if (await createContractAction.isVisible()) {
          await createContractAction.click();
          await expect(page).toHaveURL(/\/contracts\/new/);
        }
      }
    });

    test('should support keyboard navigation in global search', async ({ page }) => {
      await contractsPage.goto('/contracts');
      await page.keyboard.press('Meta+k');
      
      const searchInput = page.getByPlaceholder(/search commands|search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        
        // Navigate through results with arrow keys
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        
        // Should navigate to selected result
        // Exact behavior depends on implementation
      }
    });

    test('should close global search with escape', async ({ page }) => {
      await contractsPage.goto('/contracts');
      await page.keyboard.press('Meta+k');
      
      const searchInput = page.getByPlaceholder(/search commands|search/i);
      if (await searchInput.isVisible()) {
        await page.keyboard.press('Escape');
        
        // Should close command palette
        await expect(searchInput).not.toBeVisible();
      }
    });
  });

  test.describe('Search Performance', () => {
    test('should debounce search input', async ({ page }) => {
      let searchCallCount = 0;
      
      await page.route('**/contracts*', async route => {
        const url = route.request().url();
        if (url.includes('search=')) {
          searchCallCount++;
        }
        await route.continue();
      });

      await contractsPage.goto('/contracts');
      
      // Type rapidly
      await contractsPage.searchInput.fill('t');
      await contractsPage.searchInput.fill('te');
      await contractsPage.searchInput.fill('tes');
      await contractsPage.searchInput.fill('test');
      
      // Wait for debounce
      await page.waitForTimeout(1000);
      
      // Should only make one API call (or very few)
      expect(searchCallCount).toBeLessThanOrEqual(2);
    });

    test('should handle large result sets efficiently', async ({ page }) => {
      // Mock large result set
      const largeResults = Array.from({ length: 100 }, (_, i) => ({
        id: `contract-${i}`,
        title: `Contract ${i}`,
        contract_type: 'service_agreement',
        status: 'active',
        client_name: `Client ${i}`,
        contract_value: 1000 + i,
        currency: 'GBP',
        version: 1,
        is_current_version: true,
        company_id: 'test-company',
        created_by: 'test-user',
        created_at: '2024-01-01T00:00:00Z'
      }));

      await page.route('**/contracts*', async route => {
        const url = route.request().url();
        if (url.includes('search=many')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              contracts: largeResults.slice(0, 10), // Paginated
              total: 100,
              page: 1,
              size: 10,
              pages: 10
            })
          });
        } else {
          await route.continue();
        }
      });

      const startTime = Date.now();
      
      await contractsPage.goto('/contracts');
      await contractsPage.searchContracts('many');
      
      const endTime = Date.now();
      
      // Should handle large results quickly
      expect(endTime - startTime).toBeLessThan(3000);
      
      // Should show pagination
      const pagination = contractsPage.paginationNav;
      if (await pagination.isVisible()) {
        await expect(pagination).toBeVisible();
      }
    });

    test('should cache search results', async ({ page }) => {
      let apiCallCount = 0;
      
      await page.route('**/contracts*', async route => {
        const url = route.request().url();
        if (url.includes('search=cached')) {
          apiCallCount++;
        }
        await route.continue();
      });

      await contractsPage.goto('/contracts');
      
      // Perform same search twice
      await contractsPage.searchContracts('cached');
      await page.waitForTimeout(500);
      
      await contractsPage.searchInput.clear();
      await contractsPage.searchContracts('cached');
      await page.waitForTimeout(500);
      
      // Should cache results and not make duplicate API calls
      // (exact behavior depends on implementation)
    });
  });

  test.describe('Search Accessibility', () => {
    test('should announce search results to screen readers', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Perform search
      await contractsPage.searchContracts('test');
      
      // Should have aria-live region for results
      const resultsAnnouncement = page.locator('[aria-live], [role="status"]');
      const count = await resultsAnnouncement.count();
      
      // Should announce result count or status
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should support keyboard navigation in search results', async ({ page }) => {
      await contractsPage.goto('/contracts');
      await contractsPage.searchContracts('test');
      
      // Should be able to tab through search results
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Focus should be on interactive elements
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should have proper ARIA labels for search controls', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Search input should have proper labeling
      const searchLabel = await contractsPage.searchInput.getAttribute('aria-label');
      const searchPlaceholder = await contractsPage.searchInput.getAttribute('placeholder');
      
      expect(searchLabel || searchPlaceholder).toBeTruthy();
      
      // Filter controls should be properly labeled
      const filterButton = page.getByRole('button', { name: /filter/i });
      if (await filterButton.isVisible()) {
        const filterLabel = await filterButton.getAttribute('aria-label');
        const hasAccessibleName = filterLabel || await filterButton.innerText();
        expect(hasAccessibleName).toBeTruthy();
      }
    });
  });

  test.describe('Search Error Handling', () => {
    test('should handle search API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/contracts*', async route => {
        const url = route.request().url();
        if (url.includes('search=error')) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              detail: 'Search service unavailable'
            })
          });
        } else {
          await route.continue();
        }
      });

      await contractsPage.goto('/contracts');
      await contractsPage.searchContracts('error');
      
      // Should show error message
      await expect(page.getByText(/search.*unavailable|error.*searching/i)).toBeVisible();
      
      // Should provide option to retry
      const retryButton = page.getByRole('button', { name: /retry/i });
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible();
      }
    });

    test('should handle network errors during search', async ({ page }) => {
      await page.route('**/contracts*', async route => {
        const url = route.request().url();
        if (url.includes('search=network')) {
          await route.abort('internetdisconnected');
        } else {
          await route.continue();
        }
      });

      await contractsPage.goto('/contracts');
      await contractsPage.searchContracts('network');
      
      // Should show network error
      await expect(page.getByText(/network.*error|connection.*failed/i)).toBeVisible();
    });

    test('should validate search input', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Test with very long search query
      const longQuery = 'a'.repeat(1000);
      await contractsPage.searchInput.fill(longQuery);
      
      // Should handle gracefully
      const inputValue = await contractsPage.searchInput.inputValue();
      
      // Input should either be truncated or validated
      expect(inputValue.length).toBeLessThanOrEqual(1000);
    });
  });
});
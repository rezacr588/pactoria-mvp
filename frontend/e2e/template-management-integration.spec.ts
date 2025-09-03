import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * TEMPLATE MANAGEMENT INTEGRATION E2E TESTS
 * 
 * These tests validate template management functionality integration with backend APIs.
 * Critical for ensuring users can create, manage, and use contract templates effectively.
 * 
 * Test Priority: HIGH (Essential for productivity and standardization)
 * 
 * Coverage:
 * - Template CRUD Operations
 * - Template Categories and Organization
 * - Template-Contract Integration
 * - Template Versioning
 * - Template Sharing and Permissions
 * - Template Search and Discovery
 * - Template Import/Export
 */

test.describe('Template Management Integration Tests - Backend API', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated user for template tests
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { 
            id: 'template-user-123', 
            email: 'template@pactoria.com',
            full_name: 'Template Manager User',
            company_id: 'template-company-123',
            role: 'ADMIN'
          },
          token: 'valid-template-token'
        }
      }));
    });
  });

  test.describe('Template CRUD Operations', () => {
    test('should create new template with backend API @smoke', async ({ page }) => {
      const templateData = {
        name: `Integration Test Template ${faker.string.uuid().slice(0, 8)}`,
        category: 'Commercial',
        contract_type: 'SERVICE_AGREEMENT',
        description: 'A comprehensive template for service agreements created during integration testing',
        template_content: `
        SERVICE AGREEMENT

        This Service Agreement ("Agreement") is entered into on {{start_date}} between:

        Client: {{client_name}}
        Address: {{client_address}}
        Email: {{client_email}}

        Service Provider: {{supplier_name}}
        Address: {{supplier_address}}
        Email: {{supplier_email}}

        SCOPE OF SERVICES:
        {{service_description}}

        PAYMENT TERMS:
        Total Contract Value: {{contract_value}} {{currency}}
        Payment Schedule: {{payment_schedule}}

        TERM:
        This Agreement shall commence on {{start_date}} and continue until {{end_date}}.

        {{additional_terms}}
        `,
        compliance_features: ['GDPR Compliant', 'Employment Law Compliant'],
        legal_notes: 'This template has been reviewed by legal experts and is suitable for standard service agreements.',
        suitable_for: ['Small Business', 'Enterprise', 'Startups']
      };

      // Mock template creation API
      await page.route('**/templates', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = await route.request().postDataJSON();
          
          // Validate template creation request
          expect(requestBody.name).toBe(templateData.name);
          expect(requestBody.category).toBe(templateData.category);
          expect(requestBody.contract_type).toBe(templateData.contract_type);
          expect(requestBody.template_content).toContain('SERVICE AGREEMENT');
          expect(requestBody.compliance_features).toContain('GDPR Compliant');

          await route.fulfill({
            status: 201,
            json: {
              id: 'template-new-123',
              ...requestBody,
              version: '1.0',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: null
            }
          });
        }
      });

      await page.goto('/templates/new');

      // Fill template creation form
      await page.getByLabel(/template name/i).fill(templateData.name);
      await page.getByLabel(/category/i).fill(templateData.category);
      await page.getByLabel(/contract type/i).selectOption(templateData.contract_type);
      await page.getByLabel(/description/i).fill(templateData.description);
      await page.getByLabel(/template content/i).fill(templateData.template_content);
      
      // Add compliance features
      await page.getByLabel(/gdpr compliant/i).check();
      await page.getByLabel(/employment law/i).check();
      
      // Add legal notes
      await page.getByLabel(/legal notes/i).fill(templateData.legal_notes);
      
      // Select suitable for options
      await page.getByLabel(/small business/i).check();
      await page.getByLabel(/enterprise/i).check();

      // Submit template creation
      const createResponse = page.waitForResponse(response => 
        response.url().includes('/templates') && 
        response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /create template/i }).click();

      // Validate template creation API call
      const createRes = await createResponse;
      expect(createRes.status()).toBe(201);

      const createdTemplate = await createRes.json();
      expect(createdTemplate.id).toBeDefined();
      expect(createdTemplate.name).toBe(templateData.name);
      expect(createdTemplate.version).toBe('1.0');

      // Should redirect to template view
      await expect(page).toHaveURL(`/templates/${createdTemplate.id}`);
      
      // Should display template details
      await expect(page.getByText(templateData.name)).toBeVisible();
      await expect(page.getByText(templateData.category)).toBeVisible();
      await expect(page.getByText('SERVICE_AGREEMENT')).toBeVisible();
      await expect(page.getByText(/gdpr compliant/i)).toBeVisible();
    });

    test('should read and display template from backend @smoke', async ({ page }) => {
      const templateId = 'template-display-456';

      // Mock template data response
      await page.route(`**/templates/${templateId}`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            id: templateId,
            name: 'Standard Employment Contract Template',
            category: 'Employment',
            contract_type: 'EMPLOYMENT_CONTRACT',
            description: 'Comprehensive employment contract template with all standard clauses',
            template_content: 'EMPLOYMENT AGREEMENT\n\nEmployee: {{employee_name}}\nPosition: {{position}}\nSalary: {{salary}} {{currency}}',
            compliance_features: ['Employment Law Compliant', 'GDPR Compliant'],
            legal_notes: 'Updated to reflect latest employment law changes',
            version: '2.1',
            is_active: true,
            suitable_for: ['All Company Sizes'],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z'
          }
        });
      });

      await page.goto(`/templates/${templateId}`);

      // Wait for template API call
      await page.waitForResponse(response => 
        response.url().includes(`/templates/${templateId}`)
      );

      // Should display template information
      await expect(page.getByText('Standard Employment Contract Template')).toBeVisible();
      await expect(page.getByText('Employment')).toBeVisible();
      await expect(page.getByText('EMPLOYMENT_CONTRACT')).toBeVisible();
      await expect(page.getByText('Version 2.1')).toBeVisible();
      await expect(page.getByText(/employment law compliant/i)).toBeVisible();
      await expect(page.getByText(/template_content.*employee_name/i)).toBeVisible();
    });

    test('should update template via backend API @critical', async ({ page }) => {
      const templateId = 'template-update-789';
      
      // Mock initial template data
      await page.route(`**/templates/${templateId}`, async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            json: {
              id: templateId,
              name: 'Original Template Name',
              category: 'Legal',
              contract_type: 'NDA',
              description: 'Original description',
              template_content: 'Original template content',
              compliance_features: ['GDPR Compliant'],
              version: '1.0',
              is_active: true,
              suitable_for: ['Enterprise'],
              created_at: '2024-01-01T00:00:00Z'
            }
          });
        } else if (route.request().method() === 'PUT') {
          const updateData = await route.request().postDataJSON();
          
          // Validate update request
          expect(updateData.name).toBeDefined();
          expect(updateData.description).toBeDefined();
          
          await route.fulfill({
            status: 200,
            json: {
              id: templateId,
              ...updateData,
              version: '1.1', // Version increment
              updated_at: new Date().toISOString()
            }
          });
        }
      });

      await page.goto(`/templates/${templateId}`);
      
      // Enter edit mode
      await page.getByRole('button', { name: /edit template/i }).click();
      
      // Update template fields
      const updatedName = 'Updated Template Name via API';
      const updatedDescription = 'Updated description with new requirements';
      const updatedContent = 'Updated template content with {{new_variables}}';

      await page.getByLabel(/template name/i).fill(updatedName);
      await page.getByLabel(/description/i).fill(updatedDescription);
      await page.getByLabel(/template content/i).fill(updatedContent);
      
      // Add new compliance feature
      await page.getByLabel(/employment law/i).check();

      // Submit update
      const updateResponse = page.waitForResponse(response => 
        response.url().includes(`/templates/${templateId}`) && 
        response.request().method() === 'PUT'
      );

      await page.getByRole('button', { name: /save.*template/i }).click();

      // Validate update API call
      const updateRes = await updateResponse;
      expect(updateRes.status()).toBe(200);

      // Should display updated information
      await expect(page.getByText(updatedName)).toBeVisible();
      await expect(page.getByText(updatedDescription)).toBeVisible();
      await expect(page.getByText('Version 1.1')).toBeVisible();
      await expect(page.getByText(/employment law compliant/i)).toBeVisible();
    });

    test('should delete template via backend API @critical', async ({ page }) => {
      const templateId = 'template-delete-321';

      // Mock template data and deletion
      await page.route(`**/templates/${templateId}`, async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            json: {
              id: templateId,
              name: 'Template to Delete',
              category: 'Test',
              contract_type: 'NDA',
              description: 'Template for deletion testing',
              template_content: 'Content to be deleted',
              version: '1.0',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z'
            }
          });
        } else if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 204,
            body: ''
          });
        }
      });

      await page.goto(`/templates/${templateId}`);
      
      // Initiate deletion
      await page.getByRole('button', { name: /delete template/i }).click();
      
      // Confirm deletion in modal
      await page.getByRole('button', { name: /confirm.*delete/i }).click();

      // Validate delete API call
      const deleteResponse = page.waitForResponse(response => 
        response.url().includes(`/templates/${templateId}`) && 
        response.request().method() === 'DELETE'
      );

      const deleteRes = await deleteResponse;
      expect(deleteRes.status()).toBe(204);

      // Should redirect to templates list
      await expect(page).toHaveURL('/templates');
      
      // Should show success message
      await expect(page.getByText(/template.*deleted/i)).toBeVisible();
    });
  });

  test.describe('Template Categories and Organization', () => {
    test('should load template categories from backend @smoke', async ({ page }) => {
      // Mock categories API
      await page.route('**/templates/categories', async route => {
        await route.fulfill({
          status: 200,
          json: [
            'Commercial',
            'Employment', 
            'Legal',
            'Technology',
            'Real Estate',
            'Finance',
            'Healthcare'
          ]
        });
      });

      // Mock contract types API
      await page.route('**/templates/contract-types', async route => {
        await route.fulfill({
          status: 200,
          json: [
            'SERVICE_AGREEMENT',
            'EMPLOYMENT_CONTRACT',
            'NDA',
            'LICENSE_AGREEMENT',
            'LEASE_AGREEMENT',
            'PURCHASE_ORDER'
          ]
        });
      });

      await page.goto('/templates');

      // Should load categories
      await expect(page.getByText('Commercial')).toBeVisible();
      await expect(page.getByText('Employment')).toBeVisible();
      await expect(page.getByText('Legal')).toBeVisible();
      await expect(page.getByText('Technology')).toBeVisible();

      // Should be able to filter by category
      await page.getByTestId('category-filter-commercial').click();
      
      // Should make filtered request
      await page.waitForResponse(response => 
        response.url().includes('/templates') && 
        response.url().includes('category=Commercial')
      );
    });

    test('should organize templates by contract type @organization', async ({ page }) => {
      // Mock templates grouped by type
      await page.route('**/templates', async route => {
        const url = route.request().url();
        const params = new URL(url).searchParams;
        const contractType = params.get('contract_type');

        let templates;
        if (contractType === 'SERVICE_AGREEMENT') {
          templates = [
            {
              id: 'sa-template-1',
              name: 'Basic Service Agreement',
              contract_type: 'SERVICE_AGREEMENT',
              category: 'Commercial'
            },
            {
              id: 'sa-template-2',
              name: 'Enterprise Service Agreement',
              contract_type: 'SERVICE_AGREEMENT',
              category: 'Commercial'
            }
          ];
        } else {
          templates = [
            {
              id: 'template-1',
              name: 'General Template 1',
              contract_type: 'NDA',
              category: 'Legal'
            }
          ];
        }

        await route.fulfill({
          status: 200,
          json: {
            templates,
            total: templates.length,
            page: 1,
            size: 20,
            pages: 1
          }
        });
      });

      await page.goto('/templates');

      // Filter by service agreement type
      await page.getByTestId('contract-type-filter').selectOption('SERVICE_AGREEMENT');
      
      await page.waitForResponse(response => 
        response.url().includes('contract_type=SERVICE_AGREEMENT')
      );

      // Should show only service agreement templates
      await expect(page.getByText('Basic Service Agreement')).toBeVisible();
      await expect(page.getByText('Enterprise Service Agreement')).toBeVisible();
      await expect(page.getByText('General Template 1')).not.toBeVisible();
    });
  });

  test.describe('Template-Contract Integration', () => {
    test('should create contract from template @integration', async ({ page }) => {
      const templateId = 'integration-template-456';
      
      // Mock template data
      await page.route(`**/templates/${templateId}`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            id: templateId,
            name: 'Service Agreement Template',
            contract_type: 'SERVICE_AGREEMENT',
            template_content: `
            SERVICE AGREEMENT
            
            Client: {{client_name}}
            Service Provider: {{supplier_name}}
            Value: {{contract_value}} {{currency}}
            Start Date: {{start_date}}
            End Date: {{end_date}}
            `,
            compliance_features: ['GDPR Compliant'],
            version: '1.0'
          }
        });
      });

      // Mock contract creation with template
      await page.route('**/contracts', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = await route.request().postDataJSON();
          
          // Validate template was used
          expect(requestBody.template_id).toBe(templateId);
          expect(requestBody.title).toBeDefined();
          expect(requestBody.contract_type).toBe('SERVICE_AGREEMENT');

          await route.fulfill({
            status: 201,
            json: {
              id: 'contract-from-template-789',
              title: requestBody.title,
              contract_type: requestBody.contract_type,
              template_id: templateId,
              status: 'DRAFT',
              plain_english_input: requestBody.plain_english_input,
              generated_content: null,
              version: 1,
              created_at: new Date().toISOString()
            }
          });
        }
      });

      await page.goto(`/templates/${templateId}`);
      
      // Create contract from template
      await page.getByRole('button', { name: /use.*template|create.*contract/i }).click();
      
      // Should pre-populate contract form
      await expect(page.getByLabel(/contract type/i)).toHaveValue('SERVICE_AGREEMENT');
      
      // Fill additional contract details
      const contractTitle = 'Contract Created from Template';
      const contractDescription = 'Integration test contract using the service agreement template';
      
      await page.getByLabel(/title/i).fill(contractTitle);
      await page.getByLabel(/plain english|description/i).fill(contractDescription);
      await page.getByLabel(/client name/i).fill('Template Test Client');
      await page.getByLabel(/contract value/i).fill('15000');

      // Submit contract creation
      const contractResponse = page.waitForResponse(response => 
        response.url().includes('/contracts') && 
        response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /create contract/i }).click();

      // Validate contract creation with template
      const contractRes = await contractResponse;
      expect(contractRes.status()).toBe(201);

      const createdContract = await contractRes.json();
      expect(createdContract.template_id).toBe(templateId);

      // Should redirect to contract view
      await expect(page).toHaveURL(`/contracts/${createdContract.id}`);
      await expect(page.getByText(contractTitle)).toBeVisible();
    });

    test('should preview template variables before contract creation @preview', async ({ page }) => {
      const templateId = 'preview-template-123';

      // Mock template with variables
      await page.route(`**/templates/${templateId}`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            id: templateId,
            name: 'Variable-Rich Template',
            template_content: `
            Contract between {{client_name}} and {{supplier_name}}.
            
            Services: {{service_description}}
            Value: {{contract_value}} {{currency}}
            Duration: {{start_date}} to {{end_date}}
            
            {{client_name}} agrees to pay {{supplier_name}} the amount of 
            {{contract_value}} {{currency}} for {{service_description}}.
            `,
            contract_type: 'SERVICE_AGREEMENT'
          }
        });
      });

      await page.goto(`/templates/${templateId}`);
      
      // Open template preview
      await page.getByRole('button', { name: /preview.*template/i }).click();
      
      // Should show template variables
      await expect(page.getByText('{{client_name}}')).toBeVisible();
      await expect(page.getByText('{{supplier_name}}')).toBeVisible();
      await expect(page.getByText('{{service_description}}')).toBeVisible();
      await expect(page.getByText('{{contract_value}}')).toBeVisible();
      await expect(page.getByText('{{currency}}')).toBeVisible();

      // Should provide sample values for preview
      await page.getByLabel(/client name.*sample/i).fill('Acme Corporation');
      await page.getByLabel(/supplier name.*sample/i).fill('Service Provider Ltd');
      await page.getByLabel(/service description.*sample/i).fill('Software development services');
      await page.getByLabel(/contract value.*sample/i).fill('50000');
      await page.getByLabel(/currency.*sample/i).selectOption('GBP');

      await page.getByRole('button', { name: /apply.*preview/i }).click();

      // Should show populated template preview
      await expect(page.getByText('Acme Corporation')).toBeVisible();
      await expect(page.getByText('Service Provider Ltd')).toBeVisible();
      await expect(page.getByText('Software development services')).toBeVisible();
      await expect(page.getByText('50000 GBP')).toBeVisible();
    });
  });

  test.describe('Template Versioning', () => {
    test('should create new template version @versioning', async ({ page }) => {
      const templateId = 'versioned-template-456';

      // Mock template versions
      await page.route(`**/templates/${templateId}`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            id: templateId,
            name: 'Versioned Template',
            version: '1.0',
            template_content: 'Original template content v1.0',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z'
          }
        });
      });

      // Mock version creation
      await page.route(`**/templates/${templateId}/versions`, async route => {
        if (route.request().method() === 'POST') {
          const requestBody = await route.request().postDataJSON();
          
          await route.fulfill({
            status: 201,
            json: {
              id: templateId,
              name: requestBody.name,
              version: '2.0',
              template_content: requestBody.template_content,
              is_active: true,
              version_notes: requestBody.version_notes,
              created_at: new Date().toISOString()
            }
          });
        }
      });

      await page.goto(`/templates/${templateId}`);
      
      // Create new version
      await page.getByRole('button', { name: /new.*version/i }).click();
      
      // Update template content for new version
      const newContent = 'Updated template content v2.0 with improved clauses';
      const versionNotes = 'Added new compliance requirements and improved language';

      await page.getByLabel(/template content/i).fill(newContent);
      await page.getByLabel(/version notes/i).fill(versionNotes);

      const versionResponse = page.waitForResponse(response => 
        response.url().includes(`/templates/${templateId}/versions`)
      );

      await page.getByRole('button', { name: /create.*version/i }).click();

      // Validate version creation
      const versionRes = await versionResponse;
      expect(versionRes.status()).toBe(201);

      // Should show new version
      await expect(page.getByText('Version 2.0')).toBeVisible();
      await expect(page.getByText(newContent)).toBeVisible();
      await expect(page.getByText(versionNotes)).toBeVisible();
    });

    test('should manage template version history @versioning', async ({ page }) => {
      const templateId = 'history-template-789';

      // Mock version history
      await page.route(`**/templates/${templateId}/versions`, async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            json: {
              versions: [
                {
                  version: '2.0',
                  is_active: true,
                  created_at: '2024-01-15T00:00:00Z',
                  created_by: 'user-123',
                  version_notes: 'Updated compliance requirements'
                },
                {
                  version: '1.1',
                  is_active: false,
                  created_at: '2024-01-10T00:00:00Z',
                  created_by: 'user-456',
                  version_notes: 'Fixed minor formatting issues'
                },
                {
                  version: '1.0',
                  is_active: false,
                  created_at: '2024-01-01T00:00:00Z',
                  created_by: 'user-123',
                  version_notes: 'Initial template version'
                }
              ]
            }
          });
        }
      });

      await page.goto(`/templates/${templateId}/versions`);

      // Should show version history
      await expect(page.getByText('Version 2.0')).toBeVisible();
      await expect(page.getByText('Version 1.1')).toBeVisible();
      await expect(page.getByText('Version 1.0')).toBeVisible();

      // Should show version details
      await expect(page.getByText('Updated compliance requirements')).toBeVisible();
      await expect(page.getByText('Fixed minor formatting issues')).toBeVisible();
      await expect(page.getByText('Initial template version')).toBeVisible();

      // Should show active version indicator
      await expect(page.getByText(/version 2.0.*active/i)).toBeVisible();

      // Should allow version comparison
      await page.getByTestId('compare-versions-button').click();
      await page.getByTestId('version-1.1-checkbox').check();
      await page.getByTestId('version-2.0-checkbox').check();
      await page.getByRole('button', { name: /compare.*selected/i }).click();

      // Should show version comparison
      await expect(page.getByText(/comparing.*1.1.*2.0/i)).toBeVisible();
    });
  });

  test.describe('Template Search and Discovery', () => {
    test('should search templates by content and metadata @search', async ({ page }) => {
      const searchQuery = 'employment contract salary';

      // Mock template search
      await page.route('**/search/templates', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = await route.request().postDataJSON();
          expect(requestBody.query).toBe(searchQuery);

          await route.fulfill({
            status: 200,
            json: {
              items: [
                {
                  id: 'search-template-1',
                  name: 'Senior Developer Employment Contract',
                  category: 'Employment',
                  contract_type: 'EMPLOYMENT_CONTRACT',
                  description: 'Template for senior developer positions with competitive salary packages',
                  version: '1.5',
                  is_active: true,
                  highlights: [
                    {
                      field: 'template_content',
                      fragments: ['<em>salary</em> package', '<em>employment</em> terms']
                    }
                  ]
                },
                {
                  id: 'search-template-2',
                  name: 'Standard Employment Agreement',
                  category: 'Employment',
                  contract_type: 'EMPLOYMENT_CONTRACT',
                  description: 'General employment contract template with standard salary clauses',
                  version: '2.0',
                  is_active: true
                }
              ],
              total: 2,
              page: 1,
              size: 20,
              took_ms: 95,
              query: searchQuery
            }
          });
        }
      });

      await page.goto('/templates/search');

      // Perform template search
      await page.getByLabel(/search templates/i).fill(searchQuery);
      
      const searchResponse = page.waitForResponse(response => 
        response.url().includes('/search/templates')
      );

      await page.getByRole('button', { name: /search/i }).click();

      // Validate search results
      const searchRes = await searchResponse;
      expect(searchRes.status()).toBe(200);

      await expect(page.getByText('Senior Developer Employment Contract')).toBeVisible();
      await expect(page.getByText('Standard Employment Agreement')).toBeVisible();
      await expect(page.getByText('2 templates found')).toBeVisible();

      // Should show search highlights
      await expect(page.locator('em')).toBeVisible();
    });

    test('should recommend templates based on usage patterns @recommendation', async ({ page }) => {
      // Mock template recommendations API
      await page.route('**/templates/recommendations', async route => {
        await route.fulfill({
          status: 200,
          json: {
            recommendations: [
              {
                id: 'rec-template-1',
                name: 'Popular Service Agreement',
                category: 'Commercial',
                reason: 'Most used in your industry',
                usage_count: 156,
                rating: 4.8
              },
              {
                id: 'rec-template-2',
                name: 'Modern NDA Template',
                category: 'Legal',
                reason: 'Recently updated with new clauses',
                usage_count: 89,
                rating: 4.6
              }
            ]
          }
        });
      });

      await page.goto('/templates');

      // Should show recommendations section
      await expect(page.getByText(/recommended.*templates/i)).toBeVisible();
      await expect(page.getByText('Popular Service Agreement')).toBeVisible();
      await expect(page.getByText('Modern NDA Template')).toBeVisible();

      // Should show recommendation reasons
      await expect(page.getByText('Most used in your industry')).toBeVisible();
      await expect(page.getByText('Recently updated with new clauses')).toBeVisible();

      // Should show usage statistics
      await expect(page.getByText('156 uses')).toBeVisible();
      await expect(page.getByText('Rating: 4.8')).toBeVisible();
    });
  });

  test.describe('Template Performance and Analytics', () => {
    test('should track template usage analytics @analytics', async ({ page }) => {
      const templateId = 'analytics-template-123';

      // Mock template analytics
      await page.route(`**/templates/${templateId}/analytics`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            usage_stats: {
              total_uses: 47,
              successful_contracts: 42,
              success_rate: 89.4,
              average_generation_time: 2.3,
              most_common_variables: [
                { variable: 'client_name', usage_count: 47 },
                { variable: 'contract_value', usage_count: 45 },
                { variable: 'start_date', usage_count: 44 }
              ]
            },
            time_series: {
              daily_usage: [
                { date: '2024-01-01', uses: 3 },
                { date: '2024-01-02', uses: 5 },
                { date: '2024-01-03', uses: 2 }
              ]
            },
            user_feedback: {
              average_rating: 4.2,
              total_ratings: 15,
              common_feedback: ['Easy to use', 'Comprehensive clauses', 'Good legal coverage']
            }
          }
        });
      });

      await page.goto(`/templates/${templateId}/analytics`);

      // Should display usage statistics
      await expect(page.getByText('47 total uses')).toBeVisible();
      await expect(page.getByText('89.4% success rate')).toBeVisible();
      await expect(page.getByText('2.3s average generation time')).toBeVisible();

      // Should show most used variables
      await expect(page.getByText('client_name: 47 uses')).toBeVisible();
      await expect(page.getByText('contract_value: 45 uses')).toBeVisible();

      // Should display user feedback
      await expect(page.getByText('4.2 average rating')).toBeVisible();
      await expect(page.getByText('Easy to use')).toBeVisible();
      await expect(page.getByText('Comprehensive clauses')).toBeVisible();
    });

    test('should handle template validation and compliance checking @validation', async ({ page }) => {
      const templateId = 'validation-template-456';

      // Mock template validation API
      await page.route(`**/templates/${templateId}/validate`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            validation_result: {
              is_valid: false,
              errors: [
                {
                  type: 'missing_variable',
                  message: 'Required variable {{end_date}} is missing from template',
                  severity: 'error'
                },
                {
                  type: 'compliance_issue',
                  message: 'Template may not comply with GDPR requirements',
                  severity: 'warning'
                }
              ],
              suggestions: [
                'Add {{end_date}} variable to specify contract duration',
                'Include data protection clause for GDPR compliance'
              ]
            }
          }
        });
      });

      await page.goto(`/templates/${templateId}`);

      // Trigger template validation
      await page.getByRole('button', { name: /validate.*template/i }).click();

      await page.waitForResponse(response => 
        response.url().includes(`/templates/${templateId}/validate`)
      );

      // Should show validation results
      await expect(page.getByText(/validation.*failed/i)).toBeVisible();
      await expect(page.getByText('Required variable {{end_date}} is missing')).toBeVisible();
      await expect(page.getByText('may not comply with GDPR')).toBeVisible();

      // Should show suggestions
      await expect(page.getByText('Add {{end_date}} variable')).toBeVisible();
      await expect(page.getByText('Include data protection clause')).toBeVisible();

      // Should categorize issues by severity
      await expect(page.getByTestId('error-issues')).toBeVisible();
      await expect(page.getByTestId('warning-issues')).toBeVisible();
    });
  });
});
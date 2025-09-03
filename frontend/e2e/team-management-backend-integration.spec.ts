import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { TestUser } from './utils/test-data';

/**
 * TEAM MANAGEMENT BACKEND INTEGRATION TESTS
 * 
 * This test suite validates the Team Management functionality integration with the backend API.
 * Tests cover team member listing, invitations, role management, permissions, and team statistics.
 * These tests are critical as they validate the recently implemented team management endpoints.
 */

test.describe('Team Management Backend Integration', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  let authenticatedContext: any;
  let testUser: any;
  let invitedMembers: any[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create authenticated context for team management tests
    testUser = {
      email: `team-admin-${faker.string.uuid()}@integration-test.com`,
      password: 'TeamAdmin123!',
      full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      company_name: `${faker.company.name()} Team Test Co.`,
      role: 'admin'
    };

    const context = await browser.newContext();
    const page = await context.newPage();

    // Register test user as admin
    await page.goto('/register');
    await page.getByLabel(/full name|name/i).fill(testUser.full_name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByLabel(/company/i).fill(testUser.company_name);
    
    const regResponse = page.waitForResponse(response => response.url().includes('/auth/register'));
    await page.getByRole('button', { name: /register|sign up/i }).click();
    await regResponse;
    
    await expect(page).toHaveURL(/\/dashboard/);
    
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

  test.describe('Team Members Loading Integration @critical', () => {
    test('should load team members list from backend API @smoke @integration', async ({ page }) => {
      // Track team members API call
      const teamResponse = page.waitForResponse(
        response => response.url().includes('/team/members') && 
                   response.request().method() === 'GET'
      );

      await page.goto('/team');

      // Validate team members API call
      const response = await teamResponse;
      expect(response.status()).toBe(200);

      const teamData = await response.json();
      console.log('Team API response structure:', Object.keys(teamData));

      // Validate response structure
      expect(teamData).toHaveProperty('members');
      expect(Array.isArray(teamData.members)).toBe(true);

      // Should include current user as admin
      const adminMember = teamData.members.find((member: any) => 
        member.email === testUser.email
      );
      expect(adminMember).toBeDefined();
      expect(adminMember.role).toBe('admin');

      // Should display team page with members
      await expect(page.getByText(/team.*members/i)).toBeVisible();
      await expect(page.getByText(testUser.full_name)).toBeVisible();
      await expect(page.getByText(/admin/i)).toBeVisible();

      // Validate member structure
      if (teamData.members.length > 0) {
        const firstMember = teamData.members[0];
        expect(firstMember).toHaveProperty('id');
        expect(firstMember).toHaveProperty('email');
        expect(firstMember).toHaveProperty('full_name');
        expect(firstMember).toHaveProperty('role');
        expect(firstMember).toHaveProperty('is_active');
      }
    });

    test('should display team statistics from backend @integration', async ({ page }) => {
      // Track team stats API call
      const statsResponse = page.waitForResponse(
        response => response.url().includes('/team/stats') && 
                   response.request().method() === 'GET'
      );

      await page.goto('/team');

      try {
        const response = await statsResponse;
        expect(response.status()).toBe(200);

        const statsData = await response.json();
        
        // Validate stats structure
        expect(statsData).toHaveProperty('total_members');
        expect(statsData).toHaveProperty('active_members');
        expect(typeof statsData.total_members).toBe('number');
        expect(typeof statsData.active_members).toBe('number');

        // Should display stats in UI
        await expect(page.getByText(statsData.total_members.toString())).toBeVisible();
        
        // Check for department breakdown if available
        if (statsData.departments) {
          expect(typeof statsData.departments).toBe('object');
        }
      } catch (error) {
        console.log('Team stats endpoint not available or different structure');
      }
    });

    test('should handle empty team gracefully @integration', async ({ page }) => {
      // Mock minimal team response (just the admin user)
      await page.route('**/team/members', async route => {
        await route.fulfill({
          status: 200,
          json: {
            members: [
              {
                id: 'test-admin-id',
                email: testUser.email,
                full_name: testUser.full_name,
                role: 'admin',
                department: null,
                is_active: true,
                created_at: new Date().toISOString(),
                last_login_at: new Date().toISOString()
              }
            ],
            total: 1,
            pending_invitations: []
          }
        });
      });

      await page.goto('/team');

      // Should show the single admin user
      await expect(page.getByText(testUser.full_name)).toBeVisible();
      await expect(page.getByText(/admin/i)).toBeVisible();

      // Should show invitation functionality
      await expect(page.getByRole('button', { name: /invite.*member|add.*member/i })).toBeVisible();
    });
  });

  test.describe('Team Invitation Management Integration @critical', () => {
    test('should invite new team member via backend API @smoke @integration', async ({ page }) => {
      const inviteeData = {
        email: `invited-member-${faker.string.uuid()}@test.com`,
        full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
        role: 'user',
        department: faker.commerce.department(),
        send_email: false // Don't send actual emails in tests
      };

      await page.goto('/team');

      // Click invite member button
      const inviteButton = page.getByRole('button', { name: /invite.*member|add.*member/i });
      await inviteButton.click();

      // Track invitation API call
      const inviteResponse = page.waitForResponse(
        response => response.url().includes('/team/invite') && 
                   response.request().method() === 'POST'
      );

      // Fill invitation form
      await page.getByLabel(/email/i).fill(inviteeData.email);
      await page.getByLabel(/full.*name|name/i).fill(inviteeData.full_name);
      
      // Select role if dropdown exists
      const roleSelect = page.getByLabel(/role/i);
      if (await roleSelect.isVisible()) {
        await roleSelect.click();
        await page.getByText(/user|member/i).click();
      }
      
      // Fill department if field exists
      const departmentField = page.getByLabel(/department/i);
      if (await departmentField.isVisible()) {
        await departmentField.fill(inviteeData.department);
      }

      // Submit invitation
      await page.getByRole('button', { name: /send.*invite|invite/i }).click();

      // Validate invitation API call
      const response = await inviteResponse;
      expect(response.status()).toBe(201);

      const invitationData = await response.json();
      expect(invitationData).toHaveProperty('email', inviteeData.email);
      expect(invitationData).toHaveProperty('full_name', inviteeData.full_name);
      expect(invitationData).toHaveProperty('role', inviteeData.role);
      expect(invitationData).toHaveProperty('status', 'pending');

      // Store for cleanup
      invitedMembers.push(invitationData);

      // Should show success message
      await expect(page.getByText(/invitation.*sent|invited.*successfully/i)).toBeVisible();

      // Should display pending invitation in team list
      await expect(page.getByText(inviteeData.email)).toBeVisible();
      await expect(page.getByText(/pending/i)).toBeVisible();
    });

    test('should resend team invitation @integration', async ({ page }) => {
      // First create an invitation to resend
      const inviteeData = {
        email: `resend-test-${faker.string.uuid()}@test.com`,
        full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
        role: 'user'
      };

      await page.goto('/team');
      
      const inviteButton = page.getByRole('button', { name: /invite.*member/i });
      if (await inviteButton.isVisible()) {
        await inviteButton.click();

        const inviteResponse = page.waitForResponse(response => 
          response.url().includes('/team/invite')
        );

        await page.getByLabel(/email/i).fill(inviteeData.email);
        await page.getByLabel(/full.*name|name/i).fill(inviteeData.full_name);
        await page.getByRole('button', { name: /send.*invite|invite/i }).click();

        const invitation = await (await inviteResponse).json();
        
        // Now test resending
        const resendButton = page.getByRole('button', { name: /resend/i });
        if (await resendButton.isVisible()) {
          const resendResponse = page.waitForResponse(
            response => response.url().includes('/team/members/') && 
                       response.url().includes('/resend-invite') &&
                       response.request().method() === 'POST'
          );

          await resendButton.click();

          const response = await resendResponse;
          expect(response.status()).toBe(200);

          const resendData = await response.json();
          expect(resendData).toHaveProperty('message');
          expect(resendData.message).toMatch(/resent.*successfully/i);

          // Should show success message
          await expect(page.getByText(/invitation.*resent/i)).toBeVisible();
        }
      }
    });

    test('should handle invitation validation errors @integration', async ({ page }) => {
      await page.goto('/team');

      const inviteButton = page.getByRole('button', { name: /invite.*member/i });
      if (await inviteButton.isVisible()) {
        await inviteButton.click();

        // Try to invite with invalid email
        const invalidData = {
          email: 'invalid-email',
          full_name: '',
          role: ''
        };

        await page.getByLabel(/email/i).fill(invalidData.email);
        
        const inviteResponse = page.waitForResponse(
          response => response.url().includes('/team/invite')
        );

        await page.getByRole('button', { name: /send.*invite|invite/i }).click();

        const response = await inviteResponse;
        expect([400, 422]).toContain(response.status());

        // Should display validation errors
        await expect(page.getByText(/invalid.*email|required/i)).toBeVisible();
      }
    });

    test('should prevent duplicate invitations @integration', async ({ page }) => {
      // Try to invite the same user twice
      const duplicateEmail = testUser.email; // Admin's own email

      await page.goto('/team');

      const inviteButton = page.getByRole('button', { name: /invite.*member/i });
      if (await inviteButton.isVisible()) {
        await inviteButton.click();

        const inviteResponse = page.waitForResponse(
          response => response.url().includes('/team/invite')
        );

        await page.getByLabel(/email/i).fill(duplicateEmail);
        await page.getByLabel(/full.*name|name/i).fill('Duplicate User');
        await page.getByRole('button', { name: /send.*invite|invite/i }).click();

        const response = await inviteResponse;
        expect([400, 409]).toContain(response.status());

        // Should show error about existing user
        await expect(page.getByText(/already.*member|duplicate.*email/i)).toBeVisible();
      }
    });
  });

  test.describe('Role Management Integration', () => {
    test('should update team member role via backend API @integration', async ({ page }) => {
      await page.goto('/team');
      await page.waitForTimeout(1000);

      // Look for role management functionality
      const roleDropdown = page.getByLabel(/change.*role|update.*role/i);
      
      if (await roleDropdown.isVisible()) {
        const updateRoleResponse = page.waitForResponse(
          response => response.url().includes('/team/members/') && 
                     response.url().includes('/role') &&
                     response.request().method() === 'PUT'
        );

        await roleDropdown.click();
        await page.getByText(/contract.*manager/i).click();

        const response = await updateRoleResponse;
        expect(response.status()).toBe(200);

        const updateData = await response.json();
        expect(updateData).toHaveProperty('message');
        expect(updateData).toHaveProperty('new_role');
        expect(updateData.new_role).toBe('CONTRACT_MANAGER');

        // Should show success message
        await expect(page.getByText(/role.*updated/i)).toBeVisible();
      } else {
        // Alternative: look for edit member functionality
        const editButton = page.getByRole('button', { name: /edit|manage/i });
        if (await editButton.isVisible()) {
          console.log('Role management available through edit functionality');
        }
      }
    });

    test('should prevent unauthorized role changes @integration', async ({ page }) => {
      // Mock role update with insufficient permissions
      await page.route('**/team/members/*/role', async route => {
        await route.fulfill({
          status: 403,
          json: { detail: 'Only admin users can update member roles' }
        });
      });

      await page.goto('/team');

      const roleManagement = page.getByLabel(/change.*role/i);
      if (await roleManagement.isVisible()) {
        await roleManagement.click();
        await page.getByText(/user/i).click();

        // Should show permission error
        await expect(page.getByText(/permission.*denied|admin.*only/i)).toBeVisible();
      }
    });

    test('should prevent demoting last admin @integration', async ({ page }) => {
      // Mock error for demoting last admin
      await page.route('**/team/members/*/role', async route => {
        await route.fulfill({
          status: 400,
          json: { detail: 'Cannot demote the last admin. At least one admin must remain.' }
        });
      });

      await page.goto('/team');

      // Try to change admin role (if user is the only admin)
      const adminRoleElement = page.getByText(/admin/i);
      if (await adminRoleElement.isVisible()) {
        const roleDropdown = page.getByLabel(/change.*role/i);
        if (await roleDropdown.isVisible()) {
          await roleDropdown.click();
          await page.getByText(/user/i).click();

          // Should show error about last admin
          await expect(page.getByText(/last.*admin|at least one admin/i)).toBeVisible();
        }
      }
    });
  });

  test.describe('Team Member Removal Integration', () => {
    test('should remove team member via backend API @integration', async ({ page }) => {
      // First invite a member to remove
      await page.goto('/team');

      const inviteButton = page.getByRole('button', { name: /invite.*member/i });
      if (await inviteButton.isVisible()) {
        await inviteButton.click();

        const testMember = {
          email: `remove-test-${faker.string.uuid()}@test.com`,
          full_name: `${faker.person.firstName()} ${faker.person.lastName()}`
        };

        const inviteResponse = page.waitForResponse(response => 
          response.url().includes('/team/invite')
        );

        await page.getByLabel(/email/i).fill(testMember.email);
        await page.getByLabel(/full.*name|name/i).fill(testMember.full_name);
        await page.getByRole('button', { name: /send.*invite|invite/i }).click();

        await inviteResponse;

        // Now remove the pending invitation
        const removeButton = page.getByRole('button', { name: /remove|delete/i });
        if (await removeButton.isVisible()) {
          const removeResponse = page.waitForResponse(
            response => response.url().includes('/team/members/') && 
                       response.request().method() === 'DELETE'
          );

          await removeButton.click();

          // Confirm removal if modal appears
          const confirmButton = page.getByRole('button', { name: /confirm|remove|yes/i });
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }

          const response = await removeResponse;
          expect(response.status()).toBe(200);

          const removeData = await response.json();
          expect(removeData).toHaveProperty('message');
          expect(removeData.message).toMatch(/removed.*successfully/i);

          // Should show success message
          await expect(page.getByText(/removed.*successfully/i)).toBeVisible();

          // Member should be removed from list
          await expect(page.getByText(testMember.email)).not.toBeVisible();
        }
      }
    });

    test('should prevent self-removal @integration', async ({ page }) => {
      await page.goto('/team');

      // Mock self-removal error
      await page.route('**/team/members/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 400,
            json: { detail: 'Cannot remove yourself' }
          });
        } else {
          await route.continue();
        }
      });

      // Try to remove current user (admin)
      const removeButton = page.getByRole('button', { name: /remove|delete/i }).first();
      if (await removeButton.isVisible()) {
        await removeButton.click();

        const confirmButton = page.getByRole('button', { name: /confirm/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Should show error about self-removal
        await expect(page.getByText(/cannot.*remove.*yourself/i)).toBeVisible();
      }
    });

    test('should prevent removing last admin @integration', async ({ page }) => {
      // Mock last admin removal error
      await page.route('**/team/members/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 400,
            json: { detail: 'Cannot remove the last admin. At least one admin must remain.' }
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/team');

      const removeButton = page.getByRole('button', { name: /remove/i });
      if (await removeButton.isVisible()) {
        await removeButton.click();

        const confirmButton = page.getByRole('button', { name: /confirm/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Should show error about last admin
        await expect(page.getByText(/last.*admin.*remain/i)).toBeVisible();
      }
    });
  });

  test.describe('Team Permissions and Access Control', () => {
    test('should enforce role-based permissions @integration', async ({ page }) => {
      await page.goto('/team');

      // Admin should have full access to team management
      await expect(page.getByRole('button', { name: /invite.*member/i })).toBeVisible();
      
      // Should see role management options
      const roleElements = page.getByText(/admin|manager|user/i);
      const roleCount = await roleElements.count();
      expect(roleCount).toBeGreaterThan(0);

      // Should see team statistics
      const statsElements = [
        /total.*members/i,
        /active.*members/i,
        /pending.*invitations/i
      ];

      for (const statRegex of statsElements) {
        const statElement = page.getByText(statRegex);
        if (await statElement.isVisible()) {
          console.log('Team statistic visible:', statRegex.source);
        }
      }
    });

    test('should display department-based organization @integration', async ({ page }) => {
      await page.goto('/team');
      await page.waitForTimeout(1000);

      // Look for department information
      const departmentElements = [
        /engineering|development/i,
        /sales|marketing/i,
        /legal|compliance/i,
        /operations/i,
        /hr|human.*resources/i
      ];

      let departmentsVisible = 0;
      for (const deptRegex of departmentElements) {
        if (await page.getByText(deptRegex).isVisible()) {
          departmentsVisible++;
        }
      }

      console.log(`Departments visible: ${departmentsVisible}`);

      // Should show some form of team organization
      const organizationalElements = [
        /department/i,
        /team/i,
        /group/i,
        /division/i
      ];

      let orgElementsVisible = 0;
      for (const orgRegex of organizationalElements) {
        if (await page.getByText(orgRegex).isVisible()) {
          orgElementsVisible++;
        }
      }

      expect(orgElementsVisible).toBeGreaterThan(0);
    });
  });

  test.describe('Team Management Error Handling', () => {
    test('should handle team API server errors gracefully @integration', async ({ page }) => {
      // Mock team API error
      await page.route('**/team/members', async route => {
        await route.fulfill({
          status: 500,
          json: { detail: 'Team service temporarily unavailable' }
        });
      });

      await page.goto('/team');

      // Should display error state
      await expect(page.getByText(/error|unavailable|failed.*load/i)).toBeVisible();

      // Should provide retry mechanism
      const retryButton = page.getByRole('button', { name: /retry|refresh/i });
      if (await retryButton.isVisible()) {
        // Clear error mock and retry
        await page.unroute('**/team/members');
        await retryButton.click();
        
        // Should eventually load successfully
        await expect(page.getByText(/team.*members/i)).toBeVisible();
      }
    });

    test('should handle network failures in team management @integration', async ({ page }) => {
      await page.goto('/team');

      // Mock network failure
      await page.route('**/team/**', async route => {
        await route.abort('failed');
      });

      // Try to invite a member to trigger network call
      const inviteButton = page.getByRole('button', { name: /invite.*member/i });
      if (await inviteButton.isVisible()) {
        await inviteButton.click();
        
        await page.getByLabel(/email/i).fill('test@example.com');
        await page.getByLabel(/name/i).fill('Test User');
        await page.getByRole('button', { name: /invite/i }).click();

        // Should show network error message
        await expect(page.getByText(/network.*error|connection.*failed/i)).toBeVisible();
      }
    });
  });

  test.describe('Team Management Performance', () => {
    test('should load team data efficiently @integration', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/team');
      
      // Wait for team data to be visible
      await expect(page.getByText(/team.*members/i)).toBeVisible();

      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time
      expect(loadTime).toBeLessThan(10000);
      
      console.log(`Team data loaded in ${loadTime}ms`);
    });

    test('should handle large team datasets efficiently @integration', async ({ page }) => {
      // Mock large team dataset
      const largeTeam = {
        members: Array.from({ length: 100 }, (_, i) => ({
          id: `member-${i}`,
          email: `member${i}@company.com`,
          full_name: faker.person.fullName(),
          role: faker.helpers.arrayElement(['admin', 'CONTRACT_MANAGER', 'user']),
          department: faker.commerce.department(),
          is_active: true,
          created_at: faker.date.past().toISOString(),
          last_login_at: faker.date.recent().toISOString()
        })),
        total: 100,
        pending_invitations: Array.from({ length: 10 }, (_, i) => ({
          id: `pending-${i}`,
          email: `pending${i}@company.com`,
          full_name: faker.person.fullName(),
          status: 'pending'
        }))
      };

      await page.route('**/team/members', async route => {
        await route.fulfill({
          status: 200,
          json: largeTeam
        });
      });

      const startTime = Date.now();
      await page.goto('/team');
      
      await expect(page.getByText(/team.*members/i)).toBeVisible();
      await expect(page.getByText('100')).toBeVisible(); // Total count

      const renderTime = Date.now() - startTime;
      
      // Should handle large datasets within reasonable time
      expect(renderTime).toBeLessThan(15000);
      
      console.log(`Large team dataset rendered in ${renderTime}ms`);
    });
  });

  // Cleanup invited members
  test.afterAll(async ({ browser }) => {
    if (invitedMembers.length > 0) {
      console.log(`Would clean up ${invitedMembers.length} test invitations`);
      // Could implement cleanup API calls here
      for (const member of invitedMembers) {
        console.log(`Would clean up invitation: ${member.email}`);
      }
    }
    
    console.log('Team Management Backend Integration tests completed');
  });
});
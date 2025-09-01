# Pactoria Frontend E2E Testing Guide

## Overview

This comprehensive End-to-End (E2E) testing suite ensures the Pactoria frontend application works correctly across all user scenarios, browsers, and devices. Our testing strategy covers critical user journeys, performance, accessibility, and integration points.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Architecture](#test-architecture)
3. [Running Tests](#running-tests)
4. [Test Categories](#test-categories)
5. [Writing Tests](#writing-tests)
6. [Configuration](#configuration)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Frontend application running on `http://localhost:5173`
- Backend API (optional - tests use mocked responses by default)

### Installation

Tests use Playwright which is already installed as a dev dependency:

```bash
# Install Playwright browsers
npx playwright install

# Verify installation
npx playwright --version
```

### Basic Test Execution

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test suite
npm run test:e2e:smoke

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug
```

## Test Architecture

### Directory Structure

```
frontend/e2e/
├── auth/                     # Authentication & authorization tests
│   └── auth.spec.ts
├── contracts/                # Contract management tests
│   └── contracts-crud.spec.ts
├── integrations/             # API integration tests
│   └── api-integration.spec.ts
├── analytics/                # Analytics & reporting tests
│   └── analytics.spec.ts
├── navigation/               # Navigation & routing tests
│   └── navigation.spec.ts
├── search/                   # Search functionality tests
│   └── search.spec.ts
├── forms/                    # Form validation tests
│   └── form-validation.spec.ts
├── accessibility/            # Accessibility compliance tests
│   └── accessibility.spec.ts
├── responsive/               # Responsive design tests
│   └── responsive.spec.ts
├── performance/              # Performance & load tests
│   └── performance.spec.ts
├── utils/                    # Test utilities & helpers
│   ├── page-objects.ts       # Page Object Model classes
│   ├── test-data.ts          # Test data factories
│   ├── api-mock.ts           # API mocking utilities
│   ├── test-helpers.ts       # Advanced testing utilities
│   └── test-runners.ts       # Custom test runners
├── global-setup.ts           # Global test setup
├── global-teardown.ts        # Global test cleanup
└── playwright.config.ts      # Playwright configuration
```

### Page Object Model

Our tests use the Page Object Model (POM) pattern to maintain clean, reusable test code:

```typescript
// Example page object
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.loginButton = page.getByRole('button', { name: /login/i });
  }

  async login(userData: TestUserData) {
    await this.emailInput.fill(userData.email);
    await this.passwordInput.fill(userData.password);
    await this.loginButton.click();
    await this.waitForLoadingToComplete();
  }
}
```

## Running Tests

### Test Categories

#### 1. Smoke Tests
Quick validation of critical user journeys:

```bash
npm run test:e2e:smoke
```

Tests included:
- User authentication (login/logout)
- Contract creation and viewing
- Basic navigation

#### 2. Regression Tests
Comprehensive test coverage:

```bash
npm run test:e2e:regression
```

Tests all functionality across:
- All user flows
- Error scenarios
- Edge cases
- Cross-browser compatibility

#### 3. Performance Tests
Load time and responsiveness validation:

```bash
npm run test:e2e:performance
```

Measures:
- Page load times
- Core Web Vitals (LCP, FID, CLS)
- Memory usage
- API response times

#### 4. Accessibility Tests
WCAG compliance validation:

```bash
npm run test:e2e:accessibility
```

Checks:
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- ARIA labels
- Focus management

#### 5. Cross-Browser Tests
Multi-browser compatibility:

```bash
npm run test:e2e:cross-browser
```

Tests on:
- Chrome/Chromium
- Firefox
- Safari/WebKit
- Mobile browsers

### Advanced Test Execution

#### Debug Mode
```bash
# Run specific test file in debug mode
npx playwright test auth/auth.spec.ts --debug

# Run with headed browser
npx playwright test --headed

# Run specific test by title
npx playwright test --grep "should login with valid credentials"
```

#### Parallel Execution
```bash
# Run tests in parallel (4 workers)
npx playwright test --workers=4

# Run tests serially (1 worker)
npx playwright test --workers=1
```

#### Specific Browser
```bash
# Run on Chrome only
npx playwright test --project=chromium

# Run on all browsers
npx playwright test --project=chromium --project=firefox --project=webkit
```

## Test Categories Detail

### Authentication Tests (`e2e/auth/`)
- **Login Flow**: Valid/invalid credentials, form validation
- **Registration**: User signup, validation, duplicate email handling
- **Protected Routes**: Unauthorized access prevention
- **Session Management**: Token persistence, logout, expiration
- **Password Reset**: Email flow, validation (if implemented)

### Contract Management Tests (`e2e/contracts/`)
- **CRUD Operations**: Create, read, update, delete contracts
- **Form Validation**: Required fields, format validation
- **AI Generation**: Content generation, error handling
- **Compliance Analysis**: Score calculation, recommendations
- **File Operations**: Upload, download, export
- **Status Management**: Draft, active, completed workflows

### API Integration Tests (`e2e/integrations/`)
- **Request/Response Handling**: Success and error scenarios
- **Authentication**: Token inclusion, expiration handling
- **Error Handling**: Network failures, server errors
- **Rate Limiting**: Request throttling behavior
- **Data Validation**: Request/response format compliance

### Navigation Tests (`e2e/navigation/`)
- **Route Changes**: Page transitions, deep linking
- **Browser Navigation**: Back/forward buttons, history
- **Breadcrumbs**: Hierarchy navigation
- **Mobile Navigation**: Hamburger menu, touch gestures
- **Loading States**: Progress indicators, skeleton screens

### Search Tests (`e2e/search/`)
- **Text Search**: Contract content searching
- **Filters**: Type, status, date range filters
- **Pagination**: Large result set handling
- **Auto-complete**: Search suggestions
- **Performance**: Large dataset handling

### Form Tests (`e2e/forms/`)
- **Field Validation**: Required, format, length validation
- **Real-time Validation**: Immediate feedback
- **Error Display**: Message positioning, accessibility
- **Form Submission**: Success and error handling
- **Auto-save**: Draft preservation (if implemented)

### Accessibility Tests (`e2e/accessibility/`)
- **Keyboard Navigation**: Tab order, shortcuts
- **Screen Readers**: ARIA labels, announcements
- **Color Contrast**: WCAG AA compliance
- **Focus Management**: Visible focus indicators
- **Mobile Accessibility**: Touch targets, gestures

### Responsive Tests (`e2e/responsive/`)
- **Viewport Adaptation**: Mobile, tablet, desktop layouts
- **Touch Interactions**: Tap targets, gestures
- **Content Reflow**: Text wrapping, image scaling
- **Navigation Adaptation**: Mobile menus, collapsible content

### Performance Tests (`e2e/performance/`)
- **Load Times**: Page initialization, asset loading
- **Runtime Performance**: Interaction responsiveness
- **Memory Usage**: Leak detection, cleanup
- **Network Efficiency**: Request optimization, caching

## Writing Tests

### Test Structure

```typescript
test.describe('Feature Name', () => {
  let pageObject: PageObjectClass;
  let apiMocker: APIMocker;

  test.beforeEach(async ({ page }) => {
    pageObject = new PageObjectClass(page);
    apiMocker = new APIMocker(page);
    
    // Setup common test data
    await apiMocker.mockAllEndpoints();
    await setupAuthenticatedUser(page);
  });

  test('should perform expected behavior', async ({ page }) => {
    // Arrange
    await pageObject.goto('/feature-path');
    
    // Act
    await pageObject.performAction();
    
    // Assert
    await expect(pageObject.resultElement).toBeVisible();
    await expect(page).toHaveURL(/expected-url/);
  });
});
```

### Best Practices

#### 1. Use Page Objects
```typescript
// ❌ Don't write selectors in tests
await page.click('#login-button');

// ✅ Use page objects
await loginPage.login(testUser);
```

#### 2. Wait for Elements Properly
```typescript
// ❌ Hard waits
await page.waitForTimeout(2000);

// ✅ Wait for specific conditions
await expect(element).toBeVisible();
await page.waitForLoadState('networkidle');
```

#### 3. Use Test Data Factories
```typescript
// ❌ Hardcoded test data
const user = { email: 'test@test.com', password: 'password' };

// ✅ Generated test data
const user = TestUser.random();
```

#### 4. Mock External Dependencies
```typescript
// Mock API responses
await apiMocker.mockAllEndpoints();

// Mock specific endpoints
await page.route('**/api/contracts', route => {
  route.fulfill({ status: 200, body: mockContracts });
});
```

### Custom Utilities

#### Visual Testing
```typescript
import { VisualTestHelper } from '../utils/test-helpers';

const visual = new VisualTestHelper(page);
await visual.takeScreenshot('dashboard-loaded');
await visual.compareVisual('login-form', loginForm);
```

#### Performance Testing
```typescript
import { PerformanceTestHelper } from '../utils/test-helpers';

const perf = new PerformanceTestHelper(page);
const loadTime = await perf.measurePageLoad();
expect(loadTime.domContentLoaded).toBeLessThan(2000);
```

#### Network Testing
```typescript
import { NetworkTestHelper } from '../utils/test-helpers';

const network = new NetworkTestHelper(page);
await network.simulateSlowNetwork();
await network.waitForApiCall('/api/contracts');
```

## Configuration

### Environment Variables

Create `.env.test` for test-specific configuration:

```bash
# Test environment configuration
VITE_API_URL=http://localhost:8000/api/v1
VITE_DEBUG_API_CALLS=false
PLAYWRIGHT_BASE_URL=http://localhost:5173

# Test behavior flags
CREATE_TEST_USER=false
CLEANUP_TEST_DATA=false
VISUAL_TESTING=false
PERFORMANCE_TESTING=true

# Test execution settings
DEFAULT_TEST_TIMEOUT=30000
RETRY_COUNT=2
PARALLEL_WORKERS=4
```

### Playwright Configuration

Key configuration in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
    { name: 'Mobile Chrome', use: devices['Pixel 5'] },
    { name: 'Mobile Safari', use: devices['iPhone 12'] }
  ]
});
```

## CI/CD Integration

### GitHub Actions

Example workflow (`.github/workflows/e2e-tests.yml`):

```yaml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          npx playwright install --with-deps
      
      - name: Start application
        run: |
          npm run build
          npm run preview &
          sleep 10
      
      - name: Run E2E tests
        run: npm run test:e2e:ci
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:4173
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-results
          path: test-results/
```

### Test Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:smoke": "playwright test --grep @smoke",
    "test:e2e:regression": "playwright test --grep @regression",
    "test:e2e:performance": "playwright test e2e/performance/",
    "test:e2e:accessibility": "playwright test e2e/accessibility/",
    "test:e2e:cross-browser": "playwright test --project=chromium --project=firefox --project=webkit",
    "test:e2e:ci": "playwright test --reporter=github",
    "test:e2e:report": "playwright show-report"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Application Not Starting
```bash
# Check if frontend is running
curl http://localhost:5173

# Start application manually
npm run dev
```

#### 2. Test Timeouts
```typescript
// Increase timeout for slow operations
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

#### 3. Flaky Tests
```typescript
// Add retry logic
test('potentially flaky test', async ({ page }) => {
  await test.step('retry wrapper', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await performAction();
        break;
      } catch (error) {
        if (i === 2) throw error;
        await page.waitForTimeout(1000);
      }
    }
  });
});
```

#### 4. Element Not Found
```typescript
// Use proper waiting strategies
await expect(element).toBeVisible({ timeout: 10000 });
await page.waitForLoadState('networkidle');
```

### Debug Tools

#### 1. Playwright Inspector
```bash
npx playwright test --debug
```

#### 2. Trace Viewer
```bash
npx playwright show-trace test-results/trace.zip
```

#### 3. Screenshots and Videos
Tests automatically capture on failure. View in `test-results/`.

### Performance Debugging

```typescript
// Monitor network requests
page.on('request', request => console.log(request.url()));
page.on('response', response => console.log(response.status()));

// Measure timing
const startTime = Date.now();
await action();
console.log(`Action took: ${Date.now() - startTime}ms`);
```

## Best Practices

### Test Organization

1. **Group Related Tests**: Use `test.describe()` blocks
2. **Clear Test Names**: Describe expected behavior
3. **Single Responsibility**: One assertion per test when possible
4. **Test Independence**: Each test should work in isolation

### Maintenance

1. **Regular Updates**: Keep tests updated with UI changes
2. **Code Review**: Review test code like production code
3. **Refactor Common Code**: Extract reusable utilities
4. **Monitor Flakiness**: Track and fix unreliable tests

### Performance

1. **Parallel Execution**: Use appropriate worker count
2. **Selective Testing**: Run smoke tests for quick feedback
3. **Efficient Waiting**: Use specific wait conditions
4. **Mock External Services**: Avoid real API calls when possible

### Reporting

1. **Clear Failure Messages**: Provide actionable error information
2. **Visual Evidence**: Capture screenshots/videos on failure
3. **Test Metrics**: Track test execution time and success rates
4. **Integration**: Connect with bug tracking and monitoring tools

## Contributing

### Adding New Tests

1. Create test files in appropriate directories
2. Follow existing naming conventions
3. Use page object patterns
4. Include proper test documentation
5. Add appropriate tags (@smoke, @regression, etc.)

### Modifying Existing Tests

1. Understand the test purpose before changes
2. Update related page objects
3. Ensure tests remain independent
4. Update documentation if behavior changes

### Test Data Management

1. Use test data factories for consistency
2. Clean up test data after execution
3. Avoid hardcoded values
4. Use meaningful test data that reflects real usage

---

## Support

For questions or issues with the E2E testing suite:

1. Check this documentation first
2. Review existing test examples
3. Check Playwright documentation: https://playwright.dev/
4. Create an issue with:
   - Test command run
   - Error message
   - Screenshots if applicable
   - Environment details

Happy Testing! 🎭✨
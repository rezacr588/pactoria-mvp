# Pactoria MVP - End-to-End Testing Suite

This comprehensive E2E testing suite ensures the Pactoria MVP frontend application works correctly across different browsers, devices, and user scenarios. The tests cover authentication, contract management, analytics, API integration, accessibility, and responsive design.

## Test Framework

- **Framework**: Playwright
- **Language**: TypeScript
- **Test Runner**: Playwright Test
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

## Test Structure

```
e2e/
├── auth/                    # Authentication flow tests
├── contracts/              # Contract CRUD operations
├── analytics/              # Analytics dashboard tests
├── integrations/           # API integration tests
├── forms/                  # Form validation and error handling
├── accessibility/          # WCAG compliance and a11y tests
├── responsive/             # Responsive design tests
├── utils/                  # Test utilities and helpers
│   ├── page-objects.ts     # Page Object Models
│   ├── test-data.ts        # Test data factories
│   └── api-mock.ts         # API mocking utilities
├── fixtures/               # Test fixtures and data
├── global-setup.ts         # Global test setup
├── global-teardown.ts      # Global test cleanup
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Playwright installed

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Environment Setup

Create a `.env` file in the frontend directory:

```bash
# API Configuration
VITE_API_URL=http://localhost:8000/api/v1
VITE_DEBUG_API_CALLS=false

# Test Configuration
PLAYWRIGHT_BASE_URL=http://localhost:5173
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
```

### Running Tests

```bash
# Run all tests
npm run test:e2e

# Run tests headlessly
npx playwright test

# Run tests with UI mode
npx playwright test --ui

# Run specific test files
npx playwright test auth/auth.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests for specific browser
npx playwright test --project=chromium

# Run tests for mobile
npx playwright test --project="Mobile Chrome"

# Debug tests
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## Test Categories

### 1. Authentication Tests (`auth/auth.spec.ts`)

Tests user authentication flows including:

- **User Registration**: Sign up with email verification
- **User Login**: Email/password authentication
- **Session Management**: Token persistence, expiration handling
- **Protected Routes**: Authorization checks
- **Logout**: Session cleanup

**Key Test Cases**:
- Valid/invalid credentials
- Form validation
- Token expiration handling
- Concurrent sessions
- Redirect behavior

### 2. Contract Management Tests (`contracts/contracts-crud.spec.ts`)

Tests the core contract functionality:

- **Contract Creation**: All contract types (service, NDA, employment, etc.)
- **Contract Listing**: Search, filtering, pagination
- **Contract Viewing**: Content display, status management
- **Contract Updates**: Editing contract details
- **Contract Deletion**: With confirmation dialogs
- **AI Features**: Content generation, compliance analysis

**Key Test Cases**:
- CRUD operations for all contract types
- Form validation
- Search and filtering
- Status transitions
- File uploads/downloads

### 3. API Integration Tests (`integrations/api-integration.spec.ts`)

Tests frontend-backend communication:

- **Authentication APIs**: Login, registration, profile
- **Contract APIs**: All CRUD operations
- **Analytics APIs**: Dashboard data, metrics
- **Error Handling**: Network failures, server errors
- **Request/Response**: Headers, data formats, status codes

**Key Test Cases**:
- Successful API interactions
- Error response handling
- Network failure recovery
- Request retry logic
- Data transformation

### 4. Analytics Tests (`analytics/analytics.spec.ts`)

Tests the analytics dashboard:

- **Dashboard Overview**: Key metrics display
- **Data Visualization**: Charts and graphs
- **Date Range Filtering**: Custom periods
- **Data Export**: CSV/PDF downloads
- **Real-time Updates**: WebSocket connections

**Key Test Cases**:
- Metric accuracy
- Chart interactions
- Filter functionality
- Export features
- Performance with large datasets

### 5. Form Validation Tests (`forms/form-validation.spec.ts`)

Tests form behavior and validation:

- **Client-side Validation**: Real-time field validation
- **Server-side Validation**: API error handling
- **Error Display**: User-friendly error messages
- **Accessibility**: Screen reader support
- **Security**: XSS prevention, input sanitization

**Key Test Cases**:
- Required field validation
- Format validation (email, dates, etc.)
- Custom validation rules
- Error message display
- Form submission handling

### 6. Accessibility Tests (`accessibility/accessibility.spec.ts`)

Tests WCAG 2.1 Level AA compliance:

- **Keyboard Navigation**: Tab order, focus management
- **Screen Reader Support**: ARIA labels, roles, landmarks
- **Color and Contrast**: High contrast mode, dark theme
- **Focus Management**: Modal traps, skip links
- **Mobile Accessibility**: Touch targets, voice commands

**Key Test Cases**:
- Keyboard-only navigation
- Screen reader announcements
- Color contrast ratios
- Touch target sizes
- ARIA implementation

### 7. Responsive Design Tests (`responsive/responsive.spec.ts`)

Tests cross-device compatibility:

- **Mobile Viewports**: 320px to 768px
- **Tablet Viewports**: 768px to 1024px
- **Desktop Viewports**: 1024px and above
- **Orientation Changes**: Portrait/landscape
- **Touch Interactions**: Tap, swipe, pinch

**Key Test Cases**:
- Layout adaptation
- Content readability
- Navigation usability
- Form functionality
- Performance across devices

## Page Object Model

The test suite uses the Page Object Model pattern for maintainable tests:

```typescript
// Example usage
const loginPage = new LoginPage(page);
await loginPage.goto('/login');
await loginPage.login(TestUser.admin());
```

### Available Page Objects

- `BasePage`: Base class with common functionality
- `LandingPage`: Home page interactions
- `LoginPage`: Authentication forms
- `DashboardPage`: Main dashboard
- `ContractsPage`: Contract listing and management
- `ContractCreatePage`: Contract creation forms
- `ContractViewPage`: Individual contract pages
- `AnalyticsPage`: Analytics dashboard
- `AppLayout`: Navigation and layout components
- `CommandPalette`: Search and command functionality

## Test Data Management

### Test Data Factories

```typescript
// Generate test users
const adminUser = TestUser.admin();
const regularUser = TestUser.regular();
const randomUser = TestUser.random();

// Generate test contracts
const serviceAgreement = TestContract.serviceAgreement();
const nda = TestContract.nda();
const randomContract = TestContract.random();
```

### Mock API Responses

```typescript
// Set up API mocking
const apiMocker = new APIMocker(page);
await apiMocker.mockAllEndpoints();

// Mock specific scenarios
await apiMocker.mockErrorResponses();
```

## Configuration

### Playwright Configuration (`playwright.config.ts`)

- **Cross-browser Testing**: Chrome, Firefox, Safari, Mobile
- **Parallel Execution**: Configurable workers
- **Retry Logic**: Automatic retry on failure
- **Screenshots**: On failure
- **Video Recording**: On retry
- **Test Reports**: HTML, JSON, JUnit

### Environment Variables

- `PLAYWRIGHT_BASE_URL`: Frontend application URL
- `VITE_API_URL`: Backend API URL
- `TEST_USER_EMAIL`: Test account email
- `TEST_USER_PASSWORD`: Test account password
- `CI`: Enable CI-specific settings

## Best Practices

### Test Organization

1. **Group Related Tests**: Use `describe` blocks for logical grouping
2. **Clear Test Names**: Descriptive test case names
3. **Setup/Teardown**: Use `beforeEach` and `afterEach` appropriately
4. **Independent Tests**: Each test should be able to run in isolation

### Page Objects

1. **Single Responsibility**: One page object per page/component
2. **Reusable Methods**: Common actions as methods
3. **Locator Strategies**: Prefer semantic selectors
4. **Wait Strategies**: Explicit waits for dynamic content

### Test Data

1. **Isolation**: Each test uses fresh data
2. **Factories**: Use factories for consistent test data
3. **Cleanup**: Remove test data after tests
4. **Realistic Data**: Use realistic but safe test data

### Assertions

1. **Specific Assertions**: Test specific behavior
2. **Multiple Assertions**: Test both positive and negative cases
3. **Error Messages**: Include helpful error messages
4. **Async Handling**: Proper handling of async operations

## Debugging Tests

### Debug Mode

```bash
# Run in debug mode
npx playwright test --debug

# Debug specific test
npx playwright test auth/auth.spec.ts --debug

# Pause on failure
npx playwright test --pause-on-failure
```

### Visual Debugging

```bash
# Run with headed browsers
npx playwright test --headed

# Slow motion
npx playwright test --headed --slowMo=1000

# UI mode
npx playwright test --ui
```

### Test Artifacts

- **Screenshots**: Taken on test failure
- **Videos**: Recorded on retry
- **Traces**: Complete test execution traces
- **Logs**: Console and network logs

## Continuous Integration

### GitHub Actions

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run tests
        run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Test Reports

- **HTML Report**: Interactive test results
- **JSON Report**: Machine-readable results
- **JUnit Report**: CI integration
- **Allure Report**: Advanced reporting (optional)

## Troubleshooting

### Common Issues

1. **Flaky Tests**: Add proper waits, increase timeouts
2. **Locator Issues**: Use more specific selectors
3. **Timing Issues**: Use `waitFor` methods
4. **Environment Issues**: Check configuration and dependencies

### Performance Tips

1. **Parallel Execution**: Use multiple workers
2. **Test Selection**: Run only necessary tests
3. **Mock APIs**: Use mocks when possible
4. **Resource Cleanup**: Clean up after tests

### Browser-Specific Issues

1. **WebKit**: May require different handling for some features
2. **Mobile**: Touch interactions vs mouse clicks
3. **Network**: Different network conditions

## Contributing

### Adding New Tests

1. **Follow Patterns**: Use existing test patterns
2. **Page Objects**: Update page objects for new features
3. **Test Data**: Add new test data as needed
4. **Documentation**: Update this README

### Test Review Checklist

- [ ] Tests are independent and can run in isolation
- [ ] Page objects are used appropriately
- [ ] Test data is properly managed
- [ ] Error cases are covered
- [ ] Accessibility considerations included
- [ ] Mobile/responsive behavior tested
- [ ] Performance implications considered

## Support

For questions or issues with the E2E test suite:

1. Check existing test examples
2. Review Playwright documentation
3. Check browser-specific considerations
4. Verify test environment setup
5. Review debugging guides

The E2E test suite ensures the Pactoria MVP provides a reliable, accessible, and performant experience across all supported platforms and devices.
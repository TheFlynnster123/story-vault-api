# Unit Testing Best Practices

## Core Philosophy 🎯

1. **Focused Mocking**: Each test only mocks the exact dependencies it needs
2. **Isolated Tests**: No shared state between tests to limit blast radius during debugging
3. **Clear Intentions**: Test names and helper functions should express WHAT is being tested
4. **Small Helper Functions**: Apply same clean code principles to test code
5. **Dependency Injection**: All mocks through Dependencies.ts pattern

## Test Structure Template 📋

```typescript
import { FunctionName } from "../../src/functions/FunctionName";
import { d } from "../../src/utils/Dependencies";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";

// Mock external dependencies
jest.mock("../../src/utils/getAuthenticatedUserId");
jest.mock("../../src/utils/Dependencies");

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;

describe("FunctionName Function", () => {
  let mockDependency: any;
  let mockContext: InvocationContext;

  beforeEach(() => {
    // FOCUSED MOCK: Only mock what this specific test suite needs
    mockDependency = {
      requiredMethod: jest.fn().mockResolvedValue(void 0),
    };

    // Mock the dependency injection
    (d.DependencyName as jest.Mock) = jest.fn(() => mockDependency);

    mockContext = createMockContext();
    mockGetAuthenticatedUserId.mockResolvedValue("test-user-id");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test categories with clear organization
  describe("Validation", () => {
    it("should return 400 when required field is missing", async () => {
      const request = createMockRequest({
        /* missing field */
      });

      const response = await FunctionName(request, mockContext);

      expectBadRequestResponse(response, "Expected error message");
    });
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue("");
      const request = createMockRequest(createValidRequestBody());

      const response = await FunctionName(request, mockContext);

      expectUnauthorizedResponse(response);
    });
  });

  describe("Success Cases", () => {
    it("should perform expected operation with valid input", async () => {
      const input = createValidInput();
      const request = createMockRequest(input);

      const response = await FunctionName(request, mockContext);

      expectSuccessResponse(response, "Expected success message");
      expectDependencyCalledWith("expected-params");
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockDependency.requiredMethod.mockRejectedValue(
        new Error("Storage error")
      );
      const request = createMockRequest(createValidRequestBody());

      const response = await FunctionName(request, mockContext);

      expectServerErrorResponse(response);
    });
  });

  // Helper Functions - Apply clean code principles here too!
  function createMockContext(): InvocationContext {
    return {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;
  }

  function createMockRequest(body: any): HttpRequest {
    return {
      json: jest.fn().mockResolvedValue(body),
      headers: new Map(),
    } as any;
  }

  function createValidInput() {
    return {
      requiredField: "valid-value",
      // ... other required fields
    };
  }

  function createValidRequestBody() {
    return createValidInput();
  }

  function expectBadRequestResponse(
    response: any,
    expectedMessage: string
  ): void {
    expect(response.status).toBe(400);
    expect(response.body).toBe(expectedMessage);
  }

  function expectUnauthorizedResponse(response: any): void {
    expect(response.status).toBe(401);
  }

  function expectSuccessResponse(response: any, expectedMessage: string): void {
    expect(response.status).toBe(200);
    expect(response.body).toBe(expectedMessage);
  }

  function expectServerErrorResponse(response: any): void {
    expect(response.status).toBe(500);
  }

  function expectDependencyCalledWith(expectedParams: string): void {
    expect(mockDependency.requiredMethod).toHaveBeenCalledWith(expectedParams);
  }
});
```

## Test Categories 📊

### 1. Validation Tests

Test all input validation scenarios:

- Missing required fields
- Invalid field types
- Invalid field values (e.g., wrong enum values)
- Boundary conditions

### 2. Authentication Tests

- Unauthenticated users (empty/missing JWT)
- Invalid JWT tokens (if applicable)

### 3. Success Cases

- Happy path with valid input
- Edge cases with valid but unusual input
- Different valid input combinations
- Verify correct dependency calls

### 4. Error Handling

- Storage/network errors
- Permission errors
- Parsing errors
- External service errors

## Mocking Strategy 🎭

- **DO**: Focus each test suite on specific dependencies
- **DON'T**: Create shared mock files that couple tests together

## Test Naming Conventions 📝

### Test Suite Names:

- `"FunctionName Function"` - Clear, consistent pattern

### Test Names:

- `"should [expected behavior] when [condition]"`
- Examples:
  - `"should return 400 when chatId is missing"`
  - `"should append message when valid input provided"`
  - `"should filter out global system folder"`

### Helper Function Names:

- `createMockRequest()` - Factory functions
- `expectSuccessResponse()` - Assertion helpers
- `setupValidInput()` - Test setup helpers
- Use same naming principles as production code

## Assertion Patterns ✅

Use specific assertions and helper functions for common patterns.

## Testing Azure Functions Specific Patterns 🔄

BaseHttpFunction catches errors and returns "An unexpected error occurred."

## Test Data Creation 🏭

Use factory functions with unique IDs and realistic data that resembles production.

## Common Anti-Patterns to Avoid ❌

1. **Shared Mock State**: Don't reuse mock objects between tests
2. **Testing Implementation**: Test behavior, not internal method calls
3. **Long Test Functions**: Extract setup and assertions to helpers
4. **Hardcoded Values**: Use factory functions for test data
5. **Complex Test Logic**: Keep tests simple and focused
6. **Incomplete Mocks**: Mock all methods the function might call
7. **Generic Error Messages**: Be specific about expected errors

## Benefits of This Approach ✨

- 🔒 **Isolated**: Tests won't break due to unrelated changes
- 🚀 **Fast**: Minimal mocking reduces test setup overhead
- 🔍 **Focused**: Each test targets specific functionality
- 🛠️ **Maintainable**: Simple mocks are easy to understand and update
- 🎯 **Reliable**: Limited blast radius during debugging
- 📝 **Clear**: Test names and helpers express intent clearly
- 🧪 **Complete**: Covers all validation, success, and error scenarios

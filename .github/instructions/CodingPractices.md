# General Coding Practices

Here's some best practices I'd like to keep in mind while doing development.

##

2. **Keep function sizes small** - Generally 3 statements or actions is a good maximum for length. Making many small functions, even single-liners, is preferred over long complex functions
3. **Separate intention from implementation** - Use helper functions to express WHAT you're doing, not just HOW
4. **Dependency Injection over Singletons** - Use the Dependencies.ts pattern for testability and flexibility
5. Avoid commenting code

## Code Examples

### Preferred:

```typescript
// GOOD: Clean, readable, separated concerns
async myFunction(request, context, userId, body) {
  const { chatId, message } = body as AddChatMessageRequestBody;

  const messageContent = formatMessageForStorage(message);
  const blobName = `${chatId}/chat-messages`;

  await d.UserStorageClient().appendToBlob(userId, blobName, messageContent);

  return successResponse(context, userId, blobName);
}

const formatMessageForStorage = (message: Message): string =>
  JSON.stringify(message) + '\n';

const successResponse = (context, userId, blobName) => {
  context.log(`Successfully appended message to chat: ${userId}/${blobName}`);
  return ResponseBuilder.successMessage("Message added successfully.");
};
```

### Avoid:

```typescript
// BAD: Long, mixed concerns, hard to test
protected async execute(request, context, userId, body) {
  const { chatId, message } = body as AddChatMessageRequestBody;
  const userStorageClient = UserStorageClientSingleton.getInstance();
  const blobName = `${chatId}/chat-messages`;
  const messageContent = JSON.stringify(message) + '\n';
  await userStorageClient.appendToBlob(userId, blobName, messageContent);
  context.log(`Successfully appended message to chat: ${userId}/${blobName}`);
  return ResponseBuilder.successMessage("Message added successfully.");
}
```

## Architecture Patterns 🏗️

### 1. **Dependency Injection via Dependencies.ts**

```typescript
// Use this pattern for all external dependencies
import { d } from "../utils/Dependencies";

// In function:
await d.UserStorageClient().uploadBlob(userId, blobName, content);

// NOT singleton patterns like:
// const client = UserStorageClientSingleton.getInstance();
```

### 2. **Helper Function Extraction**

Extract logic into small, focused functions that express intent:

```typescript
// GOOD: Intent-revealing helper functions
const validateMessage = (message: Message): string | null => {
  if (!message?.id || !message?.role || !message?.content) {
    return "Invalid message: missing required fields";
  }
  return null;
};

const createEmptyChat = (chatId: string): Chat => ({
  chatId,
  messages: [],
});

const parseMessagesFromContent = (content: string): Message[] => {
  return content
    .trim()
    .split("\n")
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
};
```

## Code Organization 📁

### File Structure:

- **Small focused classes** - One responsibility per class
- **Helper functions at bottom** - Keep main logic at top
- **Import organization** - Dependencies.ts imports, not direct instantiation
- **Type definitions** - Interfaces close to usage, exported from models/

### Function Order in Files:

1. Main class/function logic
2. Validation helpers
3. Data transformation helpers
4. Response helpers
5. Utility functions

## Error Handling 🛡️

### Preferred Pattern:

```typescript
// Let BaseHttpFunction handle top-level errors
// Handle specific errors in helper functions
const parseMessagesFromContent = (
  content: string,
  context: InvocationContext
): Message[] => {
  const messages: Message[] = [];

  for (const line of lines) {
    try {
      const message = JSON.parse(line) as Message;
      messages.push(message);
    } catch (parseError) {
      context.warn(`Failed to parse message line: ${line}`, parseError);
      // Continue processing, don't fail entire operation
    }
  }

  return messages;
};
```

## Naming Conventions 📝

### Functions:

- **Verbs for actions**: `validateMessage`, `formatContent`, `createChat`
- **Descriptive names**: `parseMessagesFromContent` not `parseContent`
- **Boolean functions**: `isValidMessage`, `hasRequiredFields`

### Variables:

- **Descriptive names**: `blobName` not `name`
- **Avoid abbreviations**: `userStorageClient` not `userClient`
- **Context-specific**: `expectedMessage` not just `message` in tests

### Constants:

- **SCREAMING_SNAKE_CASE**: `MAX_MESSAGE_LENGTH`
- **Grouped by purpose**: Keep related constants together

## Testing Philosophy 🧪

### Key Principles:

1. **Focused mocks** - Only mock what each specific test needs
2. **No shared test dependencies** - Avoid central mock files that couple tests
3. **Clear test intentions** - Test names should describe behavior, not implementation
4. **Helper functions in tests** - Apply same clean code principles to test code
5. **Isolated tests** - Each test should be independent with minimal blast radius

### Example Test Structure:

```typescript
describe("FunctionName", () => {
  let mockDependency: any;

  beforeEach(() => {
    // Only mock what this test suite needs
    mockDependency = { method: jest.fn() };
    (d.Dependency as jest.Mock) = jest.fn(() => mockDependency);
  });

  describe("Success Cases", () => {
    it("should perform expected operation when valid input provided", async () => {
      // Arrange
      const input = createValidInput();

      // Act
      const result = await functionUnderTest(input);

      // Assert
      expectSuccessfulResult(result);
      expectCorrectDependencyCall();
    });
  });

  // Helper functions
  function createValidInput() {
    /* ... */
  }
  function expectSuccessfulResult(result) {
    /* ... */
  }
  function expectCorrectDependencyCall() {
    /* ... */
  }
});
```

## Anti-Patterns to Avoid ❌

1. **Long functions** - If it's more than 3-5 lines, extract helpers
2. **Singleton pattern** - Use dependency injection instead
3. **Mixed concerns** - Don't combine validation, business logic, and response building
4. **Hardcoded values** - Extract to constants or configuration
5. **Complex conditionals** - Extract to intention-revealing functions
6. **Shared test state** - Each test should be independent
7. **Generic error messages** - Be specific about what went wrong

## Benefits of This Approach ✨

- 🧪 **Highly Testable**: Small functions with clear inputs/outputs
- 🔧 **Maintainable**: Changes have limited scope and clear boundaries
- 📖 **Readable**: Code reads like well-written prose
- 🚀 **Debuggable**: Easy to isolate issues to specific functions
- 🔄 **Reusable**: Small functions can be composed in different ways
- 👥 **Team Friendly**: Clear patterns for others to follow

# Chat System Documentation 💬

## High-Level Overview 🎯

The Story Vault chat system is designed for **simplicity and efficiency**. Each user can have multiple conversations (chats), and each chat is stored as a single blob file containing all messages in chronological order. No more complex pagination - just straightforward message streams!

### Key Concepts:

- 🗨️ **Chat**: A conversation identified by a unique `chatId`
- 💬 **Message**: Individual user or system messages with roles and content
- 📁 **Storage**: One blob file per chat containing all messages
- ➕ **Append-Only**: New messages are appended to existing chat files
- 🔄 **Full Rewrite**: When messages are edited/deleted, the entire chat is rewritten

---

## In-Depth System Design 🔧

### Storage Structure 📂

```
Azure Blob Storage:
Container: "users"
├── {userId}/
    ├── {chatId}/
    │   └── chat-messages          # Single file containing all messages
    ├── {anotherChatId}/
    │   └── chat-messages
    └── ...
```

### Message Format 📝

Each message is stored as a JSON object on its own line (JSONL format):

```json
{"id":"msg_123","role":"user","content":"Hello!","timestamp":"2025-11-08T10:00:00Z"}
{"id":"msg_124","role":"system","content":"Hi there!","timestamp":"2025-11-08T10:00:01Z"}
```

### Data Models 🏗️

#### Message Interface

```typescript
interface Message {
  id: string; // Unique message identifier
  role: "user" | "system"; // Who sent the message
  content: string; // Message text
}
```

#### Chat Interface

```typescript
interface Chat {
  chatId: string; // Unique chat identifier
  messages: Message[]; // Array of all messages in chronological order
}
```

### Core Operations 🚀

#### 1. Adding New Messages ➕

- **Endpoint**: `AddChatMessage`
- **Process**: Append new message as JSON line to existing chat blob
- **Benefits**: Fast, efficient, maintains chronological order

#### 2. Full Chat Rewrite 🔄

- **Endpoint**: `SaveChatHistory`
- **Process**: Replace entire chat blob with new complete message history
- **Use Cases**: Message editing, deletion, reordering

#### 3. Retrieving Chat History 📖

- **Endpoint**: `GetChatHistory`
- **Process**: Read chat blob, parse each line as JSON, return complete Chat object
- **Fallback**: Returns empty chat if no history exists

#### 4. Chat Management 📋

- **List Chats**: `GetChats` - Lists all chat IDs for a user
- **Delete Chat**: `DeleteChat` - Removes entire chat folder

---

## File Storage Format 💾

### Example Chat Blob Content:

```
{"id":"msg_001","role":"user","content":"What's the weather like?"}
{"id":"msg_002","role":"system","content":"I don't have access to real-time weather data, but I can help you think about weather patterns!"}
{"id":"msg_003","role":"user","content":"Tell me about rain patterns"}
```

### Key Properties:

- ✅ **Human Readable**: Each line is valid JSON
- ✅ **Append Friendly**: New messages just add new lines
- ✅ **Fault Tolerant**: Invalid lines are skipped during parsing
- ✅ **Chronological**: Messages maintain order naturally

---

## Class Roles & Responsibilities 👥

### 🏗️ **Chat Model** (`src/models/ChatPage.ts`)

- **Role**: Data structure definitions
- **Responsibilities**:
  - Define `Message` interface for individual messages
  - Define `Chat` interface for complete conversations
  - Type safety for all chat-related data

### 🔧 **UserStorageClient** (`src/utils/UserStorageClient.ts`)

- **Role**: Low-level blob storage operations
- **Responsibilities**:
  - Upload/download blobs to/from Azure Storage
  - Append content to existing blobs using Azure Append Blobs
  - List and delete blobs/folders
  - Handle storage authentication and errors

### 🔗 **Dependencies** (`src/utils/Dependencies.ts`)

- **Role**: Dependency injection container
- **Responsibilities**:
  - Provide clean access to storage client instances
  - Enable easier testing through dependency injection
  - Centralize dependency management

### 💬 **AddChatMessage** (`src/functions/AddChatMessage.ts`)

- **Role**: Add single messages to existing chats
- **Responsibilities**:
  - Validate incoming message data (id, role, content)
  - Authenticate user requests via JWT
  - Format message as JSONL and append to chat blob
  - Handle first message in new chats automatically

### 💾 **SaveChatHistory** (`src/functions/SaveChatHistory.ts`)

- **Role**: Complete chat history replacement
- **Responsibilities**:
  - Validate complete chat data structure
  - Authenticate user requests via JWT
  - Convert message array to JSONL format
  - Replace entire chat blob content atomically

### 📖 **GetChatHistory** (`src/functions/GetChatHistory.ts`)

- **Role**: Retrieve complete chat conversations
- **Responsibilities**:
  - Authenticate user requests via JWT
  - Read and parse chat blobs from JSONL format
  - Handle parsing errors gracefully (skip invalid lines)
  - Return structured Chat objects or empty chat

### 📋 **GetChats** (`src/functions/GetChats.ts`)

- **Role**: List all user's conversations
- **Responsibilities**:
  - Authenticate user requests via JWT
  - Use hierarchical blob listing to find chat directories
  - Filter out system folders (e.g., "global")
  - Return array of available chat IDs

### 🗑️ **DeleteChat** (`src/functions/DeleteChat.ts`)

- **Role**: Remove entire conversations
- **Responsibilities**:
  - Authenticate user requests via JWT
  - Delete complete chat folders and all contents
  - Clean up chat-related files (photos, blobs, etc.)

### 🤖 **PostChat** (`src/functions/PostChat.ts`)

- **Role**: AI conversation endpoint
- **Responsibilities**:
  - Process user messages through AI (Grok API)
  - Generate AI responses based on conversation context
  - Handle AI API errors and rate limiting
  - Return AI responses to client for manual saving

### 🔐 **BaseHttpFunction** (`src/utils/baseHttpFunction.ts`)

- **Role**: Common HTTP function foundation
- **Responsibilities**:
  - Handle authentication via JWT tokens and Auth0
  - Provide consistent error handling patterns
  - Standardize request/response structure and validation
  - Abstract common HTTP function boilerplate

### 🛡️ **ResponseBuilder** (`src/utils/responseBuilder.ts`)

- **Role**: Standardized API responses
- **Responsibilities**:
  - Create consistent success/error response formats
  - Handle HTTP status codes appropriately
  - Ensure API response consistency across all endpoints
  - Provide helper methods for common response types

---

## Benefits of This Design ✨

- 🚀 **Performance**: Single blob read/write operations
- 📈 **Scalability**: Append operations are highly efficient
- 🔧 **Simplicity**: No complex pagination or indexing logic
- 🛡️ **Reliability**: JSONL format is fault-tolerant
- 💰 **Cost-Effective**: Minimal storage operations and requests
- 🔄 **Flexibility**: Easy to backup, migrate, or analyze chat data
- 🧹 **Clean Code**: Small functions with clear single responsibilities
- 🔧 **Testable**: Dependency injection enables easy unit testing

---

## Code Quality Principles Applied 📏

### Function Size & Abstraction

- **Small Functions**: Each Azure Function focuses on a single responsibility
- **Helper Functions**: Complex logic extracted into pure functions
- **Clear Naming**: Function names clearly indicate their purpose

### Separation of Concerns

- **Validation**: Extracted into dedicated validation functions
- **Storage Operations**: Centralized in UserStorageClient
- **Response Handling**: Standardized through ResponseBuilder
- **Business Logic**: Separated from HTTP handling concerns

### Dependency Injection

- **Testability**: Dependencies injected through `d.UserStorageClient()`
- **Flexibility**: Easy to swap implementations for testing
- **Clean Imports**: Reduced coupling between modules

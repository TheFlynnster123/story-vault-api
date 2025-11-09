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
  timestamp: string; // ISO timestamp
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
{"id":"msg_001","role":"user","content":"What's the weather like?","timestamp":"2025-11-08T09:00:00Z"}
{"id":"msg_002","role":"system","content":"I don't have access to real-time weather data, but I can help you think about weather patterns!","timestamp":"2025-11-08T09:00:05Z"}
{"id":"msg_003","role":"user","content":"Tell me about rain patterns","timestamp":"2025-11-08T09:01:00Z"}
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
  - Append content to existing blobs
  - List and delete blobs/folders
  - Handle storage authentication and errors

### 💬 **AddChatMessage** (`src/functions/AddChatMessage.ts`)

- **Role**: Add single messages to existing chats
- **Responsibilities**:
  - Validate incoming message data
  - Authenticate user requests
  - Append new message to chat blob
  - Handle first message in new chats

### 💾 **SaveChatHistory** (`src/functions/SaveChatHistory.ts`)

- **Role**: Complete chat history replacement
- **Responsibilities**:
  - Validate complete chat data structure
  - Authenticate user requests
  - Replace entire chat blob content
  - Handle message editing/deletion scenarios

### 📖 **GetChatHistory** (`src/functions/GetChatHistory.ts`)

- **Role**: Retrieve complete chat conversations
- **Responsibilities**:
  - Authenticate user requests
  - Read and parse chat blobs (JSONL format)
  - Handle parsing errors gracefully
  - Return structured Chat objects

### 📋 **GetChats** (`src/functions/GetChats.ts`)

- **Role**: List all user's conversations
- **Responsibilities**:
  - Authenticate user requests
  - List chat directories in user's storage
  - Return array of available chat IDs

### 🗑️ **DeleteChat** (`src/functions/DeleteChat.ts`)

- **Role**: Remove entire conversations
- **Responsibilities**:
  - Authenticate user requests
  - Delete complete chat folders
  - Clean up all chat-related files

### 🤖 **PostChat** (`src/functions/PostChat.ts`)

- **Role**: AI conversation endpoint
- **Responsibilities**:
  - Process user messages through AI (Grok)
  - Generate AI responses
  - Coordinate message saving via AddChatMessage
  - Handle AI API errors

### 🔐 **BaseHttpFunction** (`src/utils/baseHttpFunction.ts`)

- **Role**: Common HTTP function foundation
- **Responsibilities**:
  - Handle authentication via JWT tokens
  - Provide consistent error handling patterns
  - Standardize request/response structure
  - Abstract common HTTP function boilerplate

### 🛡️ **ResponseBuilder** (`src/utils/responseBuilder.ts`)

- **Role**: Standardized API responses
- **Responsibilities**:
  - Create consistent success/error response formats
  - Handle HTTP status codes appropriately
  - Ensure API response consistency across all endpoints

---

## Benefits of This Design ✨

- 🚀 **Performance**: Single blob read/write operations
- 📈 **Scalability**: Append operations are highly efficient
- 🔧 **Simplicity**: No complex pagination logic
- 🛡️ **Reliability**: JSONL format is fault-tolerant
- 💰 **Cost-Effective**: Minimal storage operations
- 🔄 **Flexibility**: Easy to backup, migrate, or analyze chat data

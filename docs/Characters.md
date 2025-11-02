# Character Management Functions

The Character Management functions allow users to create, retrieve, and manage characters within their chats. Characters can be used to specify which persona the LLM should respond as, making it useful for swapping between different characters in dialogue or for generating character-specific content.

## Character Model

A Character has the following structure:

```typescript
interface Character {
  id: string;
  chatId: string;
  name: string;
  description?: string;
  systemPrompt?: string;
}
```

- **id** (string, required): Unique identifier for the character
- **chatId** (string, required): The chat this character belongs to
- **name** (string, required): Display name for the character
- **description** (string, optional): Description of the character
- **systemPrompt** (string, optional): System prompt that defines how the LLM should behave when responding as this character

## SaveCharacter

Save or update a character for a chat.

### Endpoint

`POST /api/SaveCharacter`

### Authentication

- Requires a valid JWT token in the `Authorization` header

### Request Body

```json
{
  "id": "character-123",
  "chatId": "chat-456",
  "name": "Sherlock Holmes",
  "description": "Famous detective from Baker Street",
  "systemPrompt": "You are Sherlock Holmes, a brilliant detective known for your deductive reasoning and attention to detail. Respond in a manner befitting the character."
}
```

### Response

**Success (200)**
```json
{
  "message": "Character saved successfully."
}
```

**Error (400)**
```json
{
  "error": "Invalid request body. Missing id, chatId, or name."
}
```

## GetCharacters

Retrieve all characters for a specific chat.

### Endpoint

`POST /api/GetCharacters`

### Authentication

- Requires a valid JWT token in the `Authorization` header

### Request Body

```json
{
  "chatId": "chat-456"
}
```

### Response

**Success (200)**
```json
[
  {
    "id": "character-123",
    "chatId": "chat-456",
    "name": "Sherlock Holmes",
    "description": "Famous detective from Baker Street",
    "systemPrompt": "You are Sherlock Holmes..."
  },
  {
    "id": "character-789",
    "chatId": "chat-456",
    "name": "Dr. Watson",
    "description": "Loyal friend and chronicler",
    "systemPrompt": "You are Dr. Watson..."
  }
]
```

**Error (400)**
```json
{
  "error": "Invalid request body. Missing chatId."
}
```

## GetCharacter

Retrieve a specific character by ID.

### Endpoint

`POST /api/GetCharacter`

### Authentication

- Requires a valid JWT token in the `Authorization` header

### Request Body

```json
{
  "chatId": "chat-456",
  "characterId": "character-123"
}
```

### Response

**Success (200)**
```json
{
  "id": "character-123",
  "chatId": "chat-456",
  "name": "Sherlock Holmes",
  "description": "Famous detective from Baker Street",
  "systemPrompt": "You are Sherlock Holmes..."
}
```

**Error (404)**
```json
{
  "error": "Character not found."
}
```

## DeleteCharacter

Delete a character from a chat.

### Endpoint

`POST /api/DeleteCharacter`

### Authentication

- Requires a valid JWT token in the `Authorization` header

### Request Body

```json
{
  "chatId": "chat-456",
  "characterId": "character-123"
}
```

### Response

**Success (200)**
```json
{
  "message": "Character deleted successfully."
}
```

**Error (400)**
```json
{
  "error": "Invalid request body. Missing chatId or characterId."
}
```

## Using Characters with PostChat

Characters can be used with the `PostChat` function to have the LLM respond as a specific character. The active character's system prompt will be automatically prepended to the message history.

### Request Body with Active Character

```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "What do you make of this mystery?"
    }
  ],
  "chatId": "chat-456",
  "activeCharacterId": "character-123"
}
```

When an `activeCharacterId` is provided:
1. The character is loaded from storage
2. The character's `systemPrompt` is prepended to the messages array
3. The LLM responds based on the character's defined behavior

### Message Character Tracking

Messages can also track which character they belong to using the optional `characterId` field:

```typescript
interface Message {
  id: string;
  role: "user" | "system";
  content: string;
  characterId?: string; // Indicates which character this message is from
}
```

This allows you to:
- Track which character spoke each line in the conversation
- Display visual indicators for which character is speaking
- Swap between characters mid-conversation while maintaining context

## Example Workflow

1. **Create characters for your chat**
   ```javascript
   await fetch('/api/SaveCharacter', {
     method: 'POST',
     headers: { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' },
     body: JSON.stringify({
       id: 'char-sherlock',
       chatId: 'mystery-chat',
       name: 'Sherlock Holmes',
       systemPrompt: 'You are Sherlock Holmes...'
     })
   });
   ```

2. **Retrieve all characters**
   ```javascript
   const response = await fetch('/api/GetCharacters', {
     method: 'POST',
     headers: { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' },
     body: JSON.stringify({ chatId: 'mystery-chat' })
   });
   const characters = await response.json();
   ```

3. **Chat as a specific character**
   ```javascript
   const response = await fetch('/api/PostChat', {
     method: 'POST',
     headers: { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' },
     body: JSON.stringify({
       messages: [...],
       chatId: 'mystery-chat',
       activeCharacterId: 'char-sherlock'
     })
   });
   ```

4. **Save chat page with character information**
   ```javascript
   await fetch('/api/SaveChatPage', {
     method: 'POST',
     headers: { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' },
     body: JSON.stringify({
       chatId: 'mystery-chat',
       pageId: 'page-1',
       messages: [
         { id: 'msg-1', role: 'user', content: 'Hello', characterId: 'char-watson' },
         { id: 'msg-2', role: 'system', content: 'Elementary!', characterId: 'char-sherlock' }
       ],
       activeCharacterId: 'char-sherlock'
     })
   });
   ```

## Storage Structure

Characters are stored in Azure Blob Storage under the user's container with the following path structure:

```
users/{userId}/{chatId}/characters/{characterId}.character
```

This allows characters to be scoped to specific chats and easily retrieved or managed.

export interface Message {
  id: string;
  role: "user" | "system";
  content: string;
}

export interface ChatPage {
  chatId: string;
  pageId: string;
  messages: Message[];
}

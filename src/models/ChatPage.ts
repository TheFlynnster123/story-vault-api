export interface Message {
  id: string;
  sender: "user" | "system";
  text: string;
}

export interface ChatPage {
  chatId: string;
  pageId: string;
  messages: Message[];
}

export interface Message {
  id: string;
  role: "user" | "system";
  content: string;
}

export interface Chat {
  chatId: string;
  messages: Message[];
}

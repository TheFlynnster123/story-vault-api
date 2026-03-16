export interface ChatEventDTO {
  id: string;
  content: string;
}

export interface Chat {
  chatId: string;
  events: ChatEventDTO[];
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

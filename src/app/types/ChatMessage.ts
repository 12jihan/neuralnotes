interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'model';
  timestamp: Date;
}

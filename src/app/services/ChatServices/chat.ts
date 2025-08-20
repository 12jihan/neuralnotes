import { Injectable, signal, WritableSignal } from '@angular/core';

interface Folder {
  id: string;
  name: string;
  color: string;
  isExpanded: boolean;
  createdAt: Date;
}

interface Note {
  id: string;
  title: string;
  content: string; // Keep for compatibility
  lines: string[]; // New line-based structure
  preview: string;
  lastModified: Date;
  folderId?: string; // Optional folder assignment
  tags: string[]; // Tags for categorization
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class Chat {
  // Chat functionality
  chatMessages: WritableSignal<ChatMessage[]> = signal<ChatMessage[]>([
    {
      id: '1',
      content:
        "Hello! I'm your AI assistant. I can help you with your notes, answer questions, and provide insights.",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);

  private async generateAIResponse(userInput: string): Promise<string> {
    const responses = [
      "That's an interesting point! Could you elaborate more?",
      'I can help you organize those thoughts into a structured note.',
      'Based on your notes, I notice some patterns. Would you like me to analyze them?',
      'Let me help you find related notes or create connections.',
      'That reminds me of your previous note. Shall I bring it up?',
    ];

    // return responses[Math.floor(Math.random() * responses.length)];
    return '';
  }

  handleMessageSent(input: string) {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    this.chatMessages.update((messages: ChatMessage[]): ChatMessage[] => [
      ...messages,
      userMessage,
    ]);

    // Simulate AI response (replace with actual AI integration later)
    // setTimeout(() => {
    //   const aiMessage: ChatMessage = {
    //     id: (Date.now() + 1).toString(),
    //     // content: this.generateAIResponse(input),
    //     content: '',
    //     sender: 'ai',
    //     timestamp: new Date(),
    //   };
    //
    //   this.chatMessages.update((messages: ChatMessage[]): ChatMessage[] => [
    //     ...messages,
    //     aiMessage,
    //   ]);
    // }, 1000);
  }
}

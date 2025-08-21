import {
  inject,
  Injectable,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { GeminiAi } from '../llm-services/GeminiAi/gemini-ai';

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
  // Injections:
  _gemini: GeminiAi = inject(GeminiAi);

  // Chat functionality
  private _chatMessages: WritableSignal<ChatMessage[]> = signal<ChatMessage[]>([
    {
      id: '1',
      content:
        "Hello! I'm your AI assistant. I can help you with your notes, answer questions, and provide insights.",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);

  public chatMessages: Signal<ChatMessage[]> = this._chatMessages.asReadonly();

  private generateAIResponse(userInput: string): string {
    this._gemini.test();
    return '';
  }

  private async _generateAIResponse(userInput: string): Promise<string> {
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

    this._chatMessages.update((messages: ChatMessage[]): ChatMessage[] => [
      ...messages,
      userMessage,
    ]);

    // Simulate AI response (replace with actual AI integration later)
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: this.generateAIResponse(input),
        // content: '',
        sender: 'ai',
        timestamp: new Date(),
      };

      this._chatMessages.update((messages: ChatMessage[]): ChatMessage[] => [
        ...messages,
        aiMessage,
      ]);
    }, 1000);
  }
}

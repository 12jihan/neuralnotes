import {
  inject,
  Injectable,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { GeminiAi } from '../llm-services/GeminiAi/gemini-ai';

@Injectable({
  providedIn: 'root',
})
export class Chat {
  // Injections:
  _gemini: GeminiAi = inject(GeminiAi);

  // Chat functionality
  private _message: WritableSignal<ChatMessage | null> = signal(null);
  private _chatMessages: WritableSignal<ChatMessage[]> = signal<ChatMessage[]>([
    {
      id: (Date.now() + 1).toString(),
      content:
        "Hello! I'm your AI assistant. I can help you with your notes, answer questions, and provide insights.",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);

  public message: Signal<ChatMessage | null> = this._message.asReadonly();
  public chatMessages: Signal<ChatMessage[]> = this._chatMessages.asReadonly();

  async handleMessageSent(input: string): Promise<void> {
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
    this._message.set(userMessage);

    if (this.message()!.content) {
      await this._gemini.send(this.message()!.content);
      console.log('test async');
    }
  }
}

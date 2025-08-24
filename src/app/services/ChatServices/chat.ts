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
    const userMessage: ChatMessage = this._createMessage('user', input);
    this._message.set(userMessage);
    if (this.message() != null) {
      this._chatMessages.update((messages: ChatMessage[]): ChatMessage[] => [
        ...messages,
        userMessage,
      ]);
    }

    if (this.message()!.content) {
      await this._gemini.send(this.message()!.content);
      let aiResp = this._gemini.response();
      if (aiResp) {
        const _resp: ChatMessage = this._createMessage('ai', aiResp);
        this._chatMessages.update((messages: ChatMessage[]) => [
          ...messages,
          _resp,
        ]);
      }
    }
  }

  private _createMessage(sender: 'ai' | 'user', message: string): ChatMessage {
    const msg: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      sender: sender,
      timestamp: new Date(),
    };

    return msg;
  }

  public getHistory(): ChatMessage[] {
    return this.chatMessages();
  }
}

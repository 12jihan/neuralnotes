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
      id: '1',
      content:
        "Hello! I'm your AI assistant. I can help you with your notes, answer questions, and provide insights.",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);

  public message: Signal<ChatMessage | null> = this._message.asReadonly();
  public chatMessages: Signal<ChatMessage[]> = this._chatMessages.asReadonly();

  handleMessageSent(input: string): void {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };
    console.log('user message:', userMessage);
    this._chatMessages.update((messages: ChatMessage[]): ChatMessage[] => [
      ...messages,
      userMessage,
    ]);

    this._message.set(userMessage);
    console.log('current message signal:', this.message());

    if (this.message()!.content) {
      this._gemini.send(this.message()!.content);
      this._chatMessages.update(
        (chatmessages: ChatMessage[]): ChatMessage[] => [
          ...chatmessages,
          this._gemini.response()!,
        ],
      );
    }
  }
  // Simulate AI response (replace with actual AI integration later)
  //   setTimeout(() => {
  //     const aiMessage: ChatMessage = {
  //       id: (Date.now() + 1).toString(),
  //       content: this.generateAIResponse(input),
  //       // content: '',
  //       sender: 'ai',
  //       timestamp: new Date(),
  //     };
  //
  //     this._chatMessages.update((messages: ChatMessage[]): ChatMessage[] => [
  //       ...messages,
  //       aiMessage,
  //     ]);
  //   }, 1000);
  // }
}

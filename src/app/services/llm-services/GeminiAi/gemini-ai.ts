import {
  inject,
  Injectable,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { GoogleGenAI, GoogleGenAIOptions } from '@google/genai';
import { environment } from '../../../../../environments/environment';
import { Chat } from '../../ChatServices/chat';

@Injectable({
  providedIn: 'root',
})
export class GeminiAi {
  _chat: Chat = inject(Chat);

  options: GoogleGenAIOptions = {
    apiKey: environment.gemini_api_key,
  };

  private _ai: GoogleGenAI | null = null;
  private _response: WritableSignal<string | null> = signal<string | null>(
    null,
  );
  private _isGenerating: WritableSignal<boolean> = signal(false);
  private _error: WritableSignal<ErrorState> = signal(null);
  private _history: WritableSignal<string[]> = signal([]);
  // private _favorite: WritableSignal<string[]> = signal([]);

  public readonly response: Signal<string | null> = this._response.asReadonly();
  public readonly isGenerating: Signal<boolean> =
    this._isGenerating.asReadonly();
  public readonly error: Signal<ErrorState> = this._error.asReadonly();
  // public readonly favorites  = this._favorite.asReadonly();
  // public readonly history = this._history.asReadonly();

  constructor() {
    this._ai = new GoogleGenAI(this.options);
  }

  async send(message: string): Promise<void> {
    if (!message.trim() || message.trim() == '')
      throw new Error('Message cannot be empty...');
    if (!this._ai) throw new Error('Gemini AI service not initialized...');
    this._error.set(null);

    try {
      this._isGenerating.set(true);

      this.getHistory();
      const aiResponse = await this._ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message,
        config: {
          thinkingConfig: {
            thinkingBudget: 0, // Disables thinking
          },
        },
      });
      const text: string | undefined = aiResponse.text;
      console.log('ai response', aiResponse);

      if (text) this._response.set(text);
      console.log('end response', this.response());
    } catch (error: unknown) {
      this._error.set(
        'The AI was unable to respond properly. Please try again later...',
      );
    } finally {
      this._isGenerating.set(false);
    }
  }

  createMessage() {}
  public clearError(): void {
    this._error.set(null);
  }
  private getHistory(): ChatMessage[] {
    console.log('getting entire history...');
    const _chatHistory = this._chat.getHistory();
    console.log("here's the history: ", _chatHistory);

    return _chatHistory;
  }
}

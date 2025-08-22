import { Injectable, signal, WritableSignal } from '@angular/core';
import { GoogleGenAI, GoogleGenAIOptions } from '@google/genai';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GeminiAi {
  options: GoogleGenAIOptions = {
    apiKey: environment.gemini_api_key,
  };

  private _ai: GoogleGenAI | null = null;
  private _response: WritableSignal<ChatMessage | null> =
    signal<ChatMessage | null>(null);
  private _isGenerating: WritableSignal<boolean> = signal(false);
  private _error: WritableSignal<ErrorState> = signal(null);
  private _history: WritableSignal<string[]> = signal([]);
  // private _favorite: WritableSignal<string[]> = signal([]);

  public readonly response = this._response.asReadonly();
  public readonly isGenerating = this._isGenerating.asReadonly();
  public readonly error = this._error.asReadonly();
  // public readonly favorites  = this._favorite.asReadonly();
  // public readonly history = this._history.asReadonly();

  constructor() {
    this._ai = new GoogleGenAI(this.options);
  }

  async test(): Promise<any> {
    const response = await this._ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello how are you?',
      config: {
        thinkingConfig: {
          thinkingBudget: 0, // Disables thinking
        },
      },
    });
  }

  async dummy(): Promise<any> {
    console.log('response: ');
  }

  async send(message: string): Promise<void> {
    if (message.trim()) throw new Error('Message cannot be empty...');
    if (this._ai) throw new Error('Gemini AI service not initialized...');

    this._error.set(null);
    try {
      this._isGenerating.set(true);

      const response = await this._ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message,
        config: {
          thinkingConfig: {
            thinkingBudget: 0, // Disables thinking
          },
        },
      });
      const text: string | undefined = response.text;

      let aimessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: text ? text : '',
        sender: 'ai',
        timestamp: new Date(),
      };

      if (text) this._response.set(aimessage);
    } catch (error: unknown) {
      this._error.set(
        'The AI was unable to respond properly. Please try again later...',
      );
    } finally {
      this._isGenerating.set(false);
    }
  }

  public clearError(): void {
    this._error.set(null);
  }
}

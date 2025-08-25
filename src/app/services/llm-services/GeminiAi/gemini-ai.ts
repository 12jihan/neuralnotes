import {
  inject,
  Injectable,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import {
  Chat,
  Content,
  GenerateContentResponse,
  GoogleGenAI,
  GoogleGenAIOptions,
} from '@google/genai';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GeminiAi {
  options: GoogleGenAIOptions = {
    apiKey: environment.gemini_api_key,
  };

  private _ai: GoogleGenAI | null = null;
  private _chat: Chat | null = null;
  private _response: WritableSignal<string | null> = signal<string | null>(
    null,
  );
  private _isGenerating: WritableSignal<boolean> = signal(false);
  private _error: WritableSignal<ErrorState> = signal(null);
  private _history: WritableSignal<Content[]> = signal([]);

  public readonly response: Signal<string | null> = this._response.asReadonly();
  public readonly isGenerating: Signal<boolean> =
    this._isGenerating.asReadonly();
  public readonly error: Signal<ErrorState> = this._error.asReadonly();
  public readonly history = this._history.asReadonly();

  constructor() {
    this._ai = new GoogleGenAI(this.options);
    this._initializeGeminiAI();
  }

  private _initializeGeminiAI(): void {
    this._chat = this._ai!.chats.create({
      model: 'gemini-2.5-flash',
      history: [],
      config: {
        thinkingConfig: {
          thinkingBudget: 0, // Disables thinking
        },
      },
    });
  }

  async sendPromptZeroShot(message: string): Promise<void> {
    if (!message.trim() || message.trim() == '')
      throw new Error('Message cannot be empty...');
    if (!this._ai) throw new Error('Gemini AI service not initialized...');
    this._error.set(null);

    try {
      this._isGenerating.set(true);

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

  async sendPromptMultiTurn(message: string): Promise<void> {
    if (!message.trim() || message.trim() == '')
      throw new Error('Message cannot be empty...');
    if (!this._ai) throw new Error('Gemini AI service not initialized...');
    this._error.set(null);
    console.log('message', message);

    try {
      this._isGenerating.set(true);

      let res: GenerateContentResponse;
      if (this._chat) {
        res = await this._chat.sendMessage({
          message: message,
        });
        console.log(res);
        this._response.set(
          res.text
            ? res.text
            : 'Please try again the model was unable to respond appropriately',
        );
      }
      // console.log('ai response', this.response());
      // console.log('chat history', this._chat!.getHistory());
    } catch (error: unknown) {
      this._error.set(
        'The AI was unable to respond properly. Please try again later...',
      );
    } finally {
      this._isGenerating.set(false);
    }
  }

  async sendPromptStream(message: string): Promise<any> {
    if (!message.trim()) throw new Error('Message cannot be empty...');
    if (!this._ai) throw new Error('Gemini AI service not initialized...');

    this._error.set(null);
    this._isGenerating.set(true);

    // Clear previous response
    this._response.set('');
    try {
      let stream: AsyncGenerator<GenerateContentResponse>;
      if (this._chat) {
        // Use existing chat for multi-turn conversation
        stream = await this._chat.sendMessageStream({
          message: message,
        });
      } else {
        throw new Error('Ai is not properly initialized...');
      }

      // Process the stream
      for await (const chunk of stream!) {
        const chunkText = chunk.text;
        if (chunkText) {
          console.log('Chunk received:', chunkText);
          console.log('_'.repeat(80));

          // Accumulate the response by appending each chunk
          this._response.update(
            (currentResponse) => (currentResponse || '') + chunkText,
          );
        }
      }

      console.log('Stream complete. Final response:', this._response());
    } catch (error: unknown) {
      console.error('Streaming error:', error);
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

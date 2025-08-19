import { Injectable } from '@angular/core';
import { GoogleGenAI, GoogleGenAIOptions } from '@google/genai';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GeminiAi {
  options: GoogleGenAIOptions = {
    apiKey: environment.gemini_api_key,
  };

  ai: GoogleGenAI | null = null;

  constructor() {
    this.ai = new GoogleGenAI(this.options);
  }

  async test(): Promise<any> {
    const response = await this.ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello how are you?',
      config: {
        thinkingConfig: {
          thinkingBudget: 0, // Disables thinking
        },
      },
    });

    console.log('response: ', response);
  }
}

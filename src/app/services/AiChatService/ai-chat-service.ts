import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AiChatService {
  http: HttpClient = inject(HttpClient);

  async sendMessage(): Promise<any> {
    console.log('chat was sent');
  }
}

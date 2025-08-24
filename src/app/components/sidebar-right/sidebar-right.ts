import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  signal,
  WritableSignal,
  input,
  output,
  inject,
  Signal,
} from '@angular/core';
import { GeminiAi } from '../../services/llm-services/GeminiAi/gemini-ai';
import { environment } from '../../../../environments/environment';
import { Chat } from '../../services/ChatServices/chat';
import { MarkdownComponent } from 'ngx-markdown';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

@Component({
  selector: 'app-sidebar-right',
  imports: [CommonModule, FormsModule, MarkdownComponent],
  templateUrl: './sidebar-right.html',
  styleUrl: './sidebar-right.scss',
})
export class SidebarRight {
  // Injections
  gemini: GeminiAi = inject(GeminiAi);
  chat: Chat = inject(Chat);
  // Inputs
  // chatMessages = input.required<ChatMessage[]>();
  chatMessages = this.chat.chatMessages;

  // Outputs
  // messageSent = output<string>();

  // Local state
  rightSidebarCollapsed: WritableSignal<boolean> = signal(false);
  chatInput: WritableSignal<string> = signal('');

  toggleRightSidebar(): void {
    this.rightSidebarCollapsed.update(
      (collapsed: boolean): boolean => !collapsed,
    );
  }

  constructor() {
    console.log(this.chat.chatMessages());
  }
  async sendMessage(event?: KeyboardEvent | Event): Promise<void> {
    // TODO: Forgot what this does. Double check later and figure out what's going on here.
    if (event && event instanceof KeyboardEvent && !event.ctrlKey) {
      event.preventDefault();
      return;
    }

    const input = this.chatInput().trim();
    if (!input) return;

    this.chatInput.set('');
    this.chat.handleMessageSent(input);

    // This was used to handle the message with the output() binding to a function in the parent component.
    // this.messageSent.emit(input);
  }
}

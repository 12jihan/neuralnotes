import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  signal,
  WritableSignal,
  input,
  output,
  inject,
} from '@angular/core';
import { GeminiAi } from '../../services/llm-services/GeminiAi/gemini-ai';
import { environment } from '../../../../environments/environment';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

@Component({
  selector: 'app-sidebar-right',
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar-right.html',
  styleUrl: './sidebar-right.scss',
})
export class SidebarRight {
  // Injections
  gemini: GeminiAi = inject(GeminiAi);

  // Inputs
  chatMessages = input.required<ChatMessage[]>();

  // Outputs
  messageSent = output<string>();

  // Local state
  rightSidebarCollapsed: WritableSignal<boolean> = signal(false);
  chatInput: WritableSignal<string> = signal('');

  toggleRightSidebar(): void {
    this.rightSidebarCollapsed.update(
      (collapsed: boolean): boolean => !collapsed,
    );
  }

  async sendMessage(event?: KeyboardEvent | Event): Promise<void> {
    if (event && event instanceof KeyboardEvent && !event.ctrlKey) {
      event.preventDefault();
      return;
    }

    const input = this.chatInput().trim();
    if (!input) return;

    this.chatInput.set('');
    // this.gemini.send(this.chatInput());
    debugger;
    this.messageSent.emit(input);
  }
}

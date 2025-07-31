import { Component, signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';

import { SidebarRight } from './components/sidebar-right/sidebar-right';
import { SidebarLeft } from './components/sidebar-left/sidebar-left';
import { MainEditor } from './components/main-editor/main-editor';

interface Folder {
  id: string;
  name: string;
  color: string;
  isExpanded: boolean;
  createdAt: Date;
}

interface Note {
  id: string;
  title: string;
  content: string; // Keep for compatibility
  lines: string[]; // New line-based structure
  preview: string;
  lastModified: Date;
  folderId?: string; // Optional folder assignment
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, CommonModule, SidebarRight, SidebarLeft, MainEditor],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('neuralnotes');

  // Sidebar collapse states (now managed by individual components)
  // leftSidebarCollapsed = signal(false);
  // rightSidebarCollapsed = signal(false);

  // View mode, line editing state, and backlink state moved to main-editor component

  constructor(private sanitizer: DomSanitizer) {
    // Marked configuration moved to main-editor component
  }

  // Folders management
  folders = signal<Folder[]>([
    {
      id: 'personal',
      name: 'Personal',
      color: '#8b5cf6',
      isExpanded: true,
      createdAt: new Date(Date.now() - 172800000), // 2 days ago
    },
    {
      id: 'work',
      name: 'Work',
      color: '#10b981',
      isExpanded: true,
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
    },
    {
      id: 'ideas',
      name: 'Ideas',
      color: '#f59e0b',
      isExpanded: false,
      createdAt: new Date(),
    },
  ]);

  // Notes management
  notes = signal<Note[]>([
    {
      id: '1',
      title: 'Welcome to Neural Notes',
      content:
        '# Welcome to Neural Notes\n\nThis is your first note! You can use **markdown** to format your text.\n\n## Features\n- **Bold** and *italic* text\n- Lists and checkboxes\n- `inline code` examples\n- Code blocks with enhanced styling\n- Links and more!\n\n### Code Examples\n\nHere\'s some `inline code` that should look great!\n\n```javascript\nfunction greetUser(name) {\n  console.log(`Hello, ${name}!`);\n  return `Welcome to Neural Notes, ${name}`;\n}\n\ngreetUser("Developer");\n```\n\nYou can also mix `code` with **bold** and *italic* text.\n\nStart writing your thoughts here!',
      lines: [
        '# Welcome to Neural Notes',
        '',
        'This is your first note! You can use **markdown** to format your text.',
        '',
        '## Features',
        '- **Bold** and *italic* text',
        '- Lists and checkboxes',
        '- `inline code` examples',
        '- Code blocks with enhanced styling',
        '- Links and more!',
        '',
        '### Code Examples',
        '',
        "Here's some `inline code` that should look great!",
        '',
        '```javascript',
        'function greetUser(name) {',
        '  console.log(`Hello, ${name}!`);',
        '  return `Welcome to Neural Notes, ${name}`;',
        '}',
        '',
        'greetUser("Developer");',
        '```',
        '',
        'You can also mix `code` with **bold** and *italic* text.',
        '',
        'Start writing your thoughts here!',
      ],
      preview: 'This is your first note! You can use markdown to format...',
      lastModified: new Date(),
      folderId: 'personal',
    },
    {
      id: '2',
      title: 'Meeting Notes',
      content:
        "# Meeting Notes\n\n## Today's Agenda\n- [x] Discussed project timeline\n- [x] Assigned tasks  \n- [ ] Next meeting scheduled\n\n### Action Items\n1. Review code by **Friday**\n2. Update documentation\n3. Prepare demo\n\n> Important: Remember to follow up on pending items",
      lines: [
        '# Meeting Notes',
        '',
        "## Today's Agenda",
        '- [x] Discussed project timeline',
        '- [x] Assigned tasks',
        '- [ ] Next meeting scheduled',
        '',
        '### Action Items',
        '1. Review code by **Friday**',
        '2. Update documentation',
        '3. Prepare demo',
        '',
        '> Important: Remember to follow up on pending items',
      ],
      preview: "Meeting Notes - Today's Agenda: Discussed project timeline",
      lastModified: new Date(Date.now() - 86400000), // Yesterday
      folderId: 'work',
    },
  ]);

  selectedNote = signal<Note | null>(null);
  // searchQuery = signal(''); // Moved to sidebar-left

  // Chat functionality
  chatMessages = signal<ChatMessage[]>([
    {
      id: '1',
      content:
        "Hello! I'm your AI assistant. I can help you with your notes, answer questions, and provide insights.",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  // chatInput = signal(''); // Moved to sidebar-right

  // Computed properties
  // filteredNotes moved to sidebar-left component

  // Markdown rendering, backlink processing, and line editing moved to main-editor component

  // Methods
  // toggleLeftSidebar and toggleRightSidebar moved to respective sidebar components

  // toggleMarkdownPreview moved to main-editor component

  selectNote(note: Note) {
    this.selectedNote.set(note);
    // Line editing state reset is now handled by main-editor component
  }

  createNewNote() {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      lines: [''],
      preview: '',
      lastModified: new Date(),
    };

    this.notes.update((notes) => [newNote, ...notes]);
    this.selectedNote.set(newNote);
  }

  handleNoteUpdated(updatedNote: Note) {
    const existingNote = this.notes().find(note => note.id === updatedNote.id);
    
    if (!existingNote) {
      // This is a new note (from backlink creation) - add it and select it
      this.notes.update((notes) => [updatedNote, ...notes]);
      this.selectedNote.set(updatedNote);
    } else if (updatedNote === existingNote) {
      // This is backlink navigation to an existing note - just select it
      this.selectedNote.set(updatedNote);
    } else {
      // This is an update to an existing note - update it in the array
      this.notes.update((notes) =>
        notes.map((note) => (note.id === updatedNote.id ? { ...updatedNote } : note)),
      );
    }
  }

  // Folder management methods
  toggleFolder(folderId: string) {
    this.folders.update((folders) =>
      folders.map((folder) =>
        folder.id === folderId
          ? { ...folder, isExpanded: !folder.isExpanded }
          : folder
      )
    );
  }

  moveNoteToFolder(event: { noteId: string; folderId: string | null }) {
    this.notes.update((notes) =>
      notes.map((note) =>
        note.id === event.noteId
          ? { ...note, folderId: event.folderId || undefined }
          : note
      )
    );
  }

  createFolder(name: string) {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: name,
      color: '#6b7280', // Default color
      isExpanded: true,
      createdAt: new Date(),
    };

    this.folders.update((folders) => [...folders, newFolder]);
  }

  // All line editing methods moved to main-editor component

  handleMessageSent(input: string) {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    this.chatMessages.update((messages) => [...messages, userMessage]);

    // Simulate AI response (replace with actual AI integration later)
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: this.generateAIResponse(input),
        sender: 'ai',
        timestamp: new Date(),
      };

      this.chatMessages.update((messages) => [...messages, aiMessage]);
    }, 1000);
  }

  private generateAIResponse(userInput: string): string {
    // Simple response generation (replace with actual AI service)
    const responses = [
      "That's an interesting point! Could you elaborate more?",
      'I can help you organize those thoughts into a structured note.',
      'Based on your notes, I notice some patterns. Would you like me to analyze them?',
      'Let me help you find related notes or create connections.',
      'That reminds me of your previous note. Shall I bring it up?',
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}

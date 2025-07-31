import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, signal, WritableSignal, computed, input, output } from '@angular/core';

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
  content: string;
  lines: string[];
  preview: string;
  lastModified: Date;
  folderId?: string;
  tags: string[];
}

@Component({
  selector: 'app-sidebar-left',
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar-left.html',
  styleUrl: './sidebar-left.scss',
})
export class SidebarLeft {
  // Inputs
  notes = input.required<Note[]>();
  folders = input.required<Folder[]>();
  selectedNote = input<Note | null>(null);
  
  // Outputs
  noteSelected = output<Note>();
  newNoteCreated = output<void>();
  folderToggled = output<string>(); // folder id
  noteMovedToFolder = output<{noteId: string, folderId: string | null}>();
  newFolderCreated = output<string>(); // folder name
  
  // Local state
  leftSidebarCollapsed: WritableSignal<boolean> = signal(false);
  searchQuery = signal('');
  
  // Drag and drop state
  draggedNote = signal<Note | null>(null);
  dragOverFolder = signal<string | null>(null);
  
  // Folder creation state
  showNewFolderInput = signal(false);
  newFolderName = signal('');
  selectedColor = signal('#8b5cf6');
  showColorPicker = signal(false);
  
  // Predefined color palette
  colorPalette = [
    '#8b5cf6', // Purple
    '#10b981', // Green
    '#f59e0b', // Orange
    '#ef4444', // Red
    '#3b82f6', // Blue
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange-red
    '#6366f1', // Indigo
    '#84cc16', // Lime
    '#f43f5e', // Rose
    '#06b6d4', // Cyan
  ];
  
  // Computed properties
  filteredNotes = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.notes();

    return this.notes().filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query),
    );
  });
  
  // Organize notes by folder
  notesByFolder = computed(() => {
    const notes = this.filteredNotes();
    const folders = this.folders();
    
    const organized: { [key: string]: Note[] } = {};
    
    // Initialize folder buckets
    folders.forEach(folder => {
      organized[folder.id] = [];
    });
    organized['uncategorized'] = []; // For notes without folders
    
    // Sort notes into folders
    notes.forEach(note => {
      const folderId = note.folderId || 'uncategorized';
      if (organized[folderId]) {
        organized[folderId].push(note);
      } else {
        organized['uncategorized'].push(note);
      }
    });
    
    return organized;
  });

  toggleLeftSidebar(): void {
    this.leftSidebarCollapsed.update(
      (collapsed: boolean): boolean => !collapsed,
    );
  }
  
  selectNote(note: Note): void {
    this.noteSelected.emit(note);
  }
  
  createNewNote(): void {
    this.newNoteCreated.emit();
  }
  
  // Folder methods
  toggleFolder(folderId: string): void {
    this.folderToggled.emit(folderId);
  }
  
  showCreateFolderInput(): void {
    this.showNewFolderInput.set(true);
    this.selectedColor.set('#8b5cf6'); // Reset to default color
    this.showColorPicker.set(false);
    // Focus the input after the view updates
    setTimeout(() => {
      const input = document.querySelector('.new-folder-input') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 0);
  }
  
  hideCreateFolderInput(): void {
    this.showNewFolderInput.set(false);
    this.newFolderName.set('');
    this.selectedColor.set('#8b5cf6');
    this.showColorPicker.set(false);
  }
  
  createFolder(): void {
    const name = this.newFolderName().trim();
    if (name) {
      // Pass both name and color to the parent
      this.newFolderCreated.emit(JSON.stringify({ name, color: this.selectedColor() }));
      this.hideCreateFolderInput();
    }
  }
  
  // Color picker methods
  toggleColorPicker(): void {
    this.showColorPicker.update(show => !show);
  }
  
  selectPaletteColor(color: string): void {
    this.selectedColor.set(color);
    this.showColorPicker.set(false);
  }
  
  onCustomColorChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectedColor.set(target.value);
  }
  
  onFolderNameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.createFolder();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.hideCreateFolderInput();
    }
  }
  
  // Drag and drop methods
  onNoteDragStart(event: DragEvent, note: Note): void {
    this.draggedNote.set(note);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', note.id);
    }
  }
  
  onNoteDragEnd(): void {
    this.draggedNote.set(null);
    this.dragOverFolder.set(null);
  }
  
  onFolderDragOver(event: DragEvent, folderId: string): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverFolder.set(folderId);
  }
  
  onFolderDragLeave(): void {
    this.dragOverFolder.set(null);
  }
  
  onFolderDrop(event: DragEvent, folderId: string): void {
    event.preventDefault();
    const draggedNote = this.draggedNote();
    if (draggedNote) {
      this.noteMovedToFolder.emit({ 
        noteId: draggedNote.id, 
        folderId: folderId === 'uncategorized' ? null : folderId 
      });
    }
    this.dragOverFolder.set(null);
    this.draggedNote.set(null);
  }
}

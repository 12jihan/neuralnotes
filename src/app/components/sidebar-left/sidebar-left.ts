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

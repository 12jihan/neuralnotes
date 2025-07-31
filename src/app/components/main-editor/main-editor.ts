import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, signal, computed, input, output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

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
  selector: 'app-main-editor',
  imports: [CommonModule, FormsModule],
  templateUrl: './main-editor.html',
  styleUrl: './main-editor.scss',
})
export class MainEditor {
  // Inputs
  selectedNote = input<Note | null>(null);
  allNotes = input.required<Note[]>();
  
  // Outputs
  noteUpdated = output<Note>();
  
  // Local state
  showMarkdownPreview = signal(false);
  focusedLineIndex = signal<number | null>(null);
  cursorPosition = signal(0);
  editingLineIndex = signal<number | null>(null);
  lineRenderModes = signal<{ [lineIndex: number]: 'edit' | 'rendered' }>({});
  
  // Backlink autocomplete state
  showBacklinkSuggestions = signal(false);
  backlinkSuggestions = signal<Note[]>([]);
  backlinkQuery = signal('');
  currentLineForSuggestions = signal<number | null>(null);

  constructor(private sanitizer: DomSanitizer) {
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  // Computed properties
  markdownPreview = computed(() => {
    const selected = this.selectedNote();
    if (!selected) return this.sanitizer.bypassSecurityTrustHtml('');

    try {
      const html = marked.parse(selected.content, { async: false }) as string;
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return this.sanitizer.bypassSecurityTrustHtml(
        '<p>Error parsing markdown</p>',
      );
    }
  });

  // Check if a line should be rendered as markdown
  shouldRenderLine = computed(() => {
    const editingIndex = this.editingLineIndex();
    const focusedIndex = this.focusedLineIndex();
    const selected = this.selectedNote();

    return (lineIndex: number): boolean => {
      // Don't render if currently editing this line OR if it's focused
      if (editingIndex === lineIndex || focusedIndex === lineIndex)
        return false;

      // Check if line has markdown content
      if (!selected || !selected.lines[lineIndex]) return false;

      const line = selected.lines[lineIndex];
      return this.hasMarkdownContent(line);
    };
  });

  // Methods
  toggleMarkdownPreview() {
    this.showMarkdownPreview.update((show) => !show);
  }

  // Individual line markdown rendering
  renderLineMarkdown(line: string): SafeHtml {
    if (!line.trim()) {
      return this.sanitizer.bypassSecurityTrustHtml(
        '<div class="empty-line">&nbsp;</div>',
      );
    }

    try {
      // First process backlinks before standard markdown
      let processedLine = this.processBacklinks(line);

      const html = marked.parse(processedLine, { async: false }) as string;
      // Remove wrapping <p> tags for inline rendering
      const cleanHtml = html.replace(/^<p>/, '').replace(/<\/p>\s*$/, '');
      return this.sanitizer.bypassSecurityTrustHtml(cleanHtml);
    } catch (error) {
      console.error('Line markdown parsing error:', error);
      return this.sanitizer.bypassSecurityTrustHtml(line);
    }
  }

  // Process backlinks [[Note Title]] and convert to clickable elements
  private processBacklinks(line: string): string {
    return line.replace(/\[\[([^\]]+)\]\]/g, (match, noteTitle) => {
      const trimmedTitle = noteTitle.trim();
      const existingNote = this.findNoteByTitle(trimmedTitle);
      const linkClass = existingNote ? 'backlink-existing' : 'backlink-missing';

      return `<span class="backlink ${linkClass}" data-note-title="${trimmedTitle}">${trimmedTitle}</span>`;
    });
  }

  // Find a note by its title
  private findNoteByTitle(title: string): Note | undefined {
    return this.allNotes().find(
      (note) => note.title.toLowerCase() === title.toLowerCase(),
    );
  }

  // Detect if a line contains markdown syntax
  private hasMarkdownContent(line: string): boolean {
    if (!line.trim()) return false;

    // Check for common markdown patterns
    const markdownPatterns = [
      /^#{1,6}\s+/, // Headers
      /\*\*.*\*\*/, // Bold
      /\*.*\*/, // Italic
      /`.*`/, // Inline code
      /^\s*[-*+]\s+/, // Lists
      /^\s*\d+\.\s+/, // Numbered lists
      /^\s*>\s+/, // Blockquotes
      /\[.*\]\(.*\)/, // Links
      /^```/, // Code blocks
      /\[\[.*\]\]/, // Backlinks [[Note Title]]
    ];

    return markdownPatterns.some((pattern) => pattern.test(line));
  }

  updateNote() {
    const selected = this.selectedNote();
    if (!selected) return;

    // Sync lines back to content string for compatibility
    selected.content = selected.lines.join('\n');

    // Update preview (first 50 characters of content)
    const contentPreview = selected.lines.find((line) => line.trim()) || '';
    selected.preview =
      contentPreview.substring(0, 50) +
      (contentPreview.length > 50 ? '...' : '');
    selected.lastModified = new Date();

    this.noteUpdated.emit(selected);
  }

  // Line editing methods
  updateLine(lineIndex: number, content: string) {
    const selected = this.selectedNote();
    if (!selected) return;

    selected.lines[lineIndex] = content;
    this.updateNote();

    // Check for backlink typing
    this.checkForBacklinkTyping(content, lineIndex);
  }

  // Check if user is typing a backlink and show suggestions
  private checkForBacklinkTyping(content: string, lineIndex: number) {
    const backlinkMatch = content.match(/\[\[([^\]]*?)$/);

    if (backlinkMatch) {
      const query = backlinkMatch[1].toLowerCase();
      this.backlinkQuery.set(query);
      this.currentLineForSuggestions.set(lineIndex);

      // Filter existing notes based on query
      const suggestions = this.allNotes()
        .filter(
          (note) =>
            note.title.toLowerCase().includes(query) &&
            note !== this.selectedNote(),
        )
        .slice(0, 5); // Limit to 5 suggestions

      this.backlinkSuggestions.set(suggestions);
      this.showBacklinkSuggestions.set(suggestions.length > 0);
    } else {
      this.hideBacklinkSuggestions();
    }
  }

  // Hide backlink suggestions
  private hideBacklinkSuggestions() {
    this.showBacklinkSuggestions.set(false);
    this.backlinkSuggestions.set([]);
    this.backlinkQuery.set('');
    this.currentLineForSuggestions.set(null);
  }

  // Insert a backlink suggestion
  insertBacklinkSuggestion(suggestion: Note) {
    const selected = this.selectedNote();
    const lineIndex = this.currentLineForSuggestions();

    if (!selected || lineIndex === null) return;

    const currentLine = selected.lines[lineIndex];
    const updatedLine = currentLine.replace(
      /\[\[([^\]]*?)$/,
      `[[${suggestion.title}]]`,
    );

    this.updateLine(lineIndex, updatedLine);
    this.hideBacklinkSuggestions();

    // Focus back to the line
    setTimeout(() => {
      this.focusLine(lineIndex, updatedLine.length);
    }, 0);
  }

  insertLineAt(lineIndex: number, content: string = '') {
    const selected = this.selectedNote();
    if (!selected) return;

    selected.lines.splice(lineIndex, 0, content);
    this.updateNote();
  }

  deleteLine(lineIndex: number) {
    const selected = this.selectedNote();
    if (!selected || selected.lines.length <= 1) return;

    selected.lines.splice(lineIndex, 1);
    this.updateNote();
  }

  handleEnterKey(lineIndex: number, cursorPos: number) {
    const selected = this.selectedNote();
    if (!selected) return;

    const currentLine = selected.lines[lineIndex];
    const beforeCursor = currentLine.substring(0, cursorPos);
    const afterCursor = currentLine.substring(cursorPos);

    // Update current line with content before cursor
    selected.lines[lineIndex] = beforeCursor;

    // Insert new line with content after cursor
    selected.lines.splice(lineIndex + 1, 0, afterCursor);
    this.updateNote();

    // Focus the new line (below current line)
    setTimeout(() => {
      this.editingLineIndex.set(lineIndex + 1);
      this.focusLine(lineIndex + 1, 0);
    }, 10);
  }

  handleBackspaceAtStart(lineIndex: number) {
    const selected = this.selectedNote();
    if (!selected) return;

    // If we're at the first line, don't do anything
    if (lineIndex === 0) return;

    const currentLine = selected.lines[lineIndex];
    const previousLine = selected.lines[lineIndex - 1];
    const mergedContent = previousLine + currentLine;
    const cursorPosition = previousLine.length;

    // Update previous line with merged content
    selected.lines[lineIndex - 1] = mergedContent;

    // Remove current line
    selected.lines.splice(lineIndex, 1);
    this.updateNote();

    // Focus previous line at the merge point
    setTimeout(() => {
      this.focusLine(lineIndex - 1, cursorPosition);
    }, 0);
  }

  handleLineKeydown(event: KeyboardEvent, lineIndex: number) {
    const target = event.target as HTMLElement;
    const selection = window.getSelection();

    // Get cursor position more reliably
    let cursorPos = 0;
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        cursorPos = range.startOffset;
      } else if (range.startContainer === target) {
        // If the cursor is at the element level, calculate position
        let textLength = 0;
        for (let i = 0; i < range.startOffset; i++) {
          const node = target.childNodes[i];
          if (node.nodeType === Node.TEXT_NODE) {
            textLength += node.textContent?.length || 0;
          }
        }
        cursorPos = textLength;
      }
    }

    switch (event.key) {
      case 'Enter':
        // Hide backlink suggestions if showing
        if (this.showBacklinkSuggestions()) {
          this.hideBacklinkSuggestions();
        }
        event.preventDefault();
        this.handleEnterKey(lineIndex, cursorPos);
        break;

      case 'Backspace':
        if (cursorPos === 0) {
          if (target.textContent === '' || lineIndex > 0) {
            event.preventDefault();
            this.handleBackspaceAtStart(lineIndex);
          }
        }
        break;

      case 'ArrowUp':
        if (lineIndex > 0) {
          event.preventDefault();
          // Force the target line to be editable if it's rendered
          this.editingLineIndex.set(lineIndex - 1);
          setTimeout(() => {
            this.focusLine(lineIndex - 1, cursorPos);
          }, 0);
        }
        break;

      case 'ArrowDown':
        const selected = this.selectedNote();
        if (selected && lineIndex < selected.lines.length - 1) {
          event.preventDefault();
          // Force the target line to be editable if it's rendered
          this.editingLineIndex.set(lineIndex + 1);
          setTimeout(() => {
            this.focusLine(lineIndex + 1, cursorPos);
          }, 0);
        }
        break;

      case 'ArrowLeft':
        if (cursorPos === 0 && lineIndex > 0) {
          event.preventDefault();
          // Move to the end of the previous line
          const selectedNote = this.selectedNote();
          if (selectedNote) {
            const previousLineLength = selectedNote.lines[lineIndex - 1].length;
            this.editingLineIndex.set(lineIndex - 1);
            setTimeout(() => {
              this.focusLine(lineIndex - 1, previousLineLength);
            }, 0);
          }
        }
        break;

      case 'ArrowRight':
        const currentSelected = this.selectedNote();
        if (
          currentSelected &&
          cursorPos >= (target.textContent?.length || 0) &&
          lineIndex < currentSelected.lines.length - 1
        ) {
          event.preventDefault();
          // Move to the beginning of the next line
          this.editingLineIndex.set(lineIndex + 1);
          setTimeout(() => {
            this.focusLine(lineIndex + 1, 0);
          }, 0);
        }
        break;
    }
  }

  focusLine(lineIndex: number, cursorPos: number = 0) {
    setTimeout(() => {
      const lineElement = document.querySelector(
        `[data-line-index="${lineIndex}"]`,
      ) as HTMLElement;
      if (lineElement && lineElement.contentEditable === 'true') {
        lineElement.focus();

        // Set cursor position
        const range = document.createRange();
        const selection = window.getSelection();

        if (lineElement.childNodes.length > 0) {
          // Find the text node or use the first child
          let textNode = lineElement.firstChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const maxPos = textNode.textContent?.length || 0;
            const safePos = Math.min(cursorPos, maxPos);

            range.setStart(textNode, safePos);
            range.setEnd(textNode, safePos);
          } else {
            // If no text node, create one or position at element start
            range.setStart(lineElement, 0);
            range.setEnd(lineElement, 0);
          }
        } else {
          // Empty element
          range.setStart(lineElement, 0);
          range.setEnd(lineElement, 0);
        }

        selection?.removeAllRanges();
        selection?.addRange(range);

        this.focusedLineIndex.set(lineIndex);
        this.cursorPosition.set(cursorPos);
      }
    }, 10);
  }

  // Handle line focus for live markdown editing
  handleLineFocus(lineIndex: number) {
    this.editingLineIndex.set(lineIndex);
    this.focusedLineIndex.set(lineIndex);
  }

  // Handle line blur for live markdown rendering
  handleLineBlur(lineIndex: number) {
    // Small delay to allow for immediate refocus if needed
    setTimeout(() => {
      if (this.editingLineIndex() === lineIndex) {
        this.editingLineIndex.set(null);
      }
      this.focusedLineIndex.set(null);
    }, 100);
  }

  // Handle clicking on rendered markdown to edit
  handleRenderedLineClick(lineIndex: number, event?: MouseEvent) {
    // Check if the click was on a backlink
    if (event && (event.target as HTMLElement).classList.contains('backlink')) {
      const noteTitle = (event.target as HTMLElement).getAttribute(
        'data-note-title',
      );
      if (noteTitle) {
        this.handleBacklinkClick(noteTitle);
        return;
      }
    }

    this.editingLineIndex.set(lineIndex);
    setTimeout(() => {
      this.focusLine(lineIndex);
    }, 0);
  }

  // Handle backlink navigation
  handleBacklinkClick(noteTitle: string) {
    const existingNote = this.findNoteByTitle(noteTitle);

    if (existingNote) {
      // For existing notes, we need to emit a navigation event
      // We'll emit the existing note which the parent will handle differently
      this.noteUpdated.emit(existingNote);
    } else {
      // Create new note with the title
      this.createNoteFromBacklink(noteTitle);
    }
  }

  // Create a new note from a backlink
  private createNoteFromBacklink(title: string) {
    const newNote: Note = {
      id: Date.now().toString(),
      title: title,
      content: '',
      lines: [''],
      preview: '',
      lastModified: new Date(),
    };

    this.noteUpdated.emit(newNote);
  }
}
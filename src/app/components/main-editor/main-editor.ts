import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  signal,
  computed,
  input,
  output,
  effect,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MarkdownComponent } from 'ngx-markdown';
import { marked } from 'marked';

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
  selector: 'app-main-editor',
  imports: [CommonModule, FormsModule, MarkdownComponent],
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

  // Code block state
  codeBlockRanges = signal<{ start: number; end: number; language?: string }[]>(
    [],
  );

  // Backlink autocomplete state
  showBacklinkSuggestions = signal(false);
  backlinkSuggestions = signal<Note[]>([]);
  backlinkQuery = signal('');
  currentLineForSuggestions = signal<number | null>(null);

  // Tag management state
  newTagInput = signal('');
  showTagSuggestions = signal(false);
  tagSuggestions = signal<string[]>([]);

  constructor(private sanitizer: DomSanitizer) {
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    // Update code block ranges when selected note changes
    effect(() => {
      const selected = this.selectedNote();
      if (selected) {
        this.updateCodeBlockRanges();
      }
    });
  }

  // Computed properties

  // Get rendered items (combining code blocks and individual lines)
  getRenderedItems = computed(() => {
    const selected = this.selectedNote();
    if (!selected) return [];

    const ranges = this.codeBlockRanges();
    const editingIndex = this.editingLineIndex();
    const focusedIndex = this.focusedLineIndex();

    const items: any[] = [];
    let skipUntil = -1;

    selected.lines.forEach((line, index) => {
      // Skip lines that are part of already processed code blocks
      if (index <= skipUntil) return;

      // Check if this line starts a code block
      const codeBlockRange = ranges.find((range) => range.start === index);

      if (codeBlockRange) {
        // Check if any line in the code block is being edited
        let isEditing = false;
        for (let i = codeBlockRange.start; i <= codeBlockRange.end; i++) {
          if (editingIndex === i || focusedIndex === i) {
            isEditing = true;
            break;
          }
        }

        if (isEditing) {
          // Show individual lines when editing
          for (let i = codeBlockRange.start; i <= codeBlockRange.end; i++) {
            items.push({
              id: `line-${i}`,
              type: 'line',
              index: i,
              content: selected.lines[i],
              shouldRender: false,
            });
          }
        } else {
          // Show as single code block
          const codeBlockContent = this.renderCompleteCodeBlock(codeBlockRange);
          items.push({
            id: `codeblock-${codeBlockRange.start}-${codeBlockRange.end}`,
            type: 'codeblock',
            startIndex: codeBlockRange.start,
            endIndex: codeBlockRange.end,
            content: codeBlockContent,
          });
        }

        skipUntil = codeBlockRange.end;
      } else {
        // Regular line processing
        const shouldRender = this.shouldRenderLine()(index);
        const content = shouldRender
          ? this.renderLineMarkdown(line, index)
          : line;

        items.push({
          id: `line-${index}`,
          type: 'line',
          index: index,
          content: content,
          shouldRender: shouldRender,
        });
      }
    });

    console.log('🔧 Final items:', items);
    console.log('🔧 Items count:', items.length);
    return items;
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
      const codeBlockInfo = this.isLineInCodeBlock(lineIndex);

      // If line is in a code block, only render if we're not editing any line in that block
      if (codeBlockInfo.inBlock && codeBlockInfo.range) {
        // Check if any line in the code block is being edited
        for (
          let i = codeBlockInfo.range.start;
          i <= codeBlockInfo.range.end;
          i++
        ) {
          if (editingIndex === i || focusedIndex === i) {
            return false; // Show all lines as editable if any line in the block is being edited
          }
        }
        // Only render the opening line of the code block, hide the rest
        return lineIndex === codeBlockInfo.range.start;
      }

      // Only check for markdown content if not in a code block
      return this.hasMarkdownContent(line, lineIndex);
    };
  });

  // Methods
  toggleMarkdownPreview() {
    this.showMarkdownPreview.update((show) => !show);
  }

  // Individual line markdown rendering
  renderLineMarkdown(line: string, lineIndex: number): SafeHtml {
    if (!line.trim()) {
      return this.sanitizer.bypassSecurityTrustHtml(
        '<div class="empty-line">&nbsp;</div>',
      );
    }

    const codeBlockInfo = this.isLineInCodeBlock(lineIndex);

    // If this line is part of a code block, render the entire code block
    if (codeBlockInfo.inBlock && codeBlockInfo.range) {
      return this.renderCodeBlock(codeBlockInfo.range, lineIndex);
    }

    // Only process other markdown types if NOT in a code block
    // Check if this is a checkbox line
    const lineMetadata = this.getLineMetadata(line);
    if (lineMetadata.type === 'checkbox') {
      return this.renderCheckboxLine(
        line,
        lineIndex,
        lineMetadata.checked || false,
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

  // Render a checkbox line with custom styling
  private renderCheckboxLine(
    line: string,
    lineIndex: number,
    isChecked: boolean,
  ): SafeHtml {
    const trimmed = line.trim();
    // Extract the text after the checkbox
    const textMatch = trimmed.match(/^-\s*\[[x\s]\]\s+(.*)$/);
    const text = textMatch ? textMatch[1] : '';

    // Process backlinks in the text
    const processedText = this.processBacklinks(text);

    // Create checkbox HTML
    const checkboxIcon = isChecked ? '☑' : '☐';
    const textClass = isChecked ? 'checkbox-text completed' : 'checkbox-text';

    const html = `
      <div class="checkbox-line">
        <span class="checkbox-icon" data-line-index="${lineIndex}">${checkboxIcon}</span>
        <span class="${textClass}">${processedText}</span>
      </div>
    `;

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // Render a complete code block
  private renderCodeBlock(
    range: { start: number; end: number; language?: string },
    currentLineIndex: number,
  ): SafeHtml {
    const selected = this.selectedNote();
    if (!selected || currentLineIndex !== range.start) {
      // Only render the code block on the first line, return empty for other lines
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    // Get the entire code block including the backticks
    const allLines = selected.lines.slice(range.start, range.end + 1);
    const codeBlockContent = allLines.join('\n');

    // Use marked to parse the complete code block
    try {
      const html = marked.parse(codeBlockContent, { async: false }) as string;
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch (error) {
      console.error('Code block rendering error:', error);
      // Fallback to manual rendering
      const codeLines = selected.lines.slice(range.start + 1, range.end);
      const codeContent = codeLines.join('\n');
      const language = range.language || '';
      const safeContent = this.escapeHtml(codeContent);
      const languageClass = language ? ` class="language-${language}"` : '';

      const fallbackHtml = `
        <pre>
          <code${languageClass}>${safeContent}</code>
        </pre>
      `;
      return this.sanitizer.bypassSecurityTrustHtml(fallbackHtml);
    }
  }

  // Render a complete code block as a single HTML element
  private renderCompleteCodeBlock(range: {
    start: number;
    end: number;
    language?: string;
  }): SafeHtml {
    const selected = this.selectedNote();
    if (!selected) return this.sanitizer.bypassSecurityTrustHtml('');

    // Get just the code content (excluding the ``` lines)
    const codeLines = selected.lines.slice(range.start + 1, range.end);
    const codeContent = codeLines.join('\n');
    const language = range.language || '';
    const safeContent = this.escapeHtml(codeContent);

    // Create HTML structure manually to ensure it works
    const languageClass = language ? ` class="language-${language}"` : '';
    const html = `
      <pre><code${languageClass}>${safeContent}</code></pre>
    `;
    console.log('code block html:', html);

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // Handle clicking on a code block
  handleCodeBlockClick(startIndex: number, event?: MouseEvent) {
    // Don't interfere with text selection
    const selection = window.getSelection();
    if (event && (event.detail > 1 || (selection && !selection.isCollapsed))) {
      return;
    }

    // Focus the first content line of the code block (not the ``` line)
    const targetLineIndex = startIndex + 1;

    setTimeout(() => {
      const currentSelection = window.getSelection();
      if (currentSelection && currentSelection.isCollapsed) {
        this.editingLineIndex.set(targetLineIndex);
        this.focusedLineIndex.set(targetLineIndex);
        setTimeout(() => {
          this.focusLine(targetLineIndex, 0);
        }, 0);
      }
    }, 10);
  }

  // Escape HTML entities
  private escapeHtml(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
  private hasMarkdownContent(line: string, lineIndex?: number): boolean {
    if (!line.trim()) return false;

    // If we have a line index, check if it's inside a code block
    if (lineIndex !== undefined) {
      const codeBlockInfo = this.isLineInCodeBlock(lineIndex);
      if (codeBlockInfo.inBlock) {
        // Lines inside code blocks should not be processed as markdown
        // Only the opening ``` line should be detected as markdown
        return line.trim().startsWith('```');
      }
    }

    // Check for common markdown patterns
    const markdownPatterns = [
      /^#{1,6}\s+/, // Headers
      /\*\*.*\*\*/, // Bold
      /\*.*\*/, // Italic
      /`.*`/, // Inline code
      /^\s*[-*+]\s+(?!\[)/, // Lists (but not checkboxes)
      /^\s*\d+\.\s+/, // Numbered lists
      /^\s*>\s+/, // Blockquotes
      /\[.*\]\(.*\)/, // Links
      /^```/, // Code block start/end
      /\[\[.*\]\]/, // Backlinks [[Note Title]]
      /^\s*-\s*\[[x\s]\]\s+/, // Checkboxes
    ];

    return markdownPatterns.some((pattern) => pattern.test(line));
  }

  // Get line type and metadata for styling
  getLineMetadata(line: string): {
    type: string;
    indent: number;
    listNumber?: string;
    checked?: boolean;
  } {
    const trimmed = line.trim();
    const leadingSpaces = line.length - line.trimStart().length;
    const indent = Math.floor(leadingSpaces / 2); // Assuming 2 spaces per indent level

    // Check for checkboxes first (more specific than regular lists)
    const checkboxMatch = trimmed.match(/^-\s*\[([x\s])\]\s+/);
    if (checkboxMatch) {
      const isChecked = checkboxMatch[1].toLowerCase() === 'x';
      return { type: 'checkbox', indent, checked: isChecked };
    }

    // Check for unordered list (but not checkboxes)
    const unorderedListMatch = trimmed.match(/^[-*+]\s+(?!\[)/);
    if (unorderedListMatch) {
      return { type: 'unordered-list', indent };
    }

    // Check for ordered list
    const orderedListMatch = trimmed.match(/^(\d+)\.\s/);
    if (orderedListMatch) {
      return { type: 'ordered-list', indent, listNumber: orderedListMatch[1] };
    }

    // Check for headers
    const headerMatch = trimmed.match(/^(#{1,6})\s/);
    if (headerMatch) {
      return { type: `header-${headerMatch[1].length}`, indent };
    }

    // Check for blockquotes
    if (trimmed.match(/^>\s/)) {
      return { type: 'blockquote', indent };
    }

    return { type: 'text', indent };
  }

  // Detect and update code block ranges
  private updateCodeBlockRanges() {
    const selected = this.selectedNote();
    if (!selected) {
      this.codeBlockRanges.set([]);
      return;
    }

    const ranges: { start: number; end: number; language?: string }[] = [];
    let inCodeBlock = false;
    let currentStart = -1;
    let currentLanguage: string | undefined;

    selected.lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        if (!inCodeBlock) {
          // Starting a code block
          inCodeBlock = true;
          currentStart = index;
          currentLanguage = trimmed.substring(3).trim() || undefined;
        } else {
          // Ending a code block
          inCodeBlock = false;
          if (currentStart !== -1) {
            ranges.push({
              start: currentStart,
              end: index,
              language: currentLanguage,
            });
          }
          currentStart = -1;
          currentLanguage = undefined;
        }
      }
    });

    // Handle unclosed code blocks
    if (inCodeBlock && currentStart !== -1) {
      ranges.push({
        start: currentStart,
        end: selected.lines.length - 1,
        language: currentLanguage,
      });
    }
    this.codeBlockRanges.set(ranges);
  }

  // Check if a line is inside a code block
  isLineInCodeBlock(lineIndex: number): {
    inBlock: boolean;
    range?: { start: number; end: number; language?: string };
  } {
    const ranges = this.codeBlockRanges();
    for (const range of ranges) {
      if (lineIndex >= range.start && lineIndex <= range.end) {
        return { inBlock: true, range };
      }
    }
    return { inBlock: false };
  }

  // Check if a line should be hidden (part of a code block rendered elsewhere)
  shouldHideLine(lineIndex: number): boolean {
    const editingIndex = this.editingLineIndex();
    const focusedIndex = this.focusedLineIndex();
    const codeBlockInfo = this.isLineInCodeBlock(lineIndex);

    if (codeBlockInfo.inBlock && codeBlockInfo.range) {
      // Check if any line in the code block is being edited
      for (
        let i = codeBlockInfo.range.start;
        i <= codeBlockInfo.range.end;
        i++
      ) {
        if (editingIndex === i || focusedIndex === i) {
          return false; // Show all lines when editing
        }
      }
      // Hide ALL lines except the opening line when not editing
      // The opening line will render the entire code block
      return lineIndex !== codeBlockInfo.range.start;
    }
    return false;
  }

  // Get all unique tags from all notes for autocomplete
  private getAllTags = computed(() => {
    const allTags = new Set<string>();
    this.allNotes().forEach((note) => {
      note.tags.forEach((tag) => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  });

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

    // Update code block ranges when content changes
    this.updateCodeBlockRanges();

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

  // Handle clicking on editable lines
  handleEditableLineClick(lineIndex: number, event: MouseEvent) {
    // Don't interfere with text selection or double-clicks
    const selection = window.getSelection();
    if (event.detail === 2 || (selection && !selection.isCollapsed)) {
      return;
    }

    // Only handle single clicks when there's no text selection
    if (event.detail === 1) {
      // Check if we're switching from a different line or not in edit mode
      const currentEditingLine = this.editingLineIndex();
      const wasEditingDifferentLine =
        currentEditingLine !== null && currentEditingLine !== lineIndex;

      if (wasEditingDifferentLine) {
        // Small delay to allow selection to complete if user is selecting text
        setTimeout(() => {
          const currentSelection = window.getSelection();
          if (currentSelection && currentSelection.isCollapsed) {
            // No selection, proceed with line switching
            this.editingLineIndex.set(lineIndex);
            this.focusedLineIndex.set(lineIndex);

            const range = document.caretRangeFromPoint(
              event.clientX,
              event.clientY,
            );
            if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
              const cursorPosition = range.startOffset;
              setTimeout(() => {
                this.focusLine(lineIndex, cursorPosition);
              }, 0);
            }
          }
        }, 10);
      }
      // If we're already editing this line, let the browser handle cursor positioning naturally
    }
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
    // Check if the click was on a checkbox
    if (
      event &&
      (event.target as HTMLElement).classList.contains('checkbox-icon')
    ) {
      this.toggleCheckbox(lineIndex);
      return;
    }

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

    // Don't interfere with text selection or double-clicks
    const selection = window.getSelection();
    if (event && (event.detail > 1 || (selection && !selection.isCollapsed))) {
      return;
    }

    // Check if this is a code block - if so, focus the first line of the code block
    const codeBlockInfo = this.isLineInCodeBlock(lineIndex);
    const targetLineIndex =
      codeBlockInfo.inBlock && codeBlockInfo.range
        ? codeBlockInfo.range.start + 1 // Focus the first content line, not the ``` line
        : lineIndex;

    // Small delay to allow selection to complete if user is selecting text
    setTimeout(() => {
      const currentSelection = window.getSelection();
      if (currentSelection && currentSelection.isCollapsed) {
        // No selection, proceed with switching to edit mode
        let cursorPosition = 0;
        if (event && !codeBlockInfo.inBlock) {
          cursorPosition = this.calculateCursorPositionFromClick(
            event,
            lineIndex,
          );
        }

        this.editingLineIndex.set(targetLineIndex);
        this.focusedLineIndex.set(targetLineIndex);
        setTimeout(() => {
          this.focusLine(targetLineIndex, cursorPosition);
        }, 0);
      }
    }, 10);
  }

  // Toggle checkbox state
  toggleCheckbox(lineIndex: number) {
    const selected = this.selectedNote();
    if (!selected || !selected.lines[lineIndex]) return;

    const line = selected.lines[lineIndex];
    const trimmed = line.trim();

    // Check if it's a checkbox line
    const checkboxMatch = trimmed.match(/^(\s*-\s*)\[([x\s])\](\s+.*)$/);
    if (checkboxMatch) {
      const prefix = checkboxMatch[1];
      const currentState = checkboxMatch[2];
      const suffix = checkboxMatch[3];

      // Toggle the state
      const newState = currentState.toLowerCase() === 'x' ? ' ' : 'x';
      const newLine = line.replace(
        /^(\s*-\s*)\[([x\s])\]/,
        `${prefix}[${newState}]`,
      );

      selected.lines[lineIndex] = newLine;
      this.updateNote();
    }
  }

  // Calculate cursor position from click coordinates
  private calculateCursorPositionFromClick(
    event: MouseEvent,
    lineIndex: number,
  ): number {
    const selected = this.selectedNote();
    if (!selected) return 0;

    const plainText = selected.lines[lineIndex];
    const clickX = event.clientX;
    const targetElement = event.target as HTMLElement;

    // Create a temporary element to measure text widths
    const tempElement = document.createElement('div');
    tempElement.style.position = 'absolute';
    tempElement.style.visibility = 'hidden';
    tempElement.style.whiteSpace = 'pre';
    tempElement.style.font = window.getComputedStyle(targetElement).font;
    document.body.appendChild(tempElement);

    const elementRect = targetElement.getBoundingClientRect();
    const relativeX = clickX - elementRect.left;

    let bestPosition = 0;
    let bestDistance = Infinity;

    // Test each possible cursor position
    for (let i = 0; i <= plainText.length; i++) {
      tempElement.textContent = plainText.substring(0, i);
      const width = tempElement.offsetWidth;
      const distance = Math.abs(width - relativeX);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestPosition = i;
      }
    }

    document.body.removeChild(tempElement);
    return bestPosition;
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
      tags: [],
    };

    this.noteUpdated.emit(newNote);
  }

  // Tag management methods
  addTag(tag: string): void {
    const selected = this.selectedNote();
    if (!selected) return;

    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !selected.tags.includes(trimmedTag)) {
      selected.tags.push(trimmedTag);
      this.updateNote();
    }
  }

  removeTag(tag: string): void {
    const selected = this.selectedNote();
    if (!selected) return;

    const index = selected.tags.indexOf(tag);
    if (index > -1) {
      selected.tags.splice(index, 1);
      this.updateNote();
    }
  }

  handleTagKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const tag = input.value.trim();

    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (tag) {
        this.addTag(tag);
        this.newTagInput.set('');
        this.hideTagSuggestions();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.newTagInput.set('');
      input.blur();
      this.hideTagSuggestions();
    } else if (event.key === 'ArrowDown') {
      // Handle arrow navigation in suggestions (simplified)
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      // Handle arrow navigation in suggestions (simplified)
      event.preventDefault();
    } else {
      // Show suggestions as user types
      setTimeout(() => {
        this.updateTagSuggestions(this.newTagInput());
      }, 0);
    }
  }

  addTagIfValid(): void {
    const tag = this.newTagInput().trim();
    if (tag) {
      this.addTag(tag);
      this.newTagInput.set('');
      this.hideTagSuggestions();
    }
  }

  // Tag suggestion methods
  private updateTagSuggestions(query: string): void {
    if (!query.trim()) {
      this.hideTagSuggestions();
      return;
    }

    const selectedNote = this.selectedNote();
    if (!selectedNote) return;

    const lowercaseQuery = query.toLowerCase();
    const existingTags = selectedNote.tags;

    const suggestions = this.getAllTags()
      .filter(
        (tag) =>
          tag.toLowerCase().includes(lowercaseQuery) &&
          !existingTags.includes(tag),
      )
      .slice(0, 5); // Limit to 5 suggestions

    this.tagSuggestions.set(suggestions);
    this.showTagSuggestions.set(suggestions.length > 0);
  }

  private hideTagSuggestions(): void {
    this.showTagSuggestions.set(false);
    this.tagSuggestions.set([]);
  }

  selectTagSuggestion(tag: string): void {
    this.addTag(tag);
    this.newTagInput.set('');
    this.hideTagSuggestions();
  }
}


interface Note {
  id: string;
  title: string;
  content: string; // Keep for compatibility
  lines: string[]; // New line-based structure
  preview: string;
  lastModified: Date;
  folderId?: string; // Optional folder assignment
  tags: string[]; // Tags for categorization
}

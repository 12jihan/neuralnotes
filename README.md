# Neural Notes 🧠

**⚠️ ALPHA VERSION - This application is in early development and may contain bugs or incomplete features.**

A powerful note-taking application inspired by Capacities.io, built with Angular 18. Features a modern three-panel layout with advanced markdown support, folder organization, tagging system, and AI assistance for optimal productivity.

## ✨ Features

### Core Note-Taking
- **Live Markdown Editing**: Real-time markdown rendering with syntax highlighting
- **Line-by-Line Editing**: Edit individual lines with immediate markdown preview
- **Backlink Support**: Create connections between notes using `[[Note Title]]` syntax
- **Rich Text Support**: Headers, code blocks, lists, bold, italic, blockquotes, and more

### Organization & Management
- **Folder System**: Organize notes into custom folders with color coding
- **Color Picker**: Choose folder colors from a predefined palette or custom color wheel
- **Drag & Drop**: Move notes between folders with intuitive drag-and-drop interface
- **Tagging System**: Add multiple tags to notes for easy categorization
- **Tag Autocomplete**: Smart suggestions based on existing tags across all notes
- **Real-time Search**: Instantly search through your notes by title and content

### User Interface
- **Three-Panel Layout**: Left sidebar for notes/folders, main editor, right sidebar for AI chat
- **Collapsible Sidebars**: Both sidebars can be collapsed to maximize editing space
- **Responsive Design**: Optimized for desktop and mobile devices
- **Modern UI**: Clean, intuitive interface with smooth animations and hover effects

### AI Integration
- **Chat Assistant**: Built-in AI helper for note management and insights
- **Smart Suggestions**: Get help organizing and connecting your thoughts

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (comes with Node.js)

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd neuralnotes
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or alternatively
   ng serve
   ```

4. **Open your browser**
   Navigate to `http://localhost:4200/`

The application will automatically reload whenever you modify any of the source files.

## 📝 How to Use

### Creating & Editing Notes
1. Click "New Note" in the left sidebar to create a note
2. Start typing in the main editor area
3. Use markdown syntax for rich formatting:
   - `# Header`, `## Subheader` for headers
   - `**bold**` and `*italic*` for emphasis
   - `` `code` `` for inline code
   - `> Quote` for blockquotes

### Organizing with Folders
1. Click "New Folder" to create a custom folder
2. Choose a color from the palette or use the custom color picker
3. Drag and drop notes into folders to organize them
4. Click folder names to expand/collapse

### Adding Tags
1. Open any note in the main editor
2. Use the tag input field in the header area
3. Type a tag name and press Enter or comma to add
4. Get autocomplete suggestions based on existing tags
5. Remove tags by clicking the × button on tag pills

### Creating Backlinks
1. Type `[[Note Title]]` in any note to create a backlink
2. Click on backlinks to navigate between connected notes
3. Create new notes by clicking on non-existent backlinks

### Using the AI Chat
1. Open the right sidebar if collapsed
2. Type your questions or requests in the chat
3. Get help with note organization and insights

## 🛠 Available Scripts

- `npm start` - Start the development server
- `npm run build` - Build the app for production  
- `npm run watch` - Build and watch for changes
- `npm test` - Run unit tests

## ⚠️ Alpha Version Notice

This application is currently in **alpha development**. Please be aware that:

- **Data Persistence**: Notes are not yet saved permanently and will reset on page reload
- **Feature Completeness**: Some features may be incomplete or change without notice
- **AI Integration**: The chat assistant currently uses mock responses
- **Stability**: You may encounter bugs or unexpected behavior

**Important**: Don't rely on this version for critical note-taking without external backups.

## 🔮 Planned Features

- [ ] Data persistence (local storage and cloud sync)
- [ ] Real AI integration with advanced capabilities
- [ ] Export functionality (PDF, Markdown, HTML)
- [ ] Advanced search with filters and tags
- [ ] Note templates and snippets
- [ ] Collaborative editing and sharing
- [ ] Plugin system for extensibility
- [ ] Mobile app versions

## 🛠 Technology Stack

- **Frontend**: Angular 18 with standalone components
- **State Management**: Angular Signals for reactive updates  
- **Styling**: SCSS with BEM methodology and CSS custom properties
- **Markdown**: Marked.js for parsing and rendering
- **Drag & Drop**: HTML5 Drag and Drop API
- **Icons**: Inline SVG icons for performance

## 📁 Project Structure

```
src/
├── app/
│   ├── components/          # Angular components
│   │   ├── sidebar-left/    # Notes and folders management
│   │   ├── sidebar-right/   # AI chat interface  
│   │   └── main-editor/     # Note editor with tags
│   └── app.ts              # Main application component
├── styles/                 # SCSS stylesheets
│   ├── base/              # Variables, reset, foundations
│   ├── components/        # Component-specific styles
│   ├── layout/           # Layout and grid styles  
│   └── utils/            # Utility classes and mixins
```

## 🐛 Found a Bug?

Since this is an alpha version, bugs are expected! If you encounter issues:

1. Try refreshing the page to reset the application state
2. Check browser console for any error messages
3. Note the steps to reproduce the issue for future reporting

## 📄 License

This project is in active development. License details will be provided in future releases.

---

**Happy note-taking! 📝✨**

*Built with ❤️ using Angular 18 and modern web technologies*

# DocFlow — Next-Gen Modern Web Document Processor & Reader

**DocFlow** is a modern, high-performance, responsive web-based document processor, reader, spreadsheet studio, presentation editor, and whiteboard workspace. Built with Vanilla JavaScript, HTML5, and CSS3, DocFlow delivers a desktop-class editing experience inspired by modern document suites while operating completely client-side in the browser.

---

## 🏷️ Languages, Tools & Technologies

### 💻 Languages & Core Web Stack
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Markdown](https://img.shields.io/badge/Markdown-000000?style=for-the-badge&logo=markdown&logoColor=white)
![React 18](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

### 🛠️ Developer Tools & Libraries
![SheetJS](https://img.shields.io/badge/SheetJS-217346?style=for-the-badge&logo=microsoft-excel&logoColor=white)
![PDF.js](https://img.shields.io/badge/PDF.js-FF0000?style=for-the-badge&logo=adobe-acrobat-reader&logoColor=white)
![Excalidraw](https://img.shields.io/badge/Excalidraw-6965DB?style=for-the-badge&logo=excalidraw&logoColor=white)
![Font Awesome](https://img.shields.io/badge/Font_Awesome-528DD7?style=for-the-badge&logo=font-awesome&logoColor=white)
![Google Fonts](https://img.shields.io/badge/Google_Fonts-4285F4?style=for-the-badge&logo=google-fonts&logoColor=white)
![VS Code](https://img.shields.io/badge/VS_Code-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)

### 📄 Document Formats & Suites
![Word .DOCX](https://img.shields.io/badge/Word_.DOCX-2B579A?style=for-the-badge&logo=microsoft-word&logoColor=white)
![Excel .XLSX](https://img.shields.io/badge/Excel_.XLSX-217346?style=for-the-badge&logo=microsoft-excel&logoColor=white)
![PowerPoint .PPTX](https://img.shields.io/badge/PowerPoint_.PPTX-D24726?style=for-the-badge&logo=microsoft-powerpoint&logoColor=white)
![Adobe .PDF](https://img.shields.io/badge/Adobe_.PDF-EC1C24?style=for-the-badge&logo=adobe-acrobat-reader&logoColor=white)
![Markdown & HTML](https://img.shields.io/badge/Markdown_&_HTML-000000?style=for-the-badge&logo=markdown&logoColor=white)

### 🌐 Cross-Browser Compatibility
![Google Chrome](https://img.shields.io/badge/Google_Chrome-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)
![Microsoft Edge](https://img.shields.io/badge/Microsoft_Edge-0078D7?style=for-the-badge&logo=microsoft-edge&logoColor=white)
![Mozilla Firefox](https://img.shields.io/badge/Mozilla_Firefox-FF7139?style=for-the-badge&logo=firefox-browser&logoColor=white)
![Apple Safari](https://img.shields.io/badge/Apple_Safari-000000?style=for-the-badge&logo=safari&logoColor=white)
![Opera](https://img.shields.io/badge/Opera-FF1B2D?style=for-the-badge&logo=opera&logoColor=white)
![Brave](https://img.shields.io/badge/Brave-FB542B?style=for-the-badge&logo=brave&logoColor=white)

### ⚡ Key Capabilities & Architecture Options
![100% Client-Side](https://img.shields.io/badge/100%25_Client_Side-00C853?style=for-the-badge&logo=google-cloud&logoColor=white)
![Privacy First](https://img.shields.io/badge/Privacy_First-673AB7?style=for-the-badge&logo=shield&logoColor=white)
![Offline Capable](https://img.shields.io/badge/Offline_Capable-0284C7?style=for-the-badge&logo=pwa&logoColor=white)
![Responsive Design](https://img.shields.io/badge/Responsive_Design-F59E0B?style=for-the-badge&logo=responsive&logoColor=white)

---

## 🚀 Key Highlights & Architecture

- **Zero-Dependency Core Runtime**: Ultra-fast load times with vanilla JavaScript modules and clean separation of concerns.
- **Full Responsive Design**: Optimized across mobile phones, tablets, laptops, and ultra-wide desktop monitors.
- **Dynamic 2-Row Ribbon Balancer**: Strict maximum of 2 rows only (never 3+ rows). Smooth single-row collapse when space permits, dynamic rearrange on resize, horizontal mouse wheel / touch scroll, and orphan button recovery.
- **Client-Side Privacy**: All document reading, parsing, rendering, editing, and conversions run entirely inside your browser. No files are uploaded to any external server.
- **Visual Font Family Selector**: Interactive font family dropdown showing each font name and sample preview rendered directly in its native typeface with Calibri as the default font.
- **Non-Destructive HTML Comment Engine**: Comment lines, selections, or code blocks without altering document layout, headings, tables, or formatting.
- **Extensive Excel Formulas**: 50+ spreadsheet formulas spanning math, statistics, text, logic, and dates with seamless mouse-wheel scrollable popovers.
- **Rich PowerPoint Transitions & Animations**: 35+ slide transitions and 30+ element animations with customizable duration timers.
- **Modern Warning Containers & Modals**: Themed warning boxes, icon badges, and glowing confirmation modals for destructive action safety.
- **Auto-Save Engine & Recent Documents**: Persistent auto-save with a 5-second inactivity timer, real-time green/red state indicators, and recent documents management.
- **Multi-Page Fixed Watermark Printing**: Reliable repeating watermark across every printed page in multi-page documents via CSS Paged Media standards.
- **Official Excalidraw Whiteboard Studio**: Full drawing suite powered by React 18 and `@excalidraw/excalidraw` with instant canvas export.

---

## 📁 Modular Code Structure

```
d:/antigravity/file reader/
├── index.html            # Main semantic HTML structure & application layout
├── README.md             # Complete documentation and user manual with badge icons
├── css/
│   ├── base.css          # Design tokens, themes (light/dark), CSS resets
│   ├── layout.css        # Topbar, responsive ribbon balancer, status bar, font dropdown
│   ├── editor.css        # Rich text canvas, slide transitions, animations, HTML comments, table resizer
│   ├── pdf.css           # PDF.js canvas, toolbar, page thumbnails, zoom controls
│   └── modals.css        # Warning containers, modal dialogs, Excalidraw studio, GIF search
└── js/
    ├── ui.js             # Theme switcher, ribbon balancer, wheel scroll capture, popovers, tabs
    ├── editor.js         # Typography engine, visual font selection, Change Case, formatting, table resizing
    ├── image-manager.js  # Image insertion, resizing handles, wrap modes, cropper, shapes, cell auto-resizing
    ├── pdf-viewer.js     # PDF.js integration, page rendering, text extraction
    ├── find-outline.js   # Document outline headings, real-time find & replace
    ├── file-io.js        # File parsers (DOCX, PDF, XLSX, PPTX, MD, HTML, TXT)
    └── app.js            # Coordinator, Excel formulas, cell notes, floating quotes, PPT animations
```

---

## 🎛️ Detailed Menu & Ribbon Feature Tour

### 1. Excel Menu & Spreadsheet Document Tools (`#ribbonPanelExcel`)
- **Cell Auto-Expanding & Auto-Resizing for Shapes, Images & Charts (Issue 1)**:
  - **Dynamic Fitting on Insertion**: When inserting shapes, images, or charts into an Excel cell, the target cell automatically expands both width and height to fit the object snugly without clipping or overflow.
  - **Auto-Resize on Movement**: Dragging and dropping an object onto a new cell automatically expands the destination cell, while cleanly restoring the previous cell back to its original dimensions.
  - **Z-Index Layer Protection**: Floating shapes and charts feature a protected `z-index: 25 !important`, ensuring they never become hidden behind cell borders, selection outlines, or active cell backgrounds when clicking on new cells.
  - **Auto-Resize on Removal**: Deleting any attached shape, image, or chart via the keyboard (`Delete` / `Backspace`) or the floating toolbar trashcan button automatically restores the cell and column/row dimensions back to their initial state.
- **Interactive Sticky Cell Notes (Issue 3)**:
  - **Floating Note Cards**: Notes are anchored directly to specific cell coordinates (e.g., `A1`, `C4`) and render as floating note cards with draggable headers and delete buttons.
  - **Auto-Hiding & Auto-Showing**: Cell notes automatically show when selecting their associated cell and gracefully auto-hide when clicking away to another cell.
  - **Undo & Redo Support**: Note typing fully supports `Ctrl+Z` (Undo) and `Ctrl+Y` / `Ctrl+Shift+Z` (Redo) both via keyboard shortcuts and toolbar buttons.
  - **Backspace & Delete Freedom**: Keyboard events inside notes are protected from spreadsheet cell clearing listeners, allowing effortless text editing and deletion.
  - **Text I-Beam Cursor & Precision Caret**: Hovering over note content displays the `cursor: text` I-beam, and clicking anywhere inside the note places the caret exactly at the clicked position.
  - **Placeholder Display**: When creating a new note, an empty placeholder (`Enter note...`) displays first instead of hardcoded placeholder text.
  - **Data Persistence**: Note content is automatically synchronized with `localStorage` and `PdfStore` via `Tabs.save()`.
- **Interactive Checklists, Full-Row Lines, and Floating Quotes in Excel (Issue 4)**:
  - **Interactive Checklists**: Inserting a checklist renders an interactive `<input type="checkbox">` and editable text directly in the active cell with live strikethrough toggle.
  - **Full-Row Custom Lines**: Inserting a line applies a crisp, styled border across the entire spreadsheet row rather than inserting raw `<hr>` HTML into a single cell.
  - **Floating Quote Cards**: Quotes in Excel render as styled floating quote cards (`.excel-floating-quote`) tied to cell coordinates, featuring draggable headers, auto-hiding on unselected cells, full undo/redo/backspace support, and placeholder text.
- **Expanded Formula Library**:
  - 50+ spreadsheet formulas spanning math, statistics, text, logic, and dates (`FACT`, `GCD`, `LCM`, `TRUNC`, `PI`, `LARGE`, `SMALL`, `RANK`, `CLEAN`, `EXACT`, `REPLACE`, `T`, `XOR`, `IFERROR`, `DAYS`, `YEARFRAC`, etc.).
  - Capture-phase mouse-wheel scrollable popover (`#excelFunctionPopover`).

---

### 2. Table Resizer & Move Cursor Architecture (`js/editor.js` & `css/editor.css`) (Issue 2)
- **High-Visibility Red Resizer Indicator Line**:
  - Moving the mouse near table column borders or row borders displays a bright, fixed red resizer line (`.df-table-resizer-line`) with subtle glow (`#ef4444`, `box-shadow: 0 0 8px rgba(239, 68, 68, 0.8)`).
- **Red SVG Resize Cursors**:
  - When hovering or dragging to resize table columns or rows, the cursor transforms into a vivid red SVG double-arrow cursor (`--cursor-col-resize-red` and `--cursor-row-resize-red`) with a white outline for maximum contrast on all document backgrounds.
- **Stable Table Move Handle**:
  - The floating table move handle (`.df-table-move-handle`) features a 40px hover buffer zone, completely eliminating premature handle disappearance when moving the mouse from the table to the handle.
  - Clicking and dragging the move handle displays a real-time ghost drop indicator and smoothly repositions the table in the document.

---

### 3. Home Menu (`#ribbonPanelHome`)
- **Visual Font Family Selector with Native Typeface Previews**:
  - Every font in the dropdown renders both its font name and preview text (`Aa Bb 123`) directly in its native typeface.
  - Outer button (`#fontFamilyBtn`) features a sleek 28px height, 140px width, rounded border, neutral background, focus-ring animations, and a smooth chevron indicator.
  - Scrollable popover (`#fontFamilyPopover`) with an expanded 300px max-height and custom scrollbar.
  - **Calibri Default**: Calibri is set as the default font across the toolbar label, dropdown selection, active checkmark, and editor document canvas.
- **Clear Formatting Warning Container**:
  - The Clear Formatting confirmation dialog (`#clearFormatModal`) is built with `.warning-container`, featuring an amber icon badge, warning tag, description, and smooth glowing backdrop animation in both dark and light modes.
- **Change Case Dropdown**:
  - Elevated floating popover (`#casePopover`) with `z-index: 1200 !important` and viewport-aware positioning supporting Sentence case, lowercase, UPPERCASE, and Capitalize Each Word.
- **Formatting Tools**: Bold (`Ctrl+B`), Italic (`Ctrl+I`), Underline (`Ctrl+U`), Strikethrough, Subscript, Superscript, Font Size stepper, Color Picker, Background Highlighter, and Format Painter.

---

### 4. PowerPoint Menu & Presentation Tools (`#ribbonPanelPpt`)
- **Slide Transitions Expansion**:
  - 35+ hardware-accelerated 3D slide transitions including `3D Swing Door`, `Float & Blur Up`, `Rotate & Zoom Out`, `Blinds Horizontal`, `Radial Expand`, and `Skew Slide In`.
- **Element Animations Expansion**:
  - 30+ element animations including `3D Swing In Top`, `Bounce In Right`, `Back In Down`, `Lightspeed In`, `Heart Pop Burst`, and `Slit In Vertical`.
- **Duration Timers**:
  - Independent timer selection for transition and animation durations (0.3s, 0.5s, 1.0s, 1.5s, 2.0s, 3.0s).

---

### 5. HTML Menu & Code Tools (`#ribbonPanelHtml`)
- **Non-Destructive Commenting**:
  - **WYSIWYG Mode**: Clicking **Comment Line** applies `.df-html-comment-block` with subtle comment opacity and monospace pseudo-elements `<!-- ` and ` -->` without deleting nodes or disturbing margins or formatting.
  - **Code View Mode**: Toggles `<!-- ... -->` on single lines or multi-line selections with exact indentation and line-break preservation. Supports CSS `/* ... */` and JS `//`.

---

### 6. Warning Container System (`css/modals.css`)
- **Component Classes**:
  - `.warning-container`, `.warning-box`: Soft amber background, rounded corners, subtle border, and responsive flex layout.
  - `.warning-icon-badge`: Circular warning icon badge with amber lighting.
  - `.warning-content`, `.warning-header`, `.warning-title`, `.warning-tag`, `.warning-desc`: Clear hierarchy separating the title, tag chip, and explanatory description.
  - `.warning-modal-container`: Glowing modal border and animated shadow emphasizing destructive confirmation dialogs.
- **Dual-Theme Support**:
  - Automatically styled for both Dark Mode and Light Mode (`[data-theme="light"]`).

---

### 7. File & Layout Tools
- **File Menu (`#ribbonPanelFile`)**: New Document, Office file creation (.docx, .xlsx, .pptx, .pdf), Direct Print button (`Ctrl+P`), Auto-Save (5s timer), and Export (HTML, MD, TXT, PDF).
- **Layout Menu (`#ribbonPanelLayout`)**: Page Breaks (`Ctrl+Enter`), Column Breaks, Multi-Page Repeating Watermark in Print, Sheet Layout (1200px), and Slide Aspect (16:9).
- **View Menu (`#ribbonPanelView`)**: Slide Deck View, Excel Gridlines View, Distraction-Free Reading Mode, Headings Document Outline, Zoom (50%-200%), and Dark/Light Theme Switcher.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + N` | Create New Document |
| `Ctrl + O` | Open Document from Device |
| `Ctrl + S` | Save Current Document Tab |
| `Ctrl + P` | Print / Export Clean PDF |
| `Ctrl + B` | Toggle Bold |
| `Ctrl + I` | Toggle Italic |
| `Ctrl + U` | Toggle Underline |
| `Ctrl + Z` | Undo Typing (Global & Note/Quote-Aware) |
| `Ctrl + Y` | Redo Typing (Global & Note/Quote-Aware) |
| `Ctrl + F` | Open Find in Document |
| `Ctrl + H` | Open Find & Replace in Document |
| `Ctrl + \` | Clear Formatting (Opens Warning Modal) |
| `Esc` | Exit Reading Mode / Close Modals & Popovers |

---

## 🌐 Browser Support & Performance

- **Google Chrome**: Full support (desktop & mobile)
- **Mozilla Firefox**: Full support
- **Apple Safari**: Full support (iOS & macOS)
- **Microsoft Edge**: Full support
- **Opera / Brave / Chromium**: Full support

---

*Made with ❤ by Sachin*

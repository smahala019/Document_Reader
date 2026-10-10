# DocFlow — Next-Gen Modern Web Document Processor & Reader

**DocFlow** is a modern, high-performance, responsive web-based document processor, reader, and whiteboard studio. Built entirely with Vanilla JavaScript, HTML5, and CSS3, DocFlow delivers a desktop-class editing experience inspired by modern document suites while operating completely client-side in the browser.

---

## 🚀 Key Highlights & Architecture

- **Zero-Dependency Core Runtime**: Ultra-fast load times with vanilla JavaScript modules and clean separation of concerns.
- **Full Responsive Design**: Optimized across mobile phones, tablets, laptops, and ultra-wide desktop monitors.
- **Dynamic 2-Row Ribbon Balancer**: Strict maximum of 2 rows only (never 3+ rows). Smooth single-row collapse when space permits, dynamic rearrange on resize, horizontal mouse wheel / touch scroll, and orphan button recovery.
- **Client-Side Privacy**: All document reading, parsing, rendering, editing, and conversions run entirely inside your browser. No files are uploaded to any external server.
- **Auto-Save Engine & Recent Documents**: Persistent auto-save with a 5-second inactivity timer, real-time green/red state indicators, and recent documents management.
- **Multi-Page Fixed Watermark Printing**: Reliable repeating watermark across every printed page in multi-page documents via CSS Paged Media standards.
- **Official Excalidraw Whiteboard Studio**: Full drawing suite powered by React 18 and `@excalidraw/excalidraw` with instant canvas export.

---

## 📁 Modular Code Structure

```
d:/antigravity/file reader/
├── index.html            # Main semantic HTML structure & application layout
├── README.md             # Complete documentation and user manual
├── bug.txt               # Tracked improvements and bug specifications
├── css/
│   ├── base.css          # Design tokens, themes (light/dark), CSS resets
│   ├── layout.css        # Topbar, responsive ribbon balancer, status bar, popovers
│   ├── editor.css        # Rich text canvas, column breaks, page breaks, watermarks, print
│   └── modals.css        # Modal dialogs, overlays, Excalidraw studio, GIF search
└── js/
    ├── ui.js             # Theme switcher, ribbon balancer, popovers, modals, tabs
    ├── editor.js         # Text formatting engine, Change Case, column breaks, font size
    ├── image-manager.js  # Image insertion, resizing handles, wrap modes, cropper
    ├── pdf-viewer.js     # PDF.js integration, page rendering, text extraction
    ├── find-outline.js   # Document outline headings, real-time find & replace
    ├── file-io.js        # File parsers (DOCX, PDF, XLSX, PPTX, MD, HTML, TXT)
    └── app.js            # Coordinator, Excalidraw studio, GIF search, watermark print
```

---

## 🎛️ Detailed Menu & Ribbon Feature Tour

### 1. Responsive & Scrollable Toolbar (`.ribbon-panel`)
- **Strict Maximum of 2 Rows**: Enforced via CSS `max-height: 72px` and dynamic JavaScript calculations. The toolbar never creates a 3rd row under any circumstance.
- **Single-Row Adaptive Fit**: When sufficient horizontal viewport space is available, buttons automatically collapse into a single streamlined row (`.single-row`).
- **Dynamic 2-Row Wrap**: If screen width is reduced, buttons wrap neatly into 2 rows.
- **Orphan Button Recovery**: If only 1 button remains on the second row and space is available on the first row, DocFlow automatically moves that button back to row 1 to prevent leaving an isolated orphan button.
- **Silky-Smooth Scrolling**: Fully scrollable horizontally on smaller viewports with touch drag on mobile and mouse wheel scrolling on desktop (`initRibbonScroll`).
- **Preserved Styling**: Zero clipped buttons, zero overlapping, and 100% preservation of original Word-style aesthetics.

### 2. File Menu (`#ribbonPanelFile`)
- **New Document**: Create documents from scratch or customizable templates (Blank, Report, Letter, Resume, Meeting Notes).
- **Direct Office Creation**: Instant creation of Word (`.docx`), Excel (`.xlsx`), PowerPoint (`.pptx`), and PDF (`.pdf`) files.
- **Print Document Button**: Dedicated `#ribbonFilePrintBtn` in the File ribbon for 1-click access to the system print dialog.
- **Keyboard Shortcut `Ctrl + P`**: Standard shortcut triggers clean document printing without interfering with browser shortcuts or editor state.
- **Save Dropdown**: Export to HTML, Markdown, Plain Text, or Native Print/PDF.
- **Auto-Save**: Automatic background saving with real-time state indication (🔴 Unsaved / 🟢 Saved).

### 3. Home Menu (`#ribbonPanelHome`)
- **Change Case Dropdown Fixed**:
  - Elevated floating popover (`#casePopover`) with `z-index: 1200 !important` and viewport-aware `positionPopover`.
  - Opens firmly above the editor canvas without vertical overflow clipping or hiding behind page borders.
  - Text selection is preserved (`saveSelection()` / `restoreSelection()`) so transforming cases (Sentence case, lowercase, UPPERCASE, Capitalize Each Word) works reliably on selected text.
- **Microsoft Office Integrations**:
  - **Excel Table Style (`#homeExcelFormatBtn`)**: Applies professional Excel table styling (emerald green header, alternating row zebra striping, crisp borders) to an existing table, or inserts a 3×3 styled financial table.
  - **PowerPoint Slide Card (`#homePptLayoutBtn`)**: Inserts a 16:9 presentation slide callout card with slide title and bulleted points.
- **Formatting Tools**: Bold (`Ctrl+B`), Italic (`Ctrl+I`), Underline (`Ctrl+U`), Strikethrough, Subscript, Superscript, Font Family, Font Size stepper (unlimited), Color Picker, Background Highlighter, and Default Text Color (`auto`).
- **Lists & Alignment**: Bullets (Disc, Circle, Square, Diamond, Arrow, Check, Star, Dash), Numbering (1., a., A., i., I.), Indent/Outdent, and Line Spacing (1.0 to 3.0).
- **Editing Tools**: Find (`Ctrl+F`) and Find & Replace (`Ctrl+H`).

### 4. Insert Menu (`#ribbonPanelInsert`)
- **High-Performance GIF Search (`#gifModal`)**:
  - Curated library of 120+ animated GIFs across popular categories (Trending, Thumbs Up, Clap, Cats, Dogs, Celebration, Work, Dance).
  - Fast 2-second timeout network search with spinner loading indicator and instant fallback so search never hangs.
  - Tag chips for quick 1-click category browsing.
  - **Direct GIF URL Tab**: Insert any online GIF via URL with live image preview.
  - Inserted GIFs are fully managed with resize handles, wrap modes, and alignment.
- **Official Excalidraw Whiteboard Studio (`#paintModal`)**:
  - Powered by React 18 and the official `@excalidraw/excalidraw` library.
  - Studio tab renders the official Excalidraw engine with vector export directly into the document.
  - **Quick Canvas Tab**: Instant fallback with Freehand Pen, Straight Line, Arrow Pointer, Rectangle, Diamond, Circle, Text Labels, Sticky Notes, and Eraser.
- **Microsoft Office Embeds**:
  - **Excel Grid (`#ribbonInsertExcelGridBtn`)**: Embeds an interactive, formula-ready spreadsheet table with row headers (1-5), column headers (A-E), and editable cells.
  - **PPT Slide (`#ribbonInsertPptSlideBtn`)**: Embeds presentation slide cards with header badges, title, and key takeaways.
- **Media, Tables, Links & Symbols**:
  - Picture insertion with HTML5 image cropper and text wrapping (Inline, Behind, In Front, Wrap Left, Wrap Right).
  - Clean table insertion without unwanted placeholder text.
  - Clickable hyperlink previews with 1-click unlink.
  - Categorized Symbols modal (Currency, Math, Arrows, Greek, Typography).

### 5. Layout Menu (`#ribbonPanelLayout`)
- **Page Breaks (`#layoutPageBreakBtn`)**:
  - Designated page breaks (`.doc-page-break`) with dashed visual separator in editor.
  - Physical break in print (`break-after: page !important; page-break-after: always !important;`).
  - No negative margins or horizontal bleed; content flows smoothly without text overlapping.
- **Custom Column Breaks (`#layoutColumnBreakBtn`)**:
  - Controls exact flow from one column to the next (`break-after: column !important;`).
  - Visual blue dashed divider line in the editor indicating the break position.
  - In multi-column mode and discrete column panes (`.doc-col-pane`), users can click directly inside any column to type without cursor jumping.
- **Multi-Page Repeating Watermark**:
  - Watermark appears on **every single page** of multi-page documents in print via CSS Paged Media fixed viewport (`#dfPrintFixedWatermark`).
  - Replicated using `beforeprint` and `afterprint` lifecycle events.
  - Preserves exact rotation angle, opacity, color tone, position, and pattern count across all pages, page breaks, and multi-column sections.
- **Office Layout Presets**:
  - **Sheet Layout (`#layoutExcelFitBtn`)**: Toggles 1200px wide mode for large spreadsheets and wide tables.
  - **Slide 16:9 (`#layoutPptAspectBtn`)**: Toggles 16:9 widescreen slide canvas dimensions.

### 6. View Menu (`#ribbonPanelView`)
- **Slide Deck View (`#viewSlideDeckBtn`)**: Toggles presentation slide deck viewer background mode (`body.slide-deck-mode`) for reviewing presentation slides.
- **Excel Gridlines (`#viewExcelGridlinesBtn`)**: Toggles subtle spreadsheet gridline background and table cell borders (`.excel-gridlines-mode`).
- **Reading Mode**: Distraction-free reading canvas with floating Exit button and `Escape` key shortcut.
- **Document Outline**: Automatic hierarchy synchronization with document headings (`H1`-`H4`).
- **Editor Zoom**: Zoom in, zoom out, and reset zoom (50% to 200%).
- **Theme**: Instant toggle between Dark Mode and Light Mode.
- **Document Outline**: Headings drawer automatically synchronizing with document `H1`-`H4` tags for instant navigation.
- **Reading Mode**: Distraction-free mode with a floating **Exit Read Mode** button (`#exitReadingModeBtn`) for easy exit on mobile and desktop.
- **Zoom Controls**: Zoom in, zoom out, and reset zoom (50% to 200%).
- **Theme**: Seamless toggle between sleek Dark Mode and clean Light Mode.

---

## 📊 Status Bar & Home State Behavior

- **Dynamic Visibility**: When in the welcome / empty home state or when all tabs are closed, word count, character count, and line/column metrics are hidden.
- **Active Editing Metrics**: Word count, character count, and cursor position (`Ln X, Col Y`) activate and update in real-time as soon as the user enters or clicks into the editor canvas.
- **Credit Line**: Centered attribution footer ("all right reserved made with ❤ sachin") cleanly centered across all screen resolutions without interfering with stats.

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
| `Ctrl + Z` | Undo Typing |
| `Ctrl + Y` | Redo Typing |
| `Ctrl + F` | Open Find in Document |
| `Ctrl + H` | Open Find & Replace in Document |
| `Esc` | Exit Distraction-Free Reading Mode / Close Modals |

---

## 🌐 Browser Support & Performance

- **Google Chrome**: Full support (desktop & mobile)
- **Mozilla Firefox**: Full support
- **Apple Safari**: Full support (iOS & macOS)
- **Microsoft Edge**: Full support
- **Opera / Brave / Chromium**: Full support

---

*Made with ❤ by Sachin*

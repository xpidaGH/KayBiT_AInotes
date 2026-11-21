AInotes User Guide
******************

Welcome to AInotes
==================
AInotes bridges handwritten algorithms, whiteboard diagrams, scanned PDFs, and plain-text technical files (`.txt`, `.md`, `.mdx`) into a unified study workspace engineered for computer science students.

Handwriting Recognition & Document Capture
------------------------------------------
1. **Interactive Stylus & Ink Canvas**: Write algorithms, pseudocode, or math notation directly on the pressure-sensitive canvas on desktop, tablet, or mobile. Click **Recognize Ink** to transcribe strokes into editable notes and syntax-highlighted code.
2. **Photo, Scan & PDF Recognition**: Drag and drop handwritten photos, cursive pages, forms, or scanned PDFs. Select from specialized recognition profiles inspired by MyScript Notes, Pen to Print, Transkribus, InkReadable, Google Document AI, and AWS Textract.
3. **Custom Student Vocabulary Calibration**: Supply course-specific identifiers or handwriting notes (e.g., variable naming conventions, assembly mnemonics) to refine recognition accuracy.
4. **Document Ingestion (`.txt`, `.md`, `.mdx`)**: Upload or paste existing plain-text and Markdown/MDX files directly into your note library.

Lightweight Markup & 20-Language Code Parser
--------------------------------------------
AInotes automatically converts custom underline syntax and 3-space indented code blocks across 20 programming languages (Python, JavaScript, TypeScript, Java, C#, Kotlin, Dart/Flutter, Bash/Shell, Rust, Go, C++, C, PHP, Ruby, PowerShell, SQL, R, Scala, MATLAB, and COBOL/Assembly):

- Underline a document title with `***` (3 or more asterisks).
- Underline a section heading with `===` (3 or more equals signs).
- Underline a subsection heading with `---` (3 or more hyphens).
- Indent code lines by **3 spaces** to create an auto-detected fenced code block:

   def binary_search(arr, target):
       low, high = 0, len(arr) - 1
       while low <= high:
           mid = (low + high) // 2
           if arr[mid] == target:
               return mid
           elif arr[mid] < target:
               low = mid + 1
           else:
               high = mid - 1
       return -1

AI Study Tools & Text-to-Speech (TTS)
-------------------------------------
- **Note Summaries**: Distill lengthy lecture transcripts into key theorems, invariants, and complexity bounds.
- **Interactive Quizzes**: Generate self-grading multiple-choice quizzes directly from your active note.
- **Code Walkthroughs**: Inspect line-by-line explanations and Big-O complexity across all 20 programming languages.
- **Native Voice Playback (`window.speechSynthesis`)**: Listen to notes in any of the 26 supported languages with Play, Pause, Resume, Stop, playback speed controls, and background media-session controls.

Multilingual Support & Structured PDF Export
--------------------------------------------
Switch between **26 international languages** from the workspace language selector or the User Guide dropdown. Right-to-left scripts (`ar`, `ur`, `fa`, `pa-PK`) automatically adjust layout direction (`dir="rtl"`). Export structured `.pdf` documents (optimized for `.txt`, `.md`, `.mdx` notes with Noto font shaping), print vector PDFs, or export `.typ` Typst source.

Global Search & Rebindable Shortcuts
------------------------------------
- Press **Ctrl+K** to search across all notes, headings, and code blocks.
- Press **F1** to open this User Guide anytime.
- Visit **Shortcuts** to click any key badge and rebind it to your preferred key combination.

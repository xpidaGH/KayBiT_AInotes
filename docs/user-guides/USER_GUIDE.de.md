AInotes Benutzerhandbuch
************************

Willkommen bei AInotes
======================
AInotes verbindet handschriftliche Algorithmen, Tafelbilder, gescannte PDFs und Textdateien (`.txt`, `.md`, `.mdx`) in einem intelligenten Lernbereich für Informatikstudierende.

Handschrifterkennung und Dokumentenerfassung
--------------------------------------------
1. **Interaktive Stift-Leinwand**: Schreiben Sie Code oder Notizen direkt mit dem Stylus und wandeln Sie Striche per KI in digitalen Text und Code um.
2. **Foto- und PDF-Scan**: Ziehen Sie Fotos oder gescannte PDFs (Druck- oder Schreibschrift) per Drag-and-Drop in den Scanner.
3. **Datei-Import (`.txt`, `.md`, `.mdx`)**: Laden Sie vorhandene Dateien hoch oder fügen Sie Inhalte direkt ein.

Leichtgewichtiges Markup & 20 Programmiersprachen
-------------------------------------------------
Unterstützt Python, JavaScript, TypeScript, Java, C#, Kotlin, Dart, Bash, Rust, Go, C++, C, PHP, Ruby, PowerShell, SQL, R, Scala, MATLAB und COBOL/Assembly:
- Unterstreichen Sie Titel mit `***`, Abschnitte mit `===` und Unterabschnitte mit `---`.
- Rücken Sie Codezeilen um **3 Leerzeichen** ein:

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

KI-Lernwerkzeuge, Sprachausgabe (TTS) & PDF-Export
--------------------------------------------------
Erstellen Sie Zusammenfassungen, Quizze und Code-Analysen. Nutzen Sie `window.speechSynthesis` (Abspielen, Pause, Stopp) in allen 26 Sprachen und exportieren Sie strukturierte PDFs mit Noto-Schriftarten. **Ctrl+K** öffnet die globale Suche.
Guida utente di AInotes
***********************

Benvenuti in AInotes
====================
AInotes trasforma appunti scritti a mano, foto di lavagne, PDF scansionati e file (`.txt`, `.md`, `.mdx`) in uno spazio di studio digitale per studenti di informatica.

Riconoscimento della scrittura e acquisizione
---------------------------------------------
1. **Area stilo interattiva**: Scrivi algoritmi o note a mano libera e convertili in testo digitale e blocchi di codice.
2. **Scansione di immagini e PDF**: Carica note in corsivo o stampatello con profili ispirati a MyScript, Pen to Print, Transkribus, InkReadable, Document AI e Textract.
3. **Importazione documenti (`.txt`, `.md`, `.mdx`)**: Carica o incolla documenti direttamente nelle note.

Markup leggero e 20 linguaggi di programmazione
-----------------------------------------------
Rilevamento automatico per Python, JavaScript, TypeScript, Java, C#, Kotlin, Dart, Bash, Rust, Go, C++, C, PHP, Ruby, PowerShell, SQL, R, Scala, MATLAB e COBOL/Assembly:
- Sottolinea i titoli con `***`, le sezioni con `===` e le sottosezioni con `---`.
- Rientra il codice di **3 spazi** per attivare la formattazione automatica:

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

Strumenti di studio IA, TTS ed esportazione PDF
-----------------------------------------------
Genera riassunti, quiz interattivi e spiegazioni del codice. Ascolta le note con `window.speechSynthesis` in 26 lingue ed esporta PDF strutturati. Premi **Ctrl+K** per cercare ovunque.
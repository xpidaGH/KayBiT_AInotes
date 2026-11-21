Guide de l'utilisateur AInotes
******************************

Bienvenue sur AInotes
=====================
AInotes transforme vos algorithmes manuscrits, diagrammes sur tableau blanc, PDF numérisés et fichiers (`.txt`, `.md`, `.mdx`) en un espace d'étude structuré pour les étudiants en informatique.

Reconnaissance d'écriture et capture
--------------------------------------
1. **Canevas stylet interactif** : Écrivez des algorithmes ou formules directement sur le canevas sensible à la pression et convertissez vos tracés en texte et code.
2. **Numérisation d'images et PDF** : Importez des photos ou PDF manuscrits (écriture cursive ou imprimée) via les profils MyScript, Pen to Print, Transkribus, InkReadable, Document AI et Textract.
3. **Importation de fichiers (`.txt`, `.md`, `.mdx`)** : Téléversez ou collez vos documents texte directement dans vos notes.

Balisage léger et 20 langages de programmation
----------------------------------------------
AInotes détecte automatiquement Python, JavaScript, TypeScript, Java, C#, Kotlin, Dart, Bash, Rust, Go, C++, C, PHP, Ruby, PowerShell, SQL, R, Scala, MATLAB et COBOL/Assembleur :
- Soulignez un titre avec `***`, une section avec `===` et une sous-section avec `---`.
- Indentez le code de **3 espaces** pour créer un bloc de code détecté automatiquement :

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

Outils d'étude IA, Synthèse vocale (TTS) et PDF
-----------------------------------------------
Générez des résumés, des quiz interactifs et des explications de code. Écoutez vos notes dans les 26 langues via `window.speechSynthesis` (Lecture, Pause, Arrêt) et exportez des PDF structurés avec polices Noto. Appuyez sur **Ctrl+K** pour la recherche globale et **F1** pour ce guide.
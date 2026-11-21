Guia do Usuário do AInotes
**************************

Bem-vindo ao AInotes
====================
O AInotes transforma anotações manuscritas, fotos de quadros, PDFs digitalizados e arquivos (`.txt`, `.md`, `.mdx`) em um ambiente de estudo para estudantes de ciência da computação.

Reconhecimento de Escrita e Captura
-----------------------------------
1. **Canvas com Caneta Stylus**: Escreva algoritmos diretamente na tela sensível à pressão e converta em texto e código.
2. **Scanner de Imagens e PDF**: Envie páginas manuscritas cursivas ou impressas com perfis inspirados em MyScript, Pen to Print, Transkribus, Document AI e Textract.
3. **Importação (`.txt`, `.md`, `.mdx`)**: Envie ou cole arquivos de texto diretamente em suas notas.

Marcação Leve e 20 Linguagens de Programação
--------------------------------------------
Detecta Python, JavaScript, TypeScript, Java, C#, Kotlin, Dart, Bash, Rust, Go, C++, C, PHP, Ruby, PowerShell, SQL, R, Scala, MATLAB e COBOL/Assembly:
- Sublinhe títulos com `***`, seções com `===` e subseções com `---`.
- Recue o código em **3 espaços**:

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

Estudo com IA, TTS e Exportação em PDF
--------------------------------------
Gere resumos, quizzes interativos e explicações de código. Ouça suas notas nos 26 idiomas via `window.speechSynthesis` e exporte PDFs estruturados com fontes Noto. Pressione **Ctrl+K** para busca global.
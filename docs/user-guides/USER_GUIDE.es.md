Guía del usuario de AInotes
***************************

Bienvenido a AInotes
====================
AInotes convierte apuntes manuscritos, pizarras, PDF escaneados y archivos (`.txt`, `.md`, `.mdx`) en un entorno de estudio estructurado para estudiantes de informática.

Reconocimiento de escritura y captura
-------------------------------------
1. **Lienzo táctil y con lápiz**: Escribe algoritmos a mano y conviértelos en texto digital y código con resaltado de sintaxis.
2. **Escáner de imágenes y PDF**: Sube fotos o PDF con letra cursiva o imprenta usando perfiles de MyScript, Pen to Print, Transkribus, Document AI y Textract.
3. **Carga de archivos (`.txt`, `.md`, `.mdx`)**: Importa o pega documentos directamente en tus notas.

Marcado ligero y 20 lenguajes de programación
---------------------------------------------
Clasificación automática para Python, JavaScript, TypeScript, Java, C#, Kotlin, Dart, Bash, Rust, Go, C++, C, PHP, Ruby, PowerShell, SQL, R, Scala, MATLAB y COBOL/Ensamblador:
- Subraya títulos con `***`, secciones con `===` y subsecciones con `---`.
- Sangra el código con **3 espacios**:

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

Estudio con IA, voz (TTS) y exportación PDF
-------------------------------------------
Crea resúmenes, cuestionarios interactivos y análisis de código. Reproduce tus apuntes en 26 idiomas con `window.speechSynthesis` y exporta archivos PDF optimizados con fuentes Noto. Usa **Ctrl+K** para búsqueda global.
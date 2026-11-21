AInotes Kullanım Kılavuzu
*************************

AInotes'a Hoş Geldiniz
=======================
AInotes, el yazısı algoritmaları, tahta fotoğraflarını, taranmış PDF'leri ve (`.txt`, `.md`, `.mdx`) belgelerini bilgisayar bilimleri öğrencileri için yapılandırılmış dijital çalışma notlarına dönüştürür.

El Yazısı Tanıma ve Belge Yakalama
----------------------------------
1. **Etkileşimli Kalem Tuvali**: Basınca duyarlı tuval üzerine doğrudan yazın ve çizimleri kod vurgulu dijital metne çevirin.
2. **Görsel ve PDF Tarayıcı**: MyScript, Pen to Print, Transkribus, Document AI ve Textract profilleriyle el yazısı görsellerini tarayın.
3. **Dosya İçe Aktarma (`.txt`, `.md`, `.mdx`)**: Metin veya Markdown dosyalarını doğrudan notlarınıza yükleyin veya yapıştırın.

Hafif İşaretleme ve 20 Programlama Dili
---------------------------------------
Python, JavaScript, TypeScript, Java, C#, Kotlin, Dart, Bash, Rust, Go, C++, C, PHP, Ruby, PowerShell, SQL, R, Scala, MATLAB ve COBOL/Assembly dillerini otomatik tanır:
- Ana başlıkları `***`, bölümleri `===`, alt bölümleri `---` ile çizin.
- Kod blokları için satırları **3 boşluk** girintileyin:

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

Yapay Zeka Çalışma Araçları, TTS ve PDF
---------------------------------------
Özetler, etkileşimli testler ve kod açıklamaları oluşturun. Notları 26 dilde `window.speechSynthesis` ile dinleyin ve Noto yazı tipli PDF olarak dışa aktarın. Genel arama için **Ctrl+K** tuşlarına basın.
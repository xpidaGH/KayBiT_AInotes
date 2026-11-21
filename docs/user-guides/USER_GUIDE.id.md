Panduan Pengguna AInotes
************************

Selamat Datang di AInotes
=========================
AInotes mengubah catatan tulisan tangan, foto papan tulis, PDF pindaian, dan berkas (`.txt`, `.md`, `.mdx`) menjadi ruang belajar digital terstruktur bagi mahasiswa ilmu komputer.

Pengenalan Tulisan Tangan & Pemindaian
--------------------------------------
1. **Kanvas Stylus Interaktif**: Tulis algoritma langsung di kanvas dan ubah goresan menjadi teks digital serta kode program.
2. **Pemindai Gambar & PDF**: Unggah foto tulisan tangan rapi atau sambung menggunakan profil pengenalan MyScript, Pen to Print, Transkribus, Document AI, dan Textract.
3. **Impor Dokumen (`.txt`, `.md`, `.mdx`)**: Unggah atau tempel berkas teks ke dalam catatan Anda.

Markup Ringan & 20 Bahasa Pemrograman
-------------------------------------
Mendukung Python, JavaScript, TypeScript, Java, C#, Kotlin, Dart, Bash, Rust, Go, C++, C, PHP, Ruby, PowerShell, SQL, R, Scala, MATLAB, dan COBOL/Assembly:
- Garis bawahi judul dengan `***`, bagian dengan `===`, dan subbagian dengan `---`.
- Beri indentasi **3 spasi** untuk blok kode:

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

Alat Belajar AI, TTS & Ekspor PDF
---------------------------------
Buat ringkasan, kuis interaktif, dan penjelasan kode. Dengarkan catatan melalui `window.speechSynthesis` dalam 26 bahasa dan ekspor PDF terstruktur dengan font Noto. Tekan **Ctrl+K** untuk pencarian global.
Hướng dẫn sử dụng AInotes
*************************

Chào mừng đến với AInotes
=========================
AInotes chuyển đổi ghi chú thuật toán viết tay, ảnh bảng trắng, PDF được quét và tệp (`.txt`, `.md`, `.mdx`) thành không gian học tập kỹ thuật số có cấu trúc cho sinh viên khoa học máy tính.

Nhận dạng chữ viết tay & Thu thập tài liệu
------------------------------------------
1. **Bảng vẽ bút Stylus tương tác**: Viết trực tiếp lên bảng vẽ và chuyển nét viết thành văn bản số cùng mã nguồn được tô màu cú pháp.
2. **Máy quét ảnh & PDF**: Kéo thả ảnh chữ viết tay hoặc PDF bằng các cấu hình MyScript, Pen to Print, Transkribus, Document AI và Textract.
3. **Nhập tệp (`.txt`, `.md`, `.mdx`)**: Tải lên hoặc dán trực tiếp tài liệu vào ghi chú của bạn.

Đánh dấu nhẹ & 20 ngôn ngữ lập trình
------------------------------------
Tự động phân loại Python, JavaScript, TypeScript, Java, C#, Kotlin, Dart, Bash, Rust, Go, C++, C, PHP, Ruby, PowerShell, SQL, R, Scala, MATLAB và COBOL/Assembly:
- Gạch chân tiêu đề bằng `***`, mục lớn bằng `===` và mục nhỏ bằng `---`.
- Thụt lề **3 dấu cách** cho khối mã:

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

Công cụ học tập AI, Đọc văn bản (TTS) & Xuất PDF
------------------------------------------------
Tạo tóm tắt, câu hỏi trắc nghiệm tương tác và giải thích mã. Nghe ghi chú bằng 26 ngôn ngữ qua `window.speechSynthesis` và xuất PDF có phông chữ Noto. Nhấn **Ctrl+K** để tìm kiếm toàn cục.
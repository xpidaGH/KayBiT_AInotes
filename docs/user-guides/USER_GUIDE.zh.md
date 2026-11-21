AInotes 用户指南
****************

欢迎使用 AInotes
================
AInotes 将手写算法笔记、白板照片、扫描版 PDF 以及文本文件（`.txt`、`.md`、`.mdx`）转化为面向计算机科学专业学生的结构化数字学习工作区。

手写识别与文档采集
------------------
1. **交互式手写画布**：使用触控笔或鼠标直接书写算法与公式，一键转换为带语法高亮的数字文本与代码。
2. **图片与 PDF 扫描识别**：拖放手写笔记照片或扫描 PDF，支持 MyScript、Pen to Print、Transkribus、Document AI 与 Textract 识别模式。
3. **文档导入（`.txt`、`.md`、`.mdx`）**：直接上传或粘贴现有文本与 Markdown 文档到笔记库。

轻量级标记语法与 20 种编程语言解析
----------------------------------
自动识别并高亮 Python、JavaScript、TypeScript、Java、C#、Kotlin、Dart、Bash、Rust、Go、C++、C、PHP、Ruby、PowerShell、SQL、R、Scala、MATLAB 与 COBOL/汇编语言：
- 使用 `***` 下划线表示文档标题，`===` 表示章节，`---` 表示子章节。
- 使用 **3 个空格** 缩进创建自动识别的代码块：

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

AI 学习工具、语音朗读 (TTS) 与 PDF 导出
---------------------------------------
生成笔记摘要、交互式测验与逐行代码解析。支持使用 `window.speechSynthesis` 进行 26 种语言朗读（播放、暂停、停止），并导出内嵌 Noto 字体的结构化 PDF。按 **Ctrl+K** 进行全局搜索。
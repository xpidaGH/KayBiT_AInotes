AInotes ユーザーガイド
**********************

AInotes へようこそ
==================
AInotes は、手書きアルゴリズム、ホワイトボード写真、スキャン PDF、およびテキストファイル（`.txt`、`.md`、`.mdx`）をコンピュータサイエンス学生向けのデジタル学習ノートへ変換します。

手書き文字認識とドキュメント取り込み
------------------------------------
1. **スタイラス対応キャンバス**：筆圧対応キャンバスに直接書き込み、手書き文字をデジタルテキストとコードに変換します。
2. **画像・PDF スキャナー**：MyScript、Pen to Print、Transkribus、Document AI、Textract スタイルのプロファイルで手書きや筆記体を認識します。
3. **ファイル読み込み（`.txt`、`.md`、`.mdx`）**：既存ドキュメントをアップロードまたは貼り付けてノートに追加できます。

軽量マークアップと 20 種類のプログラミング言語
----------------------------------------------
Python、JavaScript、TypeScript、Java、C#、Kotlin、Dart、Bash、Rust、Go、C++、C、PHP、Ruby、PowerShell、SQL、R、Scala、MATLAB、COBOL/アセンブリを自動判定：
- タイトルは `***`、セクションは `===`、サブセクションは `---` で下線を引きます。
- コードブロックは行頭に **スペース 3 つ** を入れます：

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

AI 学習ツール・音声読み上げ (TTS)・PDF 出力
-------------------------------------------
要約・対話式クイズ・コード解説を自動生成します。`window.speechSynthesis` により 26 言語での読み上げ（再生・一時停止・停止）と、Noto フォント対応の構造化 PDF 出力に対応しています。**Ctrl+K** で全体検索できます。
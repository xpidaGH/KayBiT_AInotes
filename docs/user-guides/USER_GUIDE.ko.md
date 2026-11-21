AInotes 사용자 가이드
********************

AInotes에 오신 것을 환영합니다
==============================
AInotes는 손글씨 알고리즘, 화이트보드 사진, 스캔된 PDF 및 텍스트 파일(`.txt`, `.md`, `.mdx`)을 컴퓨터공학 전공생을 위한 구조화된 디지털 학습 노트로 변환합니다.

필기 인식 및 문서 캡처
----------------------
1. **인터랙티브 스타일러스 캔버스**: 압력 감지 캔버스에 직접 필기하고 디지털 텍스트와 코드로 변환하세요.
2. **이미지 및 PDF 스캐너**: MyScript, Pen to Print, Transkribus, Document AI, Textract 기반 프로파일로 정자체와 필기체를 모두 인식합니다.
3. **문서 업로드(`.txt`, `.md`, `.mdx`)**: 기존 문서를 업로드하거나 붙여넣어 노트에 바로 포함하세요.

경량 마크업 및 20개 프로그래밍 언어 파서
----------------------------------------
Python, JavaScript, TypeScript, Java, C#, Kotlin, Dart, Bash, Rust, Go, C++, C, PHP, Ruby, PowerShell, SQL, R, Scala, MATLAB, COBOL/어셈블리를 자동 분류합니다:
- 문서 제목은 `***`, 섹션은 `===`, 하위 섹션은 `---`로 밑줄을 긋습니다.
- **공백 3칸** 들여쓰기로 코드 블록을 생성합니다:

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

AI 학습 도구, 음성 합성(TTS) 및 PDF 내보내기
--------------------------------------------
요약, 퀴즈 및 코드 해설을 생성하세요. `window.speechSynthesis`로 26개 언어를 재생·일시정지·정지할 수 있으며 Noto 글꼴 기반 구조화 PDF로 내보낼 수 있습니다. **Ctrl+K**로 전체 검색을 실행하세요.
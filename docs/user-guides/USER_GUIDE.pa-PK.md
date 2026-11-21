AInotes ورتوں گائیڈ
********************

AInotes وچ جی آیاں نوں
======================
AInotes ہتھ نال لکھے الگورتھم، وائٹ بورڈ تصویراں، سکین کیتیاں PDF فائلاں تے ٹیکسٹ فائلاں (`.txt`, `.md`, `.mdx`) نوں کمپیوٹر سائنس دے طالب علماں لئی ڈیجیٹل نوٹس وچ بدلدا اے۔

ہتھ لکھت دی پچھان تے سکیننگ
----------------------------
1. **سٹائلس کینوس**: کینوس اُتے سدھا لکھو تے اوہنوں ڈیجیٹل ٹیکسٹ تے کوڈ وچ بدلو۔
2. **تصویر تے PDF سکینر**: MyScript، Pen to Print، Transkribus، Document AI تے Textract پروفائلاں نال ہتھ لکھت سکین کرو۔
3. **فائل اپلوڈ (`.txt`, `.md`, `.mdx`)**: فائلاں سدھیاں اپنے نوٹس وچ شامل کرو۔

ہلکا مارک اپ تے 20 پروگرامنگ زباناں
-----------------------------------
Python، JavaScript، TypeScript، Java، C#، Kotlin، Dart، Bash، Rust، Go، C++، C، PHP، Ruby، PowerShell، SQL، R، Scala، MATLAB تے COBOL/Assembly دی خودکار پچھان:
- عنوان تھلے `***`، حصے تھلے `===` تے ذیلی حصے تھلے `---` لاؤ۔
- کوڈ لئی سطر توں پہلاں **3 سپیس** دیو:

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

AI سٹڈی ٹولز، آواز (TTS) تے PDF ایکسپورٹ
----------------------------------------
خلاصے، کوئز تے کوڈ دی تشریح بناؤ۔ `window.speechSynthesis` راہیں 26 زباناں وچ سنو تے Noto فونٹ نال PDF بناؤ۔ لبھن لئی **Ctrl+K** دباؤ۔
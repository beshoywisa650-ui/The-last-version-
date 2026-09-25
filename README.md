# Sheet Analyzer Pro (محلل شيتات المبيعات الذكي)

> **أداة تحليلية تنفيذية فائقة السرعة لتحليل وقراءة شيتات الإكسيل والمبيعات محلياً 100% بدون إنترنت مع استخراج تلقائي للـ APK عبر GitHub.**

---

## 👨‍💻 المطور واستشاري النظام (Developer & Consultant)
* **الاسم:** د. بيشوي ويصا كامل (Dr. Beshoy Wisa Kamel)
* **الصفة:** استشاري ومطور الحلول التحليلية البيعية (Sales Analytics Consultant & System Developer)
* **الهاتف / واتساب:** `01203730493` (+201203730493)

---

## 🌟 أبرز المميزات (Key Features)

- 🔒 **خصوصية وسرية تامة (100% Local & Offline):** قراءة ومعالجة وتحليل كافة ملفات الإكسيل (`.xlsx`, `.xls`, `.csv`) بالكامل داخل متصفح جهاز المستخدم دون إرسال أي بايت واحد إلى أي خادم سحابي.
- ⚡ **تحليل باريتو الذكي (80/20 Pareto Principle):** استخراج الفئات والمنتجات والعملاء والمناطق المحركة لـ 80% من الإيرادات بنقرة واحدة.
- 🎯 **التفكيك والتحليل المتعدد الأبعاد (Multi-Dimensional Drilldown):** إمكانية الغوص من المشرف إلى المندوب إلى الصيدلية/العميل وصولاً إلى المستحضر.
- 💾 **ذاكرة الجلسات السريعة (Instant Session History):** حفظ تلقائي لآخر الشيتات المفتوحة مع استرجاع لحظي بدون إعادة الرفع.
- 📱 **جاهز للموبايل وتطبيق أندرويد أصيل (Android APK Native):** مدمج بأحدث تقنيات Capacitor ومُجهز للبناء الآلي كملف APK عبر GitHub Actions.

---

## 🚀 كيفية رفع المشروع على GitHub واستخراج ملف الـ APK تلقائياً

المشروع مُجهز بالكامل بملف أتمتة سحابي (`.github/workflows/build-apk.yml`) يقوم ببناء ملف الـ APK تلقائياً بمجرد رفع الكود!

### 1. خطوات رفع الكود إلى مستودعك على GitHub:
افتح موجه الأوامر (Terminal) في مجلد المشروع وقم بتنفيذ الأوامر التالية:

```bash
# 1. تهيئة مستودع Git
git init

# 2. إضافة كافة الملفات
git add .

# 3. حفظ الالتزام الأول
git commit -m "feat: Initial release of Sheet Analyzer Pro with Android APK CI/CD"

# 4. تغيير اسم الفرع إلى main
git branch -M main

# 5. ربط المستودع بمستودعك على GitHub (استبدل الرابط برابط مستودعك)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# 6. رفع الكود
git push -u origin main
```

### 2. كيفية تنزيل ملف الـ APK بعد الرفع:
1. ادخل إلى صفحة مستودعك على **GitHub**.
2. اضغط على تبويب **Actions** في الشريط العلوي.
3. ستجد سير عمل بعنوان **`Build & Package Android APK`** يعمل تلقائياً بعلامة برتقالية (يستغرق حوالي دقيقتين إلى 3 دقائق).
4. عند اكتماله وظهور علامة الصح الخضراء ✅، اضغط عليه.
5. في أسفل الصفحة تحت قسم **Artifacts**، ستجد ملفاً جاهزاً للتحميل باسم:
   👉 **`SheetAnalyzer-v1.0-APK`**
6. قم بتنزيله وفك الضغط لتجد ملف `SheetAnalyzer-v1.0.apk` جاهزاً للتثبيت المباشر على أي هاتف أندرويد!

---

## 💻 التشغيل والتطوير المحلي (Local Development)

```bash
# تثبيت الحزم والمكتبات
npm install

# تشغيل بيئة التطوير المحلية
npm run dev

# فحص صحة الأكواد والأنماط (Type-check & Lint)
npm run lint

# بناء نسخة الإنتاج للويب والأندرويد
npm run build:android
```

---

## 🛠️ التقنيات المستخدمة (Tech Stack)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Data Engine:** SheetJS (XLSX), Custom High-Performance Analytical Aggregator
- **Native Runtime:** Capacitor 8 (Android Core)
- **CI/CD:** GitHub Actions Automated APK Builder
- **Typography:** IBM Plex Sans Arabic + Inter + JetBrains Mono

---

© 2026 **Sheet Analyzer Pro**. جميع الحقوق محفوظة لـ **د. بيشوي ويصا كامل**.

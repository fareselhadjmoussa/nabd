# إصلاح خطأ إنشاء الحساب: language override unsupported: ar

سبب الخطأ أن MongoDB كان لديه text index قديم يستخدم الحقل `language` كـ language override.
الموقع يحفظ اللغة كـ `ar`، وMongoDB لا يدعم `ar` كلغة داخل text index، لذلك كان يفشل إنشاء الحساب.

## التشغيل

1. انسخ ملف `backend/.env` القديم إلى هذه النسخة.
2. من مجلد `backend` شغّل:

```powershell
npm install
npm run fix:indexes
npm run dev
```

بعد نجاح التشغيل جرّب إنشاء حساب جديد باسم وبريد جديدين.

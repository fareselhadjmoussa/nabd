# إضافات الإدارة والحماية

تمت إضافة الميزات التالية مجاناً داخل المشروع:

1. لوحة Admin على الرابط `/admin`
2. حذف/حظر المستخدمين من لوحة الإدارة
3. نظام بلاغات من داخل المحادثة
4. تحسين حالة الرسائل: جارٍ الإرسال، تم الإرسال، مقروءة، فشل
5. حذف الحساب من الملف الشخصي
6. صفحة رئيسية احترافية قبل تسجيل الدخول
7. الوضع الفاتح/الداكن

## جعل حسابك مديراً

### الطريقة الأولى: من ملف البيئة

في Render أو backend/.env أضف:

```env
ADMIN_EMAILS=your-email@example.com
```

أي حساب جديد يتم إنشاؤه بهذا البريد سيكون مديراً تلقائياً.

### الطريقة الثانية: لحساب موجود مسبقاً

محلياً من مجلد backend:

```bash
npm run make:admin -- your-email@example.com
```

أو على Render Shell إذا كان متاحاً.

## روابط API الجديدة

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/reports`
- `PATCH /api/admin/reports/:id`
- `POST /api/blocks/:userId`
- `DELETE /api/blocks/:userId`
- `POST /api/reports`
- `DELETE /api/auth/account`

## بعد رفع التعديلات

```bash
git add .
git commit -m "Add admin moderation reports themes"
git push
```

ثم:

- Vercel سيعيد نشر الواجهة تلقائياً.
- Render: Manual Deploy → Deploy latest commit.


import bootstrap, { app } from "./app.controller.js";

// تشغيل إعدادات السيرفر بتاعتك
bootstrap();

// تصدير التطبيق عشان Vercel يقدر يشغله
export default app;
/**
 * ملف login.js - المسؤول عن إدارة واجهة تسجيل الدخول
 */

// التأكد من عدم دخول مستخدم مسجل إلى صفحة تسجيل الدخول
document.addEventListener('DOMContentLoaded', function() {
    // التحقق ما إذا كانت الصفحة الحالية هي صفحة تسجيل الدخول
    if (isLoginPage()) {
        // التحقق من حالة تسجيل الدخول الحالية
        checkLoginStatus();
        
        // تحميل إعدادات المتجر
        loadStoreSettings();
        
        // إضافة مستمعي الأحداث
        attachEventListeners();
    }
});

/**
 * التحقق من أن الصفحة الحالية هي صفحة تسجيل الدخول
 * @returns {boolean} - هل الصفحة الحالية هي صفحة تسجيل الدخول
 */
function isLoginPage() {
    return window.location.pathname.includes('login.html') || 
           window.location.pathname.endsWith('/login') ||
           window.location.pathname === '/';
}

/**
 * التحقق من حالة تسجيل الدخول الحالية
 */
function checkLoginStatus() {
    try {
        // التحقق من وجود بيانات تسجيل دخول محفوظة
        const authData = localStorage.getItem('cashier-auth');
        
        if (authData) {
            const auth = JSON.parse(authData);
            const expiryTime = new Date(auth.expiresAt);
            
            // التحقق من صلاحية الجلسة
            if (expiryTime > new Date()) {
                // توجيه المستخدم إلى الصفحة الرئيسية
                window.location.href = 'index.html';
                return;
            }
        }
        
        // في حالة عدم وجود جلسة أو انتهاء صلاحيتها، عرض نموذج تسجيل الدخول
        showLoginForm();
    } catch (error) {
        console.error('خطأ في التحقق من حالة تسجيل الدخول:', error);
        showLoginForm();
    }
}

/**
 * تحميل إعدادات المتجر
 */
function loadStoreSettings() {
    try {
        const settings = localStorage.getItem('cashier-settings');
        
        if (settings) {
            const parsedSettings = JSON.parse(settings);
            
            // تحديث اسم المتجر في صفحة تسجيل الدخول
            const storeNameElement = document.getElementById('store-name-login');
            if (storeNameElement && parsedSettings.storeName) {
                storeNameElement.textContent = parsedSettings.storeName;
            }
        }
    } catch (error) {
        console.error('خطأ في تحميل إعدادات المتجر:', error);
    }
}

/**
 * إظهار نموذج تسجيل الدخول
 */
function showLoginForm() {
    // عرض عناصر نموذج تسجيل الدخول
    const loginContainer = document.querySelector('.login-container');
    if (loginContainer) {
        loginContainer.style.display = 'block';
        
        // تركيز حقل اسم المستخدم
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.focus();
        }
    }
}

/**
 * إضافة مستمعي الأحداث لعناصر الصفحة
 */
function attachEventListeners() {
    // نموذج تسجيل الدخول
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // زر إظهار/إخفاء كلمة المرور
    const togglePasswordBtn = document.getElementById('toggle-password');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    }
    
    // مستمعي أحداث التحكم بالنافذة (في حالة تطبيق سطح المكتب)
    attachWindowControlEvents();
}

/**
 * معالجة تسجيل الدخول
 * @param {Event} event - حدث النموذج
 */
function handleLogin(event) {
    // منع السلوك الافتراضي للنموذج
    event.preventDefault();
    
    // الحصول على قيم الحقول
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // التحقق من اكتمال البيانات
    if (!username || !password) {
        showLoginMessage('الرجاء إدخال اسم المستخدم وكلمة المرور', 'error');
        return;
    }
    
    // محاولة تسجيل الدخول باستخدام مدير الأمان
    if (window.SecurityManager) {
        window.SecurityManager.login(username, password, rememberMe);
    } else {
        // تنفيذ تسجيل الدخول باستخدام وظيفة محلية
        performLogin(username, password, rememberMe);
    }
}

/**
 * تنفيذ عملية تسجيل الدخول (احتياطي إذا لم يتوفر مدير الأمان)
 * @param {string} username - اسم المستخدم
 * @param {string} password - كلمة المرور
 * @param {boolean} rememberMe - تذكر تسجيل الدخول
 */
function performLogin(username, password, rememberMe) {
    try {
        // الحصول على قائمة المستخدمين
        const usersData = localStorage.getItem('cashier-users');
        const users = usersData ? JSON.parse(usersData) : [];
        
        // البحث عن المستخدم
        const user = users.find(user => user.username === username);
        
        if (!user) {
            showLoginMessage('اسم المستخدم غير صحيح', 'error');
            addShakeEffect();
            return;
        }
        
        // التحقق من حالة المستخدم
        if (!user.isActive) {
            showLoginMessage('تم تعطيل هذا الحساب. الرجاء التواصل مع المدير', 'error');
            addShakeEffect();
            return;
        }
        
        // التحقق من كلمة المرور (باستخدام دالة تشفير بسيطة)
        const hashedPassword = hashPasswordSimple(password);
        
        if (user.password !== hashedPassword) {
            showLoginMessage('كلمة المرور غير صحيحة', 'error');
            addShakeEffect();
            return;
        }
        
        // تحديد فترة صلاحية الجلسة
        const expiresAt = new Date();
        if (rememberMe) {
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 أيام
        } else {
            expiresAt.setHours(expiresAt.getHours() + 8); // 8 ساعات
        }
        
        // إنشاء بيانات المصادقة
        const authData = {
            userId: user.id,
            username: user.username,
            role: user.role,
            expiresAt: expiresAt.toISOString()
        };
        
        // حفظ بيانات المصادقة
        localStorage.setItem('cashier-auth', JSON.stringify(authData));
        
        // تسجيل آخر تسجيل دخول
        user.lastLoginAt = new Date().toISOString();
        localStorage.setItem('cashier-users', JSON.stringify(users));
        
        // توجيه المستخدم إلى الصفحة الرئيسية
        window.location.href = 'index.html';
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        showLoginMessage('حدث خطأ أثناء تسجيل الدخول. الرجاء المحاولة مرة أخرى', 'error');
    }
}

/**
 * تشفير كلمة المرور (تشفير بسيط، للعرض فقط)
 * @param {string} password - كلمة المرور
 * @returns {string} - كلمة المرور المشفرة
 */
function hashPasswordSimple(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

/**
 * عرض رسالة في نموذج تسجيل الدخول
 * @param {string} message - نص الرسالة
 * @param {string} type - نوع الرسالة (error, success)
 */
function showLoginMessage(message, type = 'info') {
    const messageElement = document.getElementById('login-message');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = 'login-message';
        messageElement.classList.add(type);
    }
}

/**
 * إضافة تأثير الاهتزاز لمربع تسجيل الدخول
 */
function addShakeEffect() {
    const loginBox = document.querySelector('.login-box');
    if (loginBox) {
        loginBox.classList.add('shake');
        
        // إزالة الفئة بعد انتهاء التأثير لإمكانية تكراره
        setTimeout(() => {
            loginBox.classList.remove('shake');
        }, 600);
    }
}

/**
 * تبديل إظهار/إخفاء كلمة المرور
 */
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('toggle-password');
    
    if (passwordInput && toggleBtn) {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // تغيير أيقونة الزر
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            if (type === 'password') {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        }
    }
}

/**
 * إضافة مستمعي أحداث التحكم بالنافذة (لتطبيق سطح المكتب)
 */
function attachWindowControlEvents() {
    // زر تصغير النافذة
    const minimizeBtn = document.getElementById('minimize-btn');
    if (minimizeBtn && window.electronAPI) {
        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
    }
    
    // زر إغلاق النافذة
    const closeBtn = document.getElementById('close-btn');
    if (closeBtn && window.electronAPI) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
    }
}
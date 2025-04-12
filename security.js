/**
 * ملف security.js - المسؤول عن إدارة أمان التطبيق وعمليات المصادقة
 */

// ثوابت لتخزين مفاتيح التخزين المحلي
const AUTH_KEY = 'cashier-auth';
const USERS_KEY = 'cashier-users';
const SALT_KEY = 'cashier-salt';

// كائن لإدارة الأمان والمصادقة
const SecurityManager = {
    // المستخدم الحالي
    currentUser: null,
    
    // حالة المصادقة
    isAuthenticated: false,
    
    /**
     * تهيئة نظام الأمان
     */
    init: function() {
        console.log("تهيئة نظام الأمان...");
        
        // التحقق من وجود المستخدم الافتراضي وإنشائه إذا لم يكن موجوداً
        this.checkDefaultUser();
        
        // التحقق من حالة المصادقة الحالية
        this.checkAuthStatus();
        
        // إضافة مستمعي الأحداث لنموذج تسجيل الدخول
        this.attachLoginEvents();
        
        // إضافة مستمعي الأحداث للخروج
        this.attachLogoutEvents();
        
        console.log("تم تهيئة نظام الأمان");
    },
    
    /**
     * التحقق من وجود المستخدم الافتراضي وإنشائه إذا لم يكن موجوداً
     */
    checkDefaultUser: function() {
        const users = this.getUsers();
        
        // إنشاء المستخدم الافتراضي إذا لم يوجد مستخدمين
        if (users.length === 0) {
            console.log("إنشاء مستخدم افتراضي...");
            
            const defaultUser = {
                id: this.generateUUID(),
                username: 'admin',
                displayName: 'المدير',
                role: 'admin',
                isActive: true,
                createdAt: new Date().toISOString()
            };
            
            // تعيين كلمة المرور الافتراضية "admin123"
            const hashedPassword = this.hashPassword('admin123');
            defaultUser.password = hashedPassword;
            
            // إضافة المستخدم للقائمة
            users.push(defaultUser);
            this.saveUsers(users);
            
            console.log("تم إنشاء المستخدم الافتراضي");
        }
    },
    
    /**
     * التحقق من حالة المصادقة الحالية
     */
    checkAuthStatus: function() {
        try {
            const authData = localStorage.getItem(AUTH_KEY);
            
            if (authData) {
                const auth = JSON.parse(authData);
                const expiryTime = new Date(auth.expiresAt);
                
                // التحقق من صلاحية الجلسة
                if (expiryTime > new Date()) {
                    // التحقق من وجود المستخدم
                    const user = this.getUserByUsername(auth.username);
                    
                    if (user && user.isActive) {
                        this.currentUser = user;
                        this.isAuthenticated = true;
                        
                        console.log("تم استعادة جلسة المستخدم:", user.username);
                        
                        // توجيه المستخدم إلى الصفحة الرئيسية إذا كان في صفحة تسجيل الدخول
                        if (window.location.pathname.includes('login.html')) {
                            window.location.href = 'index.html';
                        }
                        
                        return true;
                    }
                }
            }
            
            // إذا وصلنا إلى هنا، فالمستخدم غير مصادق
            this.clearAuthData();
            
            // توجيه المستخدم إلى صفحة تسجيل الدخول إذا لم يكن فيها
            if (!window.location.pathname.includes('login.html') && !this.isAuthenticated) {
                window.location.href = 'login.html';
            }
            
            return false;
        } catch (error) {
            console.error("خطأ في التحقق من حالة المصادقة:", error);
            this.clearAuthData();
            return false;
        }
    },
    
    /**
     * إضافة مستمعي الأحداث لنموذج تسجيل الدخول
     */
    attachLoginEvents: function() {
        const loginForm = document.getElementById('login-form');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const rememberMe = document.getElementById('remember-me').checked;
                
                this.login(username, password, rememberMe);
            });
            
            // إظهار/إخفاء كلمة المرور
            const togglePasswordBtn = document.getElementById('toggle-password');
            const passwordInput = document.getElementById('password');
            
            if (togglePasswordBtn && passwordInput) {
                togglePasswordBtn.addEventListener('click', () => {
                    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    passwordInput.setAttribute('type', type);
                    
                    // تبديل أيقونة العين
                    const icon = togglePasswordBtn.querySelector('i');
                    if (type === 'password') {
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                    } else {
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    }
                });
            }
            
            // ملء اسم المتجر في صفحة تسجيل الدخول
            const storeNameElem = document.getElementById('store-name-login');
            if (storeNameElem) {
                const settings = JSON.parse(localStorage.getItem('cashier-settings') || '{}');
                if (settings.storeName) {
                    storeNameElem.textContent = settings.storeName;
                }
            }
        }
    },
    
    /**
     * إضافة مستمعي الأحداث للخروج
     */
    attachLogoutEvents: function() {
        const logoutBtn = document.getElementById('logout-btn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    },
    
    /**
     * تسجيل الدخول
     * @param {string} username - اسم المستخدم
     * @param {string} password - كلمة المرور
     * @param {boolean} rememberMe - تذكر المستخدم
     * @returns {boolean} - نجاح عملية تسجيل الدخول
     */
    login: function(username, password, rememberMe) {
        try {
            console.log("محاولة تسجيل الدخول:", username);
            
            // البحث عن المستخدم
            const user = this.getUserByUsername(username);
            
            if (!user) {
                this.showLoginError("اسم المستخدم غير صحيح");
                return false;
            }
            
            // التحقق من حالة المستخدم
            if (!user.isActive) {
                this.showLoginError("تم تعطيل هذا الحساب. الرجاء التواصل مع المدير");
                return false;
            }
            
            // التحقق من كلمة المرور
            const hashedPassword = this.hashPassword(password);
            
            if (user.password !== hashedPassword) {
                this.showLoginError("كلمة المرور غير صحيحة");
                return false;
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
            localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
            
            // تحديث حالة المصادقة
            this.currentUser = user;
            this.isAuthenticated = true;
            
            console.log("تم تسجيل الدخول بنجاح:", user.username);
            
            // تسجيل آخر دخول
            this.updateLastLogin(user.id);
            
            // توجيه المستخدم إلى الصفحة الرئيسية
            window.location.href = 'index.html';
            
            return true;
        } catch (error) {
            console.error("خطأ في تسجيل الدخول:", error);
            this.showLoginError("حدث خطأ أثناء تسجيل الدخول. الرجاء المحاولة مرة أخرى");
            return false;
        }
    },
    
    /**
     * تسجيل الخروج
     */
    logout: function() {
        // مسح بيانات المصادقة
        this.clearAuthData();
        
        // توجيه المستخدم إلى صفحة تسجيل الدخول
        window.location.href = 'login.html';
    },
    
    /**
     * تحديث وقت آخر تسجيل دخول للمستخدم
     * @param {string} userId - معرف المستخدم
     */
    updateLastLogin: function(userId) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex !== -1) {
            users[userIndex].lastLoginAt = new Date().toISOString();
            this.saveUsers(users);
        }
    },
    
    /**
     * مسح بيانات المصادقة
     */
    clearAuthData: function() {
        localStorage.removeItem(AUTH_KEY);
        this.currentUser = null;
        this.isAuthenticated = false;
    },
    
    /**
     * عرض رسالة خطأ في نموذج تسجيل الدخول
     * @param {string} message - رسالة الخطأ
     */
    showLoginError: function(message) {
        const loginMessage = document.getElementById('login-message');
        const loginBox = document.querySelector('.login-box');
        
        if (loginMessage) {
            loginMessage.textContent = message;
            loginMessage.classList.add('error');
            
            // إضافة تأثير الاهتزاز
            if (loginBox) {
                loginBox.classList.add('shake');
                
                // إزالة تأثير الاهتزاز بعد انتهاء الرسوم المتحركة
                setTimeout(() => {
                    loginBox.classList.remove('shake');
                }, 600);
            }
        }
        
        // تركيز اسم المستخدم أو كلمة المرور حسب الرسالة
        if (message.includes('اسم المستخدم')) {
            document.getElementById('username').focus();
        } else if (message.includes('كلمة المرور')) {
            document.getElementById('password').focus();
        }
    },
    
    /**
     * الحصول على قائمة المستخدمين
     * @returns {Array} - قائمة المستخدمين
     */
    getUsers: function() {
        try {
            const usersData = localStorage.getItem(USERS_KEY);
            return usersData ? JSON.parse(usersData) : [];
        } catch (error) {
            console.error("خطأ في استرجاع بيانات المستخدمين:", error);
            return [];
        }
    },
    
    /**
     * حفظ قائمة المستخدمين
     * @param {Array} users - قائمة المستخدمين
     */
    saveUsers: function(users) {
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            return true;
        } catch (error) {
            console.error("خطأ في حفظ بيانات المستخدمين:", error);
            return false;
        }
    },
    
    /**
     * البحث عن مستخدم باسم المستخدم
     * @param {string} username - اسم المستخدم
     * @returns {object|null} - بيانات المستخدم أو null
     */
    getUserByUsername: function(username) {
        const users = this.getUsers();
        return users.find(user => user.username === username) || null;
    },
    
    /**
     * البحث عن مستخدم بالمعرف
     * @param {string} userId - معرف المستخدم
     * @returns {object|null} - بيانات المستخدم أو null
     */
    getUserById: function(userId) {
        const users = this.getUsers();
        return users.find(user => user.id === userId) || null;
    },
    
    /**
     * تشفير كلمة المرور (تشفير بسيط للعرض، في الإنتاج يجب استخدام تشفير أقوى)
     * @param {string} password - كلمة المرور
     * @returns {string} - كلمة المرور المشفرة
     */
    hashPassword: function(password) {
        // استخدام تشفير بسيط للعرض
        // في بيئة الإنتاج، استخدم خوارزميات تشفير أقوى
        let hash = 0;
        if (password.length === 0) return hash.toString();
        
        // الحصول على ملح التشفير أو إنشائه
        const salt = this.getSalt();
        const saltedPassword = password + salt;
        
        for (let i = 0; i < saltedPassword.length; i++) {
            const char = saltedPassword.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString(16);
    },
    
    /**
     * الحصول على ملح التشفير أو إنشائه
     * @returns {string} - ملح التشفير
     */
    getSalt: function() {
        let salt = localStorage.getItem(SALT_KEY);
        
        if (!salt) {
            salt = this.generateUUID();
            localStorage.setItem(SALT_KEY, salt);
        }
        
        return salt;
    },
    
    /**
     * إنشاء معرف فريد
     * @returns {string} - معرف فريد
     */
    generateUUID: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    /**
     * إضافة مستخدم جديد
     * @param {object} userData - بيانات المستخدم
     * @returns {boolean} - نجاح العملية
     */
    addUser: function(userData) {
        if (!this.isAuthenticated || this.currentUser.role !== 'admin') {
            console.error("ليس لديك صلاحية لإضافة مستخدمين");
            return false;
        }
        
        const users = this.getUsers();
        
        // التحقق من عدم وجود اسم مستخدم مكرر
        if (users.some(user => user.username === userData.username)) {
            console.error("اسم المستخدم موجود بالفعل");
            return false;
        }
        
        // إنشاء كائن المستخدم
        const newUser = {
            id: this.generateUUID(),
            username: userData.username,
            displayName: userData.displayName || userData.username,
            password: this.hashPassword(userData.password),
            role: userData.role || 'user',
            isActive: userData.isActive !== undefined ? userData.isActive : true,
            createdAt: new Date().toISOString(),
            createdBy: this.currentUser.id
        };
        
        // إضافة المستخدم للقائمة
        users.push(newUser);
        
        // حفظ التغييرات
        return this.saveUsers(users);
    },
    
    /**
     * تحديث بيانات مستخدم
     * @param {string} userId - معرف المستخدم
     * @param {object} userData - بيانات المستخدم المحدثة
     * @returns {boolean} - نجاح العملية
     */
    updateUser: function(userId, userData) {
        if (!this.isAuthenticated) {
            console.error("ليس لديك صلاحية لتعديل المستخدمين");
            return false;
        }
        
        // لا يمكن للمستخدم العادي تعديل بيانات مستخدم آخر
        if (this.currentUser.role !== 'admin' && this.currentUser.id !== userId) {
            console.error("ليس لديك صلاحية لتعديل هذا المستخدم");
            return false;
        }
        
        const users = this.getUsers();
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) {
            console.error("المستخدم غير موجود");
            return false;
        }
        
        // تحديث البيانات
        const updatedUser = { ...users[userIndex] };
        
        // تحديث اسم المستخدم (للمسؤول فقط)
        if (userData.username && this.currentUser.role === 'admin') {
            // التحقق من عدم وجود اسم مستخدم مكرر
            if (users.some(user => user.username === userData.username && user.id !== userId)) {
                console.error("اسم المستخدم موجود بالفعل");
                return false;
            }
            
            updatedUser.username = userData.username;
        }
        
        // تحديث الاسم المعروض
        if (userData.displayName) {
            updatedUser.displayName = userData.displayName;
        }
        
        // تحديث كلمة المرور إذا تم توفيرها
        if (userData.password) {
            // للتحقق من الأمان، يجب أن يقدم المستخدم كلمة المرور الحالية قبل التغيير
            if (userData.currentPassword) {
                const currentHash = this.hashPassword(userData.currentPassword);
                
                if (currentHash !== updatedUser.password) {
                    console.error("كلمة المرور الحالية غير صحيحة");
                    return false;
                }
                
                updatedUser.password = this.hashPassword(userData.password);
            } else if (this.currentUser.role === 'admin') {
                // المسؤول يمكنه تغيير كلمة المرور بدون التحقق من كلمة المرور الحالية
                updatedUser.password = this.hashPassword(userData.password);
            } else {
                console.error("يجب توفير كلمة المرور الحالية");
                return false;
            }
        }
        
        // تحديث الدور (للمسؤول فقط)
        if (userData.role && this.currentUser.role === 'admin') {
            updatedUser.role = userData.role;
        }
        
        // تحديث حالة النشاط (للمسؤول فقط)
        if (userData.isActive !== undefined && this.currentUser.role === 'admin') {
            updatedUser.isActive = userData.isActive;
        }
        
        // تحديث طابع التعديل
        updatedUser.updatedAt = new Date().toISOString();
        updatedUser.updatedBy = this.currentUser.id;
        
        // حفظ التغييرات
        users[userIndex] = updatedUser;
        
        // تحديث البيانات في حالة تعديل المستخدم الحالي
        if (this.currentUser.id === userId) {
            this.currentUser = updatedUser;
        }
        
        return this.saveUsers(users);
    },
    
    /**
     * تعطيل حساب مستخدم
     * @param {string} userId - معرف المستخدم
     * @returns {boolean} - نجاح العملية
     */
    disableUser: function(userId) {
        if (!this.isAuthenticated || this.currentUser.role !== 'admin') {
            console.error("ليس لديك صلاحية لتعطيل المستخدمين");
            return false;
        }
        
        // لا يمكن تعطيل المستخدم الحالي
        if (this.currentUser.id === userId) {
            console.error("لا يمكن تعطيل الحساب الذي تستخدمه حالياً");
            return false;
        }
        
        return this.updateUser(userId, { isActive: false });
    },
    
    /**
     * تفعيل حساب مستخدم
     * @param {string} userId - معرف المستخدم
     * @returns {boolean} - نجاح العملية
     */
    enableUser: function(userId) {
        if (!this.isAuthenticated || this.currentUser.role !== 'admin') {
            console.error("ليس لديك صلاحية لتفعيل المستخدمين");
            return false;
        }
        
        return this.updateUser(userId, { isActive: true });
    },
    
    /**
     * حذف مستخدم
     * @param {string} userId - معرف المستخدم
     * @returns {boolean} - نجاح العملية
     */
    deleteUser: function(userId) {
        if (!this.isAuthenticated || this.currentUser.role !== 'admin') {
            console.error("ليس لديك صلاحية لحذف المستخدمين");
            return false;
        }
        
        // لا يمكن حذف المستخدم الحالي
        if (this.currentUser.id === userId) {
            console.error("لا يمكن حذف الحساب الذي تستخدمه حالياً");
            return false;
        }
        
        const users = this.getUsers();
        const filteredUsers = users.filter(user => user.id !== userId);
        
        // التحقق من وجود تغيير فعلي
        if (filteredUsers.length === users.length) {
            console.error("المستخدم غير موجود");
            return false;
        }
        
        return this.saveUsers(filteredUsers);
    },
    
    /**
     * تغيير كلمة المرور
     * @param {string} currentPassword - كلمة المرور الحالية
     * @param {string} newPassword - كلمة المرور الجديدة
     * @returns {boolean} - نجاح العملية
     */
    changePassword: function(currentPassword, newPassword) {
        if (!this.isAuthenticated) {
            console.error("يجب تسجيل الدخول لتغيير كلمة المرور");
            return false;
        }
        
        return this.updateUser(this.currentUser.id, {
            currentPassword: currentPassword,
            password: newPassword
        });
    },
    
    /**
     * التحقق من وجود مستخدم بصلاحيات محددة
     * @param {string} role - الصلاحية المطلوبة
     * @returns {boolean} - نتيجة التحقق
     */
    hasRole: function(role) {
        if (!this.isAuthenticated || !this.currentUser) {
            return false;
        }
        
        return this.currentUser.role === role;
    },
    
    /**
     * التحقق من حالة المصادقة
     * @returns {boolean} - حالة المصادقة
     */
    isLoggedIn: function() {
        return this.isAuthenticated && this.currentUser !== null;
    },
    
    /**
     * إعادة تعيين كلمة المرور (للمسؤول فقط)
     * @param {string} userId - معرف المستخدم
     * @param {string} newPassword - كلمة المرور الجديدة
     * @returns {boolean} - نجاح العملية
     */
    resetPassword: function(userId, newPassword) {
        if (!this.isAuthenticated || this.currentUser.role !== 'admin') {
            console.error("ليس لديك صلاحية لإعادة تعيين كلمة المرور");
            return false;
        }
        
        return this.updateUser(userId, { password: newPassword });
    }
};

// تهيئة مدير الأمان عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    SecurityManager.init();
});

// تصدير المدير للاستخدام في ملفات أخرى
window.SecurityManager = SecurityManager;
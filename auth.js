/**
 * نظام المصادقة وإدارة المستخدمين في تطبيق الكاشير
 */

// ثوابت النظام
const AUTH_STORAGE_KEY = 'cashier-auth';
const USERS_STORAGE_KEY = 'cashier-users';
const SESSION_KEY = 'cashier-session';
const SESSION_TIMEOUT = 60 * 60 * 1000; // ساعة واحدة بالمللي ثانية

// أنواع المستخدمين
const USER_ROLES = {
    ADMIN: 'admin',     // المسؤول - صلاحيات كاملة
    MANAGER: 'manager', // المدير - صلاحيات محدودة (بدون إدارة المستخدمين)
    CASHIER: 'cashier'  // الكاشير - صلاحيات المبيعات فقط
};

// تشفير كلمة المرور باستخدام SHA-256
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * تهيئة نظام المصادقة
 * إنشاء مستخدم مسؤول افتراضي إذا لم يكن هناك مستخدمين
 */
async function initAuth() {
    try {
        const users = await loadUsers();
        
        // التحقق من وجود مستخدمين
        if (!users || users.length === 0) {
            console.log('لا يوجد مستخدمين، إنشاء مستخدم مسؤول افتراضي...');
            
            // إنشاء مستخدم مسؤول افتراضي
            const adminUser = {
                id: generateUniqueId(),
                username: 'admin',
                password: await hashPassword('admin123'),
                name: 'المسؤول',
                role: USER_ROLES.ADMIN,
                active: true,
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            
            await saveUsers([adminUser]);
            console.log('تم إنشاء المستخدم المسؤول بنجاح.');
        }
    } catch (error) {
        console.error('خطأ في تهيئة نظام المصادقة:', error);
    }
}

/**
 * تسجيل الدخول
 * @param {string} username - اسم المستخدم
 * @param {string} password - كلمة المرور
 * @param {boolean} rememberMe - تذكر المستخدم
 * @returns {Promise<Object>} - بيانات المستخدم إذا نجح تسجيل الدخول
 */
async function login(username, password, rememberMe = false) {
    try {
        // التحقق من صحة المدخلات
        if (!username || !password) {
            throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور');
        }
        
        // تحميل قائمة المستخدمين
        const users = await loadUsers();
        if (!users || users.length === 0) {
            throw new Error('لا يوجد مستخدمين في النظام');
        }
        
        // البحث عن المستخدم
        const user = users.find(u => u.username === username);
        if (!user) {
            throw new Error('اسم المستخدم غير موجود');
        }
        
        // التحقق من حساب المستخدم
        if (!user.active) {
            throw new Error('الحساب معطل، يرجى التواصل مع المسؤول');
        }
        
        // التحقق من كلمة المرور
        const hashedPassword = await hashPassword(password);
        if (user.password !== hashedPassword) {
            throw new Error('كلمة المرور غير صحيحة');
        }
        
        // تحديث آخر تسجيل دخول
        const updatedUsers = users.map(u => {
            if (u.id === user.id) {
                return {
                    ...u,
                    lastLogin: new Date().toISOString()
                };
            }
            return u;
        });
        
        await saveUsers(updatedUsers);
        
        // إنشاء جلسة المستخدم
        const session = {
            userId: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            loggedInAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + SESSION_TIMEOUT).toISOString()
        };
        
        // حفظ الجلسة
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        
        // حفظ بيانات تسجيل الدخول إذا تم تحديد "تذكرني"
        if (rememberMe) {
            localStorage.setItem('remember-credentials', JSON.stringify({
                username: username,
                rememberMe: true
            }));
        } else {
            localStorage.removeItem('remember-credentials');
        }
        
        // إعادة بيانات المستخدم بدون كلمة المرور
        const { password: _, ...userWithoutPassword } = user;
        return {
            success: true,
            user: userWithoutPassword,
            session
        };
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * تسجيل الخروج
 */
function logout() {
    // حذف بيانات الجلسة
    localStorage.removeItem(SESSION_KEY);
    
    // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
    window.location.href = 'login.html';
}

/**
 * التحقق من وجود جلسة نشطة
 * @returns {Object|null} - بيانات الجلسة إذا كانت موجودة ونشطة
 */
function checkSession() {
    try {
        // التحقق من وجود بيانات الجلسة
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (!sessionData) {
            return null;
        }
        
        // تحليل بيانات الجلسة
        const session = JSON.parse(sessionData);
        
        // التحقق من صلاحية الجلسة
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        
        if (now > expiresAt) {
            // الجلسة منتهية الصلاحية
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        
        // تمديد وقت انتهاء الجلسة
        session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT).toISOString();
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        
        return session;
    } catch (error) {
        console.error('خطأ في التحقق من الجلسة:', error);
        return null;
    }
}

/**
 * التحقق من تفاصيل تسجيل الدخول المحفوظة (تذكرني)
 */
function checkRememberedLogin() {
    try {
        const savedCredentials = localStorage.getItem('remember-credentials');
        if (!savedCredentials) {
            return;
        }
        
        const { username, rememberMe } = JSON.parse(savedCredentials);
        if (username && rememberMe) {
            document.getElementById('username').value = username;
            document.getElementById('remember-me').checked = true;
            // التركيز على حقل كلمة المرور
            document.getElementById('password').focus();
        }
    } catch (error) {
        console.error('خطأ في استرجاع بيانات تسجيل الدخول المحفوظة:', error);
    }
}

/**
 * تحميل قائمة المستخدمين
 * @returns {Promise<Array>} - قائمة المستخدمين
 */
async function loadUsers() {
    // استخدام واجهة التخزين المحسنة إذا كانت متوفرة
    if (window.enhancedStorage) {
        const usersData = await window.enhancedStorage.getItem(USERS_STORAGE_KEY);
        return usersData ? JSON.parse(usersData) : [];
    } else {
        // استخدام localStorage كبديل
        const usersData = localStorage.getItem(USERS_STORAGE_KEY);
        return usersData ? JSON.parse(usersData) : [];
    }
}

/**
 * حفظ قائمة المستخدمين
 * @param {Array} users - قائمة المستخدمين
 */
async function saveUsers(users) {
    // استخدام واجهة التخزين المحسنة إذا كانت متوفرة
    if (window.enhancedStorage) {
        await window.enhancedStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } else {
        // استخدام localStorage كبديل
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
}

/**
 * إنشاء مستخدم جديد
 * @param {Object} userData - بيانات المستخدم الجديد
 * @returns {Promise<Object>} - نتيجة العملية
 */
async function createUser(userData) {
    try {
        // التحقق من وجود البيانات المطلوبة
        if (!userData.username || !userData.password || !userData.name || !userData.role) {
            throw new Error('جميع الحقول مطلوبة');
        }
        
        // تحميل قائمة المستخدمين
        const users = await loadUsers();
        
        // التحقق من عدم وجود مستخدم بنفس اسم المستخدم
        if (users.some(u => u.username === userData.username)) {
            throw new Error('اسم المستخدم موجود بالفعل');
        }
        
        // تشفير كلمة المرور
        const hashedPassword = await hashPassword(userData.password);
        
        // إنشاء كائن المستخدم الجديد
        const newUser = {
            id: generateUniqueId(),
            username: userData.username,
            password: hashedPassword,
            name: userData.name,
            role: userData.role,
            active: true,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        
        // إضافة المستخدم إلى القائمة
        users.push(newUser);
        
        // حفظ القائمة المحدثة
        await saveUsers(users);
        
        // إعادة بيانات المستخدم بدون كلمة المرور
        const { password, ...userWithoutPassword } = newUser;
        
        return {
            success: true,
            user: userWithoutPassword
        };
    } catch (error) {
        console.error('خطأ في إنشاء المستخدم:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * تعديل بيانات مستخدم
 * @param {string} userId - معرف المستخدم
 * @param {Object} userData - البيانات المحدثة
 * @returns {Promise<Object>} - نتيجة العملية
 */
async function updateUser(userId, userData) {
    try {
        // التحقق من وجود معرف المستخدم
        if (!userId) {
            throw new Error('معرف المستخدم مطلوب');
        }
        
        // تحميل قائمة المستخدمين
        const users = await loadUsers();
        
        // البحث عن المستخدم
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            throw new Error('المستخدم غير موجود');
        }
        
        // التحقق من عدم وجود مستخدم آخر بنفس اسم المستخدم الجديد
        if (userData.username && userData.username !== users[userIndex].username) {
            if (users.some(u => u.username === userData.username && u.id !== userId)) {
                throw new Error('اسم المستخدم موجود بالفعل');
            }
        }
        
        // تحضير بيانات المستخدم المحدثة
        const updatedUser = { ...users[userIndex] };
        
        // تحديث البيانات
        if (userData.username) updatedUser.username = userData.username;
        if (userData.name) updatedUser.name = userData.name;
        if (userData.role) updatedUser.role = userData.role;
        if (userData.active !== undefined) updatedUser.active = userData.active;
        
        // تحديث كلمة المرور إذا تم تقديمها
        if (userData.password) {
            updatedUser.password = await hashPassword(userData.password);
        }
        
        // تحديث وقت التعديل
        updatedUser.updatedAt = new Date().toISOString();
        
        // تحديث القائمة
        users[userIndex] = updatedUser;
        
        // حفظ القائمة المحدثة
        await saveUsers(users);
        
        // إعادة بيانات المستخدم بدون كلمة المرور
        const { password, ...userWithoutPassword } = updatedUser;
        
        return {
            success: true,
            user: userWithoutPassword
        };
    } catch (error) {
        console.error('خطأ في تحديث المستخدم:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * تغيير كلمة مرور المستخدم
 * @param {string} userId - معرف المستخدم
 * @param {string} currentPassword - كلمة المرور الحالية
 * @param {string} newPassword - كلمة المرور الجديدة
 * @returns {Promise<Object>} - نتيجة العملية
 */
async function changePassword(userId, currentPassword, newPassword) {
    try {
        // التحقق من وجود المعرف وكلمات المرور
        if (!userId || !currentPassword || !newPassword) {
            throw new Error('جميع الحقول مطلوبة');
        }
        
        // تحميل قائمة المستخدمين
        const users = await loadUsers();
        
        // البحث عن المستخدم
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            throw new Error('المستخدم غير موجود');
        }
        
        // التحقق من كلمة المرور الحالية
        const hashedCurrentPassword = await hashPassword(currentPassword);
        if (users[userIndex].password !== hashedCurrentPassword) {
            throw new Error('كلمة المرور الحالية غير صحيحة');
        }
        
        // تشفير كلمة المرور الجديدة
        const hashedNewPassword = await hashPassword(newPassword);
        
        // تحديث كلمة المرور
        users[userIndex].password = hashedNewPassword;
        users[userIndex].updatedAt = new Date().toISOString();
        
        // حفظ القائمة المحدثة
        await saveUsers(users);
        
        return {
            success: true,
            message: 'تم تغيير كلمة المرور بنجاح'
        };
    } catch (error) {
        console.error('خطأ في تغيير كلمة المرور:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * حذف مستخدم
 * @param {string} userId - معرف المستخدم
 * @returns {Promise<Object>} - نتيجة العملية
 */
async function deleteUser(userId) {
    try {
        // التحقق من وجود المعرف
        if (!userId) {
            throw new Error('معرف المستخدم مطلوب');
        }
        
        // تحميل قائمة المستخدمين
        const users = await loadUsers();
        
        // البحث عن المستخدم
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            throw new Error('المستخدم غير موجود');
        }
        
        // التحقق من أن هذا ليس آخر مستخدم مسؤول
        const adminUsers = users.filter(u => u.role === USER_ROLES.ADMIN && u.id !== userId);
        if (users[userIndex].role === USER_ROLES.ADMIN && adminUsers.length === 0) {
            throw new Error('لا يمكن حذف آخر مستخدم مسؤول في النظام');
        }
        
        // حذف المستخدم من القائمة
        users.splice(userIndex, 1);
        
        // حفظ القائمة المحدثة
        await saveUsers(users);
        
        return {
            success: true,
            message: 'تم حذف المستخدم بنجاح'
        };
    } catch (error) {
        console.error('خطأ في حذف المستخدم:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * الحصول على قائمة المستخدمين
 * @param {boolean} includePasswords - هل يتم تضمين كلمات المرور؟
 * @returns {Promise<Array>} - قائمة المستخدمين
 */
async function getUsers(includePasswords = false) {
    try {
        // تحميل قائمة المستخدمين
        const users = await loadUsers();
        
        // إزالة كلمات المرور إذا لزم الأمر
        if (!includePasswords) {
            return users.map(({ password, ...user }) => user);
        }
        
        return users;
    } catch (error) {
        console.error('خطأ في جلب قائمة المستخدمين:', error);
        return [];
    }
}

/**
 * الحصول على بيانات مستخدم معين
 * @param {string} userId - معرف المستخدم
 * @param {boolean} includePassword - هل يتم تضمين كلمة المرور؟
 * @returns {Promise<Object|null>} - بيانات المستخدم أو null إذا لم يوجد
 */
async function getUserById(userId, includePassword = false) {
    try {
        // تحميل قائمة المستخدمين
        const users = await loadUsers();
        
        // البحث عن المستخدم
        const user = users.find(u => u.id === userId);
        if (!user) {
            return null;
        }
        
        // إزالة كلمة المرور إذا لزم الأمر
        if (!includePassword) {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }
        
        return user;
    } catch (error) {
        console.error('خطأ في جلب بيانات المستخدم:', error);
        return null;
    }
}

/**
 * الحصول على المستخدم الحالي (المسجل دخوله)
 * @returns {Promise<Object|null>} - بيانات المستخدم أو null إذا لم يكن مسجل الدخول
 */
async function getCurrentUser() {
    try {
        // التحقق من وجود جلسة نشطة
        const session = checkSession();
        if (!session) {
            return null;
        }
        
        // الحصول على بيانات المستخدم
        return await getUserById(session.userId);
    } catch (error) {
        console.error('خطأ في جلب بيانات المستخدم الحالي:', error);
        return null;
    }
}

/**
 * التحقق من صلاحيات المستخدم
 * @param {string|Array} requiredRoles - الدور المطلوب أو مجموعة الأدوار المطلوبة
 * @returns {Promise<boolean>} - هل يملك المستخدم الصلاحية؟
 */
async function checkPermission(requiredRoles) {
    try {
        // الحصول على المستخدم الحالي
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return false;
        }
        
        // تحويل الدور المطلوب إلى مصفوفة
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        
        // التحقق من وجود دور المستخدم ضمن الأدوار المطلوبة
        return roles.includes(currentUser.role);
    } catch (error) {
        console.error('خطأ في التحقق من الصلاحيات:', error);
        return false;
    }
}

/**
 * تأمين الصفحة - التحقق من تسجيل الدخول والصلاحيات
 * @param {string|Array} requiredRoles - الدور المطلوب أو مجموعة الأدوار المطلوبة
 */
async function securePage(requiredRoles = null) {
    try {
        // التحقق من وجود جلسة نشطة
        const session = checkSession();
        if (!session) {
            // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }
        
        // إذا تم تحديد أدوار مطلوبة، تحقق من الصلاحيات
        if (requiredRoles) {
            const hasPermission = await checkPermission(requiredRoles);
            if (!hasPermission) {
                // إعادة توجيه المستخدم إلى الصفحة الرئيسية أو صفحة الخطأ
                alert('ليس لديك صلاحية للوصول إلى هذه الصفحة');
                window.location.href = 'index.html';
            }
        }
        
        // تحديث بيانات المستخدم في واجهة المستخدم
        updateUserUI(session);
    } catch (error) {
        console.error('خطأ في تأمين الصفحة:', error);
        // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول في حالة الخطأ
        window.location.href = 'login.html';
    }
}

/**
 * تحديث واجهة المستخدم ببيانات المستخدم الحالي
 * @param {Object} session - بيانات جلسة المستخدم
 */
function updateUserUI(session) {
    // تحديث اسم المستخدم في الواجهة إذا وجد العنصر
    const userNameElement = document.getElementById('current-user');
    if (userNameElement && session) {
        userNameElement.textContent = `المستخدم: ${session.name}`;
    }
    
    // إخفاء/إظهار العناصر حسب دور المستخدم
    const adminElements = document.querySelectorAll('.admin-only');
    const managerElements = document.querySelectorAll('.manager-only');
    const cashierElements = document.querySelectorAll('.cashier-only');
    
    if (session) {
        const { role } = session;
        
        // عناصر المسؤول
        adminElements.forEach(element => {
            element.style.display = role === USER_ROLES.ADMIN ? '' : 'none';
        });
        
        // عناصر المدير
        managerElements.forEach(element => {
            element.style.display = 
                (role === USER_ROLES.ADMIN || role === USER_ROLES.MANAGER) 
                    ? '' 
                    : 'none';
        });
        
        // عناصر الكاشير
        cashierElements.forEach(element => {
            element.style.display = ''; // متاح للجميع
        });
    }
}

/**
 * معالجة نموذج تسجيل الدخول
 */
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة نظام المصادقة
    initAuth();
    
    // إضافة مستمع لنموذج تسجيل الدخول
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // جمع بيانات النموذج
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember-me').checked;
            
            // عرض مؤشر التحميل
            const loginBtn = document.querySelector('.login-btn');
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
            }
            
            // محاولة تسجيل الدخول
            const result = await login(username, password, rememberMe);
            
            // إعادة تمكين زر تسجيل الدخول
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> دخول';
            }
            
            if (result.success) {
                // تسجيل الدخول ناجح
                
                // الحصول على رابط إعادة التوجيه
                const urlParams = new URLSearchParams(window.location.search);
                const redirectUrl = urlParams.get('redirect') || 'index.html';
                
                // إعادة توجيه المستخدم
                window.location.href = redirectUrl;
            } else {
                // تسجيل الدخول فشل
                const errorMsgElement = document.getElementById('login-error');
                if (errorMsgElement) {
                    errorMsgElement.classList.remove('hidden');
                    errorMsgElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${result.error}`;
                }
            }
        });
    }
    
    // تأمين الصفحة إذا لم تكن صفحة تسجيل الدخول
    if (!document.querySelector('.login-page')) {
        securePage();
    }
});

// تصدير الدوال للاستخدام في ملفات أخرى
window.authSystem = {
    login,
    logout,
    getCurrentUser,
    checkPermission,
    securePage,
    createUser,
    updateUser,
    changePassword,
    deleteUser,
    getUsers,
    getUserById,
    USER_ROLES
};


// إضافة هذه التعديلات إلى ملف auth.js السابق

// تعديل وظيفة تسجيل الدخول للتكامل مع Electron
/**
 * تسجيل الدخول
 * @param {string} username - اسم المستخدم
 * @param {string} password - كلمة المرور
 * @param {boolean} rememberMe - تذكر المستخدم
 * @returns {Promise<Object>} - بيانات المستخدم إذا نجح تسجيل الدخول
 */
async function login(username, password, rememberMe = false) {
    try {
        // التحقق من صحة المدخلات
        if (!username || !password) {
            throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور');
        }
        
        // تحميل قائمة المستخدمين
        const users = await loadUsers();
        if (!users || users.length === 0) {
            throw new Error('لا يوجد مستخدمين في النظام');
        }
        
        // البحث عن المستخدم
        const user = users.find(u => u.username === username);
        if (!user) {
            throw new Error('اسم المستخدم غير موجود');
        }
        
        // التحقق من حساب المستخدم
        if (!user.active) {
            throw new Error('الحساب معطل، يرجى التواصل مع المسؤول');
        }
        
        // التحقق من كلمة المرور
        const hashedPassword = await hashPassword(password);
        if (user.password !== hashedPassword) {
            throw new Error('كلمة المرور غير صحيحة');
        }
        
        // تحديث آخر تسجيل دخول
        const updatedUsers = users.map(u => {
            if (u.id === user.id) {
                return {
                    ...u,
                    lastLogin: new Date().toISOString()
                };
            }
            return u;
        });
        
        await saveUsers(updatedUsers);
        
        // إنشاء جلسة المستخدم
        const session = {
            userId: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            loggedInAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + SESSION_TIMEOUT).toISOString()
        };
        
        // حفظ الجلسة
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        
        // حفظ بيانات تسجيل الدخول إذا تم تحديد "تذكرني"
        if (rememberMe) {
            localStorage.setItem('remember-credentials', JSON.stringify({
                username: username,
                rememberMe: true
            }));
        } else {
            localStorage.removeItem('remember-credentials');
        }
        
        // إذا كان في بيئة Electron، نقوم بإرسال معلومات الجلسة إلى العملية الرئيسية
        if (window.authElectron) {
            await window.authElectron.login({
                success: true,
                user: { ...user, password: undefined },
                session
            });
        }
        
        // إعادة بيانات المستخدم بدون كلمة المرور
        const { password: _, ...userWithoutPassword } = user;
        return {
            success: true,
            user: userWithoutPassword,
            session
        };
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * تسجيل الخروج
 */
function logout() {
    // حذف بيانات الجلسة
    localStorage.removeItem(SESSION_KEY);
    
    // إذا كان في بيئة Electron، نقوم بإرسال طلب تسجيل الخروج إلى العملية الرئيسية
    if (window.authElectron) {
        window.authElectron.logout()
            .then(() => {
                // لا نقوم بإعادة التوجيه هنا لأن العملية الرئيسية ستتعامل مع ذلك
            })
            .catch(error => {
                console.error('خطأ في تسجيل الخروج من Electron:', error);
                // في حالة الخطأ، نقوم بإعادة التوجيه إلى صفحة تسجيل الدخول
                window.location.href = 'login.html';
            });
    } else {
        // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
        window.location.href = 'login.html';
    }
}

/**
 * التحقق من وجود جلسة نشطة
 * @returns {Object|null} - بيانات الجلسة إذا كانت موجودة ونشطة
 */
async function checkSession() {
    try {
        // التحقق من وجود بيانات الجلسة المخزنة في Electron أولاً
        if (window.authElectron && window.authElectron.getStoredSession) {
            const electronSession = await window.authElectron.getStoredSession();
            if (electronSession) {
                // التحقق من صلاحية الجلسة
                const now = new Date();
                const expiresAt = new Date(electronSession.expiresAt);
                
                if (now > expiresAt) {
                    // الجلسة منتهية الصلاحية
                    return null;
                }
                
                // تمديد وقت انتهاء الجلسة
                electronSession.expiresAt = new Date(Date.now() + SESSION_TIMEOUT).toISOString();
                
                // تحديث الجلسة في التخزين المحلي
                localStorage.setItem(SESSION_KEY, JSON.stringify(electronSession));
                
                return electronSession;
            }
        }
        
        // التحقق من وجود بيانات الجلسة في التخزين المحلي
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (!sessionData) {
            return null;
        }
        
        // تحليل بيانات الجلسة
        const session = JSON.parse(sessionData);
        
        // التحقق من صلاحية الجلسة
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        
        if (now > expiresAt) {
            // الجلسة منتهية الصلاحية
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        
        // تمديد وقت انتهاء الجلسة
        session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT).toISOString();
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        
        return session;
    } catch (error) {
        console.error('خطأ في التحقق من الجلسة:', error);
        return null;
    }
}

/**
 * تأمين الصفحة - التحقق من تسجيل الدخول والصلاحيات
 * @param {string|Array} requiredRoles - الدور المطلوب أو مجموعة الأدوار المطلوبة
 */
async function securePage(requiredRoles = null) {
    try {
        // التحقق من وجود جلسة نشطة
        const session = await checkSession();
        if (!session) {
            // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }
        
        // إذا تم تحديد أدوار مطلوبة، تحقق من الصلاحيات
        if (requiredRoles) {
            const hasPermission = await checkPermission(requiredRoles);
            if (!hasPermission) {
                // إظهار رسالة خطأ
                showAlert('ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
                
                // إعادة توجيه المستخدم إلى الصفحة الرئيسية أو صفحة الخطأ
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                
                return;
            }
        }
        
        // تحديث بيانات المستخدم في واجهة المستخدم
        updateUserUI(session);
    } catch (error) {
        console.error('خطأ في تأمين الصفحة:', error);
        // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول في حالة الخطأ
        window.location.href = 'login.html';
    }
}

/**
 * تحميل قائمة المستخدمين
 * @returns {Promise<Array>} - قائمة المستخدمين
 */
async function loadUsers() {
    // استخدام واجهة التخزين المحسنة إذا كانت متوفرة
    if (window.enhancedStorage) {
        try {
            const usersData = await window.enhancedStorage.getItem(USERS_STORAGE_KEY);
            return usersData ? JSON.parse(usersData) : [];
        } catch (error) {
            console.error('خطأ في تحميل المستخدمين من التخزين المحسن:', error);
            
            // في حالة الخطأ، نستخدم localStorage كبديل
            const usersData = localStorage.getItem(USERS_STORAGE_KEY);
            return usersData ? JSON.parse(usersData) : [];
        }
    } else if (window.fs) {
        // استخدام نظام الملفات في Electron إذا كان متوفرًا
        try {
            const usersPath = 'users.json';
            
            // التحقق من وجود الملف
            if (await window.fs.exists(usersPath)) {
                const usersData = await window.fs.readFile(usersPath, { encoding: 'utf8' });
                return JSON.parse(usersData);
            } else {
                // في حالة عدم وجود الملف، نستخدم localStorage كبديل
                const usersData = localStorage.getItem(USERS_STORAGE_KEY);
                return usersData ? JSON.parse(usersData) : [];
            }
        } catch (error) {
            console.error('خطأ في تحميل المستخدمين من نظام الملفات:', error);
            
            // في حالة الخطأ، نستخدم localStorage كبديل
            const usersData = localStorage.getItem(USERS_STORAGE_KEY);
            return usersData ? JSON.parse(usersData) : [];
        }
    } else {
        // استخدام localStorage كبديل
        const usersData = localStorage.getItem(USERS_STORAGE_KEY);
        return usersData ? JSON.parse(usersData) : [];
    }
}

/**
 * حفظ قائمة المستخدمين
 * @param {Array} users - قائمة المستخدمين
 */
async function saveUsers(users) {
    const usersData = JSON.stringify(users);
    
    // استخدام واجهة التخزين المحسنة إذا كانت متوفرة
    if (window.enhancedStorage) {
        try {
            await window.enhancedStorage.setItem(USERS_STORAGE_KEY, usersData);
        } catch (error) {
            console.error('خطأ في حفظ المستخدمين في التخزين المحسن:', error);
            
            // في حالة الخطأ، نستخدم localStorage كبديل
            localStorage.setItem(USERS_STORAGE_KEY, usersData);
        }
    } else if (window.fs) {
        // استخدام نظام الملفات في Electron إذا كان متوفرًا
        try {
            const usersPath = 'users.json';
            await window.fs.writeFile(usersPath, usersData);
            
            // كنسخة احتياطية، نحفظها أيضًا في localStorage
            localStorage.setItem(USERS_STORAGE_KEY, usersData);
        } catch (error) {
            console.error('خطأ في حفظ المستخدمين في نظام الملفات:', error);
            
            // في حالة الخطأ، نستخدم localStorage كبديل
            localStorage.setItem(USERS_STORAGE_KEY, usersData);
        }
    } else {
        // استخدام localStorage كبديل
        localStorage.setItem(USERS_STORAGE_KEY, usersData);
    }
}
/**
 * ملف user-management.js - المسؤول عن إدارة المستخدمين والصلاحيات
 */

// كائن إدارة المستخدمين
const UserManager = {
    // قائمة المستخدمين
    users: [],
    
    // المستخدم الحالي
    currentUser: null,
    
    // مفتاح التخزين المحلي للمستخدمين
    USERS_KEY: 'cashier-users',
    
    /**
     * تهيئة نظام إدارة المستخدمين
     */
    init: function() {
        console.log("تهيئة نظام إدارة المستخدمين...");
        
        // تحميل بيانات المستخدمين
        this.loadUsers();
        
        // تحميل بيانات المستخدم الحالي
        this.loadCurrentUser();
        
        // إضافة مستمعات الأحداث
        this.attachEventListeners();
        
        // عرض قائمة المستخدمين إذا كان المستخدم الحالي لديه صلاحيات الإدارة
        if (this.hasAdminAccess()) {
            this.displayUsers();
        } else {
            this.hideAdminSections();
        }
        
        // عرض اسم المستخدم في الترويسة
        this.updateUserDisplay();
        
        console.log("تم تهيئة نظام إدارة المستخدمين");
    },
    
    /**
     * تحميل بيانات المستخدمين من التخزين المحلي
     */
    loadUsers: function() {
        try {
            const usersData = localStorage.getItem(this.USERS_KEY);
            if (usersData) {
                this.users = JSON.parse(usersData);
            } else {
                this.users = [];
                
                // إنشاء مستخدم افتراضي إذا لم يكن هناك مستخدمين
                if (this.users.length === 0) {
                    const defaultAdmin = {
                        id: this.generateId(),
                        username: 'admin',
                        displayName: 'المدير',
                        password: this.hashPassword('admin123'),
                        role: 'admin',
                        isActive: true,
                        requirePasswordChange: false,
                        createdAt: new Date().toISOString()
                    };
                    
                    this.users.push(defaultAdmin);
                    this.saveUsers();
                }
            }
            
            console.log(`تم تحميل ${this.users.length} مستخدم`);
        } catch (error) {
            console.error("خطأ في تحميل بيانات المستخدمين:", error);
            this.users = [];
        }
    },
    
    /**
     * حفظ بيانات المستخدمين في التخزين المحلي
     */
    saveUsers: function() {
        try {
            localStorage.setItem(this.USERS_KEY, JSON.stringify(this.users));
            return true;
        } catch (error) {
            console.error("خطأ في حفظ بيانات المستخدمين:", error);
            return false;
        }
    },
    
    /**
     * تحميل بيانات المستخدم الحالي
     */
    loadCurrentUser: function() {
        try {
            const authData = localStorage.getItem('cashier-auth');
            if (!authData) {
                // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = 'login.html';
                }
                return;
            }
            
            const auth = JSON.parse(authData);
            // التحقق من صلاحية الجلسة
            if (new Date(auth.expiresAt) < new Date()) {
                // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول إذا انتهت صلاحية الجلسة
                if (!window.location.pathname.includes('login.html')) {
                    localStorage.removeItem('cashier-auth');
                    window.location.href = 'login.html';
                }
                return;
            }
            
            // البحث عن المستخدم بواسطة اسم المستخدم
            this.currentUser = this.getUserByUsername(auth.username);
            
            // التحقق من وجود المستخدم وحالته
            if (!this.currentUser || !this.currentUser.isActive) {
                // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
                localStorage.removeItem('cashier-auth');
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = 'login.html';
                }
                return;
            }
            
            console.log("تم تحميل المستخدم الحالي:", this.currentUser.username);
        } catch (error) {
            console.error("خطأ في تحميل بيانات المستخدم الحالي:", error);
        }
    },
    
    /**
     * إضافة مستمعات الأحداث
     */
    attachEventListeners: function() {
        // زر إضافة مستخدم جديد
        const addUserBtn = document.getElementById('add-user-btn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.showUserModal());
        }
        
        // نموذج المستخدم
        const userForm = document.getElementById('user-form');
        if (userForm) {
            userForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveUserFromForm();
            });
        }
        
        // زر تسجيل الخروج
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // رابط تغيير كلمة المرور
        const changePasswordLink = document.getElementById('change-password-link');
        if (changePasswordLink) {
            changePasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showChangePasswordModal();
            });
        }
        
        // نموذج تغيير كلمة المرور
        const changePasswordForm = document.getElementById('change-password-form');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }
        
        // أزرار إظهار/إخفاء كلمة المرور
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                
                if (input) {
                    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                    input.setAttribute('type', type);
                    
                    // تغيير الأيقونة
                    const icon = btn.querySelector('i');
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
            });
        });
        
        // حقل البحث عن المستخدمين
        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', () => {
                const searchTerm = userSearch.value.trim().toLowerCase();
                this.searchUsers(searchTerm);
            });
        }
        
        // حقل كلمة المرور الجديدة (للتحقق من القوة)
        const newPasswordInput = document.getElementById('new-password');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', () => {
                this.checkPasswordStrength(newPasswordInput.value);
            });
        }
        
        // حقل تأكيد كلمة المرور
        const confirmPasswordInput = document.getElementById('confirm-password');
        if (confirmPasswordInput && newPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.checkPasswordMatch(newPasswordInput.value, confirmPasswordInput.value);
            });
        }
        
        // حقول تشفير النسخ الاحتياطي
        const encryptBackupCheckbox = document.getElementById('encrypt-backup');
        const backupPasswordInput = document.getElementById('backup-password');
        const toggleBackupPasswordBtn = document.getElementById('toggle-backup-password');
        
        if (encryptBackupCheckbox && backupPasswordInput && toggleBackupPasswordBtn) {
            encryptBackupCheckbox.addEventListener('change', () => {
                backupPasswordInput.disabled = !encryptBackupCheckbox.checked;
                toggleBackupPasswordBtn.disabled = !encryptBackupCheckbox.checked;
            });
        }
    },
    
    /**
     * عرض مودال إضافة/تعديل مستخدم
     * @param {string} userId - معرف المستخدم (للتعديل)
     */
    showUserModal: function(userId = null) {
        const modal = document.getElementById('user-modal');
        const modalTitle = document.getElementById('user-modal-title');
        const form = document.getElementById('user-form');
        
        if (!modal || !modalTitle || !form) return;
        
        // تفريغ النموذج
        form.reset();
        
        if (userId) {
            // وضع التعديل
            const user = this.getUserById(userId);
            if (!user) return;
            
            modalTitle.textContent = 'تعديل المستخدم';
            
            // ملء بيانات المستخدم
            document.getElementById('user-username').value = user.username;
            document.getElementById('user-username').disabled = true; // لا يمكن تغيير اسم المستخدم
            document.getElementById('user-display-name').value = user.displayName;
            document.getElementById('user-role').value = user.role;
            document.getElementById('user-active').checked = user.isActive;
            document.getElementById('user-require-password-change').checked = user.requirePasswordChange;
            
            // إخفاء حقل كلمة المرور في وضع التعديل
            const passwordGroup = document.querySelector('#user-form .form-group:nth-child(3)');
            if (passwordGroup) {
                passwordGroup.style.display = 'none';
            }
            
            // تخزين معرف المستخدم في النموذج
            form.setAttribute('data-user-id', userId);
        } else {
            // وضع الإضافة
            modalTitle.textContent = 'إضافة مستخدم جديد';
            document.getElementById('user-username').disabled = false;
            
            // إظهار حقل كلمة المرور
            const passwordGroup = document.querySelector('#user-form .form-group:nth-child(3)');
            if (passwordGroup) {
                passwordGroup.style.display = 'block';
            }
            
            // إزالة معرف المستخدم من النموذج
            form.removeAttribute('data-user-id');
        }
        
        // إظهار المودال
        modal.style.display = 'block';
    },
    
    /**
     * إخفاء أقسام الإدارة للمستخدمين غير المسؤولين
     */
    hideAdminSections: function() {
        // إخفاء قسم إدارة المستخدمين
        const usersSection = document.getElementById('users-settings-section');
        if (usersSection) {
            usersSection.style.display = 'none';
        }
        
        // إخفاء قسم إعدادات الأمان
        const securitySection = document.getElementById('security-settings-section');
        if (securitySection) {
            securitySection.style.display = 'none';
        }
    },
    
    /**
     * عرض مودال تغيير كلمة المرور
     */
    showChangePasswordModal: function() {
        const modal = document.getElementById('change-password-modal');
        if (!modal) return;
        
        // تفريغ النموذج
        const form = document.getElementById('change-password-form');
        if (form) {
            form.reset();
        }
        
        // إعادة تعيين مؤشرات قوة كلمة المرور والتطابق
        const strengthBar = document.querySelector('.strength-bar');
        if (strengthBar) {
            strengthBar.style.width = '0%';
            strengthBar.className = 'strength-bar';
        }
        
        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.setAttribute('data-met', 'false');
        });
        
        const passwordMatch = document.getElementById('password-match');
        if (passwordMatch) {
            passwordMatch.textContent = '';
            passwordMatch.className = 'password-match';
        }
        
        // إظهار المودال
        modal.style.display = 'block';
    },
    
    /**
     * حفظ بيانات المستخدم من النموذج
     */
    saveUserFromForm: function() {
        const form = document.getElementById('user-form');
        if (!form) return;
        
        const userId = form.getAttribute('data-user-id');
        
        // جمع بيانات النموذج
        const userData = {
            username: document.getElementById('user-username').value.trim(),
            displayName: document.getElementById('user-display-name').value.trim(),
            role: document.getElementById('user-role').value,
            isActive: document.getElementById('user-active').checked,
            requirePasswordChange: document.getElementById('user-require-password-change').checked
        };
        
        // إضافة كلمة المرور في حالة المستخدم الجديد
        if (!userId) {
            userData.password = document.getElementById('user-password').value;
        }
        
        // التحقق من البيانات
        if (!userData.username || !userData.displayName) {
            showAlert('الرجاء إدخال جميع البيانات المطلوبة', 'error');
            return;
        }
        
        // التحقق من كلمة المرور في حالة المستخدم الجديد
        if (!userId && (!userData.password || userData.password.length < 6)) {
            showAlert('الرجاء إدخال كلمة مرور صالحة (6 أحرف على الأقل)', 'error');
            return;
        }
        
        if (userId) {
            // تعديل مستخدم موجود
            const result = this.updateUser(userId, userData);
            if (result) {
                showAlert('تم تعديل المستخدم بنجاح', 'success');
                this.displayUsers(); // تحديث العرض
                closeAllModals(); // إغلاق المودال
            } else {
                showAlert('حدث خطأ أثناء تعديل المستخدم', 'error');
            }
        } else {
            // إضافة مستخدم جديد
            const result = this.addUser(userData);
            if (result) {
                showAlert('تم إضافة المستخدم بنجاح', 'success');
                this.displayUsers(); // تحديث العرض
                closeAllModals(); // إغلاق المودال
            } else {
                showAlert('حدث خطأ أثناء إضافة المستخدم', 'error');
            }
        }
    },
    
    /**
     * إضافة مستخدم جديد
     * @param {object} userData - بيانات المستخدم
     * @returns {boolean} - نجاح العملية
     */
    addUser: function(userData) {
        // التحقق من عدم وجود مستخدم بنفس اسم المستخدم
        if (this.getUserByUsername(userData.username)) {
            showAlert('اسم المستخدم موجود بالفعل', 'error');
            return false;
        }
        
        // إنشاء كائن المستخدم الجديد
        const newUser = {
            id: this.generateId(),
            username: userData.username,
            displayName: userData.displayName,
            password: this.hashPassword(userData.password),
            role: userData.role,
            isActive: userData.isActive,
            requirePasswordChange: userData.requirePasswordChange,
            createdAt: new Date().toISOString(),
            createdBy: this.currentUser ? this.currentUser.id : null
        };
        
        // إضافة المستخدم للقائمة
        this.users.push(newUser);
        
        // حفظ التغييرات
        return this.saveUsers();
    },
    
    /**
     * تعديل بيانات مستخدم
     * @param {string} userId - معرف المستخدم
     * @param {object} userData - بيانات المستخدم المعدلة
     * @returns {boolean} - نجاح العملية
     */
    updateUser: function(userId, userData) {
        // البحث عن المستخدم
        const userIndex = this.users.findIndex(user => user.id === userId);
        if (userIndex === -1) return false;
        
        // تعديل بيانات المستخدم
        this.users[userIndex].displayName = userData.displayName;
        this.users[userIndex].role = userData.role;
        this.users[userIndex].isActive = userData.isActive;
        this.users[userIndex].requirePasswordChange = userData.requirePasswordChange;
        this.users[userIndex].updatedAt = new Date().toISOString();
        this.users[userIndex].updatedBy = this.currentUser ? this.currentUser.id : null;
        
        // حفظ التغييرات
        return this.saveUsers();
    },
    
    /**
     * حذف مستخدم
     * @param {string} userId - معرف المستخدم
     * @returns {boolean} - نجاح العملية
     */
    deleteUser: function(userId) {
        // لا يمكن حذف المستخدم الحالي
        if (this.currentUser && this.currentUser.id === userId) {
            showAlert('لا يمكن حذف المستخدم الحالي', 'error');
            return false;
        }
        
        // التأكد من وجود مستخدم مسؤول واحد على الأقل
        const adminUsers = this.users.filter(user => user.role === 'admin' && user.id !== userId);
        if (adminUsers.length === 0) {
            showAlert('لا يمكن حذف المستخدم المسؤول الوحيد', 'error');
            return false;
        }
        
        // حذف المستخدم
        this.users = this.users.filter(user => user.id !== userId);
        
        // حفظ التغييرات
        return this.saveUsers();
    },
    
    /**
     * تغيير كلمة المرور
     */
    changePassword: function() {
        if (!this.currentUser) return;
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // التحقق من البيانات
        if (!currentPassword || !newPassword || !confirmPassword) {
            showAlert('الرجاء إدخال جميع البيانات المطلوبة', 'error');
            return;
        }
        
        // التحقق من تطابق كلمة المرور الجديدة مع التأكيد
        if (newPassword !== confirmPassword) {
            showAlert('كلمة المرور الجديدة وتأكيدها غير متطابقين', 'error');
            return;
        }
        
        // التحقق من قوة كلمة المرور الجديدة
        if (!this.isStrongPassword(newPassword)) {
            showAlert('كلمة المرور الجديدة ضعيفة، الرجاء اتباع المتطلبات المذكورة', 'error');
            return;
        }
        
        // التحقق من كلمة المرور الحالية
        const hashedCurrentPassword = this.hashPassword(currentPassword);
        if (hashedCurrentPassword !== this.currentUser.password) {
            showAlert('كلمة المرور الحالية غير صحيحة', 'error');
            return;
        }
        
        // تغيير كلمة المرور
        const userIndex = this.users.findIndex(user => user.id === this.currentUser.id);
        if (userIndex === -1) {
            showAlert('حدث خطأ أثناء تغيير كلمة المرور', 'error');
            return;
        }
        
        // تحديث كلمة المرور
        this.users[userIndex].password = this.hashPassword(newPassword);
        this.users[userIndex].requirePasswordChange = false;
        this.users[userIndex].passwordChangedAt = new Date().toISOString();
        
        // حفظ التغييرات
        if (this.saveUsers()) {
            // تحديث المستخدم الحالي
            this.currentUser = this.users[userIndex];
            
            showAlert('تم تغيير كلمة المرور بنجاح', 'success');
            closeAllModals(); // إغلاق المودال
        } else {
            showAlert('حدث خطأ أثناء حفظ كلمة المرور الجديدة', 'error');
        }
    },
    
    /**
     * التحقق من قوة كلمة المرور
     * @param {string} password - كلمة المرور
     * @returns {boolean} - هل كلمة المرور قوية
     */
    isStrongPassword: function(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChars = /[^A-Za-z0-9]/.test(password);
        
        return (
            password.length >= minLength && 
            hasUpperCase && 
            hasLowerCase && 
            hasNumbers && 
            hasSpecialChars
        );
    },
    
    /**
     * فحص قوة كلمة المرور وعرض المؤشر البصري
     * @param {string} password - كلمة المرور
     */
    checkPasswordStrength: function(password) {
        const strengthBar = document.querySelector('.strength-bar');
        const suggestions = document.querySelectorAll('.suggestion-item');
        
        if (!strengthBar || !suggestions.length) return;
        
        // المتطلبات
        const requirements = [
            { test: password.length >= 8, element: suggestions[0] },
            { test: /[A-Z]/.test(password), element: suggestions[1] },
            { test: /[a-z]/.test(password), element: suggestions[2] },
            { test: /\d/.test(password), element: suggestions[3] },
            { test: /[^A-Za-z0-9]/.test(password), element: suggestions[4] }
        ];
        
        // تحديث حالة كل متطلب
        requirements.forEach(req => {
            req.element.setAttribute('data-met', req.test ? 'true' : 'false');
        });
        
        // حساب قوة كلمة المرور (0-100)
        const metCount = requirements.filter(req => req.test).length;
        const strength = (metCount / requirements.length) * 100;
        
        // تحديث شريط القوة
        strengthBar.style.width = `${strength}%`;
        
        // تعيين لون الشريط حسب القوة
        strengthBar.className = 'strength-bar';
        if (strength < 40) {
            strengthBar.classList.add('weak');
        } else if (strength < 80) {
            strengthBar.classList.add('medium');
        } else {
            strengthBar.classList.add('strong');
        }
    },
    
    /**
     * التحقق من تطابق كلمة المرور
     * @param {string} password - كلمة المرور
     * @param {string} confirmPassword - تأكيد كلمة المرور
     */
    checkPasswordMatch: function(password, confirmPassword) {
        const matchElement = document.getElementById('password-match');
        if (!matchElement) return;
        
        if (!confirmPassword) {
            matchElement.textContent = '';
            matchElement.className = 'password-match';
            return;
        }
        
        if (password === confirmPassword) {
            matchElement.textContent = 'كلمة المرور متطابقة';
            matchElement.className = 'password-match match';
        } else {
            matchElement.textContent = 'كلمة المرور غير متطابقة';
            matchElement.className = 'password-match no-match';
        }
    },
    
    /**
     * تسجيل الخروج
     */
    logout: function() {
        // مسح بيانات المصادقة
        localStorage.removeItem('cashier-auth');
        
        // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
        window.location.href = 'login.html';
    },
    
    /**
     * عرض قائمة المستخدمين
     */
    displayUsers: function() {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;
        
        // تفريغ القائمة
        usersList.innerHTML = '';
        
        // عرض المستخدمين
        this.users.forEach(user => {
            const row = document.createElement('tr');
            
            // تنسيق تاريخ آخر تسجيل دخول
            let lastLoginText = 'لم يسجل الدخول بعد';
            if (user.lastLoginAt) {
                const lastLogin = new Date(user.lastLoginAt);
                lastLoginText = lastLogin.toLocaleDateString('ar-IQ') + ' ' + lastLogin.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
            }
            
            // تحديد فئة (class) الصف حسب حالة المستخدم
            if (!user.isActive) {
                row.classList.add('inactive-user');
            }
            
            // بناء خلايا الجدول
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.displayName}</td>
                <td>${this.getRoleDisplayName(user.role)}</td>
                <td>${lastLoginText}</td>
                <td><span class="user-status ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'نشط' : 'معطل'}</span></td>
                <td class="actions-cell">
                    <button class="edit-user-btn table-btn primary-btn" data-id="${user.id}" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="reset-password-btn table-btn secondary-btn" data-id="${user.id}" title="إعادة تعيين كلمة المرور">
                        <i class="fas fa-key"></i>
                    </button>
                    ${user.id !== this.currentUser?.id ? `
                        <button class="toggle-user-btn table-btn ${user.isActive ? 'warning-btn' : 'success-btn'}" data-id="${user.id}" title="${user.isActive ? 'تعطيل' : 'تفعيل'}">
                            <i class="fas ${user.isActive ? 'fa-ban' : 'fa-check'}"></i>
                        </button>
                        <button class="delete-user-btn table-btn danger-btn" data-id="${user.id}" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            
            usersList.appendChild(row);
        });
        
        // إضافة مستمعات أحداث للأزرار
        this.attachUserTableEvents();
    },
    
    /**
     * إضافة مستمعات أحداث لجدول المستخدمين
     */
    attachUserTableEvents: function() {
        // أزرار تعديل المستخدم
        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-id');
                this.showUserModal(userId);
            });
        });
        
        // أزرار إعادة تعيين كلمة المرور
        document.querySelectorAll('.reset-password-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-id');
                this.resetUserPassword(userId);
            });
        });
        
        // أزرار تعطيل/تفعيل المستخدم
        document.querySelectorAll('.toggle-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-id');
                const user = this.getUserById(userId);
                
                if (user) {
                    if (user.isActive) {
                        this.disableUser(userId);
                    } else {
                        this.enableUser(userId);
                    }
                }
            });
        });
        
        // أزرار حذف المستخدم
        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-id');
                this.confirmDeleteUser(userId);
            });
        });
    },
    
    /**
     * البحث عن مستخدمين
     * @param {string} query - نص البحث
     */
    searchUsers: function(query) {
        if (!query) {
            // إذا كان البحث فارغًا، عرض جميع المستخدمين
            this.displayUsers();
            return;
        }
        
        // فلترة المستخدمين حسب نص البحث
        const filteredUsers = this.users.filter(user => {
            return (
                user.username.toLowerCase().includes(query) ||
                user.displayName.toLowerCase().includes(query)
            );
        });
        
        // عرض المستخدمين المفلترة
        const usersList = document.getElementById('users-list');
        if (usersList) {
            usersList.innerHTML = '';
            
            if (filteredUsers.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="6" class="no-results">لا توجد نتائج تطابق البحث</td>`;
                usersList.appendChild(row);
                return;
            }
            
            // تخزين قائمة المستخدمين الأصلية
            const originalUsers = this.users;
            
            // تعيين قائمة المستخدمين المفلترة مؤقتًا
            this.users = filteredUsers;
            
            // عرض المستخدمين المفلترة
            this.displayUsers();
            
            // استعادة قائمة المستخدمين الأصلية
            this.users = originalUsers;
        }
    },
    
    /**
     * إعادة تعيين كلمة مرور مستخدم
     * @param {string} userId - معرف المستخدم
     */
    resetUserPassword: function(userId) {
        const user = this.getUserById(userId);
        if (!user) return;
        
        // طلب تأكيد من المستخدم
        if (!confirm(`هل أنت متأكد من إعادة تعيين كلمة مرور المستخدم "${user.displayName}"؟`)) {
            return;
        }
        
        // كلمة المرور الجديدة (يمكن تغييرها لتكون عشوائية أو ثابتة حسب المتطلبات)
        const newPassword = 'Password123!';
        
        // تحديث كلمة المرور
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) return;
        
        this.users[userIndex].password = this.hashPassword(newPassword);
        this.users[userIndex].requirePasswordChange = true;
        this.users[userIndex].updatedAt = new Date().toISOString();
        this.users[userIndex].updatedBy = this.currentUser?.id;
        
        // حفظ التغييرات
        if (this.saveUsers()) {
            showAlert(`تم إعادة تعيين كلمة مرور المستخدم "${user.displayName}" بنجاح`, 'success');
            
            // عرض كلمة المرور الجديدة للمستخدم المسؤول
            alert(`كلمة المرور الجديدة للمستخدم "${user.displayName}" هي: ${newPassword}`);
        } else {
            showAlert('حدث خطأ أثناء إعادة تعيين كلمة المرور', 'error');
        }
    },
    
    /**
     * تعطيل حساب مستخدم
     * @param {string} userId - معرف المستخدم
     */
    disableUser: function(userId) {
        const user = this.getUserById(userId);
        if (!user) return;
        
        // التأكد من عدم تعطيل المستخدم المسؤول الوحيد
        if (user.role === 'admin') {
            const activeAdminCount = this.users.filter(u => u.role === 'admin' && u.isActive && u.id !== userId).length;
            if (activeAdminCount === 0) {
                showAlert('لا يمكن تعطيل المستخدم المسؤول الوحيد', 'error');
                return;
            }
        }
        
        // طلب تأكيد من المستخدم
        if (!confirm(`هل أنت متأكد من تعطيل حساب المستخدم "${user.displayName}"؟`)) {
            return;
        }
        
        // تعطيل المستخدم
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) return;
        
        this.users[userIndex].isActive = false;
        this.users[userIndex].updatedAt = new Date().toISOString();
        this.users[userIndex].updatedBy = this.currentUser?.id;
        
        // حفظ التغييرات
        if (this.saveUsers()) {
            showAlert(`تم تعطيل حساب المستخدم "${user.displayName}" بنجاح`, 'success');
            this.displayUsers(); // تحديث العرض
        } else {
            showAlert('حدث خطأ أثناء تعطيل الحساب', 'error');
        }
    },
    
    /**
     * تفعيل حساب مستخدم
     * @param {string} userId - معرف المستخدم
     */
    enableUser: function(userId) {
        const user = this.getUserById(userId);
        if (!user) return;
        
        // تفعيل المستخدم
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) return;
        
        this.users[userIndex].isActive = true;
        this.users[userIndex].updatedAt = new Date().toISOString();
        this.users[userIndex].updatedBy = this.currentUser?.id;
        
        // حفظ التغييرات
        if (this.saveUsers()) {
            showAlert(`تم تفعيل حساب المستخدم "${user.displayName}" بنجاح`, 'success');
            this.displayUsers(); // تحديث العرض
        } else {
            showAlert('حدث خطأ أثناء تفعيل الحساب', 'error');
        }
    },
    
    /**
     * تأكيد حذف مستخدم
     * @param {string} userId - معرف المستخدم
     */
    confirmDeleteUser: function(userId) {
        const user = this.getUserById(userId);
        if (!user) return;
        
        // التأكد من عدم حذف المستخدم المسؤول الوحيد
        if (user.role === 'admin') {
            const adminCount = this.users.filter(u => u.role === 'admin' && u.id !== userId).length;
            if (adminCount === 0) {
                showAlert('لا يمكن حذف المستخدم المسؤول الوحيد', 'error');
                return;
            }
        }
        
        // طلب تأكيد من المستخدم
        if (!confirm(`هل أنت متأكد من حذف المستخدم "${user.displayName}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
            return;
        }
        
        // حذف المستخدم
        this.users = this.users.filter(u => u.id !== userId);
        
        // حفظ التغييرات
        if (this.saveUsers()) {
            showAlert(`تم حذف المستخدم "${user.displayName}" بنجاح`, 'success');
            this.displayUsers(); // تحديث العرض
        } else {
            showAlert('حدث خطأ أثناء حذف المستخدم', 'error');
        }
    },
    
    /**
     * التحقق من وجود صلاحيات الإدارة للمستخدم الحالي
     * @returns {boolean} - هل المستخدم الحالي مسؤول
     */
    hasAdminAccess: function() {
        return this.currentUser && this.currentUser.role === 'admin';
    },
    
    /**
     * الحصول على الاسم المعروض للصلاحية
     * @param {string} role - رمز الصلاحية
     * @returns {string} - الاسم المعروض للصلاحية
     */
    getRoleDisplayName: function(role) {
        const roles = {
            'admin': 'مدير',
            'cashier': 'أمين صندوق',
            'inventory': 'مسؤول مخزون',
            'reports': 'محاسب'
        };
        
        return roles[role] || role;
    },
    
    /**
     * تحديث عرض معلومات المستخدم في الترويسة
     */
    updateUserDisplay: function() {
        const userNameElement = document.getElementById('current-user-name');
        if (userNameElement && this.currentUser) {
            userNameElement.textContent = this.currentUser.displayName;
        }
    },
    
    /**
     * الحصول على مستخدم بواسطة معرف
     * @param {string} userId - معرف المستخدم
     * @returns {object|null} - المستخدم أو null
     */
    getUserById: function(userId) {
        return this.users.find(user => user.id === userId) || null;
    },
    
    /**
     * الحصول على مستخدم بواسطة اسم المستخدم
     * @param {string} username - اسم المستخدم
     * @returns {object|null} - المستخدم أو null
     */
    getUserByUsername: function(username) {
        return this.users.find(user => user.username === username) || null;
    },
    
    /**
     * إنشاء معرف فريد
     * @returns {string} - معرف فريد
     */
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
    },
    
    /**
     * تشفير كلمة المرور (تشفير بسيط للعرض، يجب استخدام خوارزمية أقوى في الإنتاج)
     * @param {string} password - كلمة المرور
     * @returns {string} - كلمة المرور المشفرة
     */
    hashPassword: function(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
};

// تصدير وحدة إدارة المستخدمين
window.UserManager = UserManager;

// تهيئة مدير المستخدمين عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    UserManager.init();
});
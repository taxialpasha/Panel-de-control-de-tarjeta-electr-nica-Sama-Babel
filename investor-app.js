/**
 * نظام بوابة المستثمر - ملف JavaScript الرئيسي
 * يوفر الوظائف الأساسية لتشغيل تطبيق المستثمر والتواصل مع النظام الرئيسي
 */

// متغيرات عامة للتطبيق
let currentInvestor = null;
let transactions = [];
let investments = [];
let profits = [];
let notifications = [];
let currentPage = 'dashboard';
let darkMode = localStorage.getItem('darkMode') === 'true';
let notificationsOpen = false;

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('تهيئة تطبيق المستثمر...');
    
    // تعيين وضع الإضاءة (فاتح/داكن)
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // تهيئة التنقل بين الصفحات
    initNavigation();
    
    // تهيئة مستمعات الأحداث
    initEventListeners();
    
    // تحديث التاريخ الحالي
    updateCurrentDate();
    
    // استدعاء API لجلب بيانات المستثمر
    fetchInvestorData();
    
    // تهيئة الرسوم البيانية
    initCharts();
});

// تهيئة التنقل بين الصفحات
function initNavigation() {
    // التنقل بين الصفحات
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // الحصول على معرف الصفحة
            const pageId = this.getAttribute('href').substring(1);
            
            // تغيير الصفحة
            changePage(pageId);
        });
    });
    
    // زر تبديل الشريط الجانبي
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
}

// تغيير الصفحة المعروضة
function changePage(pageId) {
    // إخفاء جميع الصفحات
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // إظهار الصفحة المطلوبة
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // تحديث العنصر النشط في القائمة
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`.nav-link[href="#${pageId}"]`).parentElement;
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // تحديث عنوان الصفحة
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.textContent = getPageTitle(pageId);
    }
    
    // تحديث المتغير العام
    currentPage = pageId;
    
    // تحديث المحتوى حسب الصفحة
    updatePageContent(pageId);
}

// الحصول على عنوان الصفحة
function getPageTitle(pageId) {
    const titles = {
        'dashboard': 'لوحة التحكم',
        'investments': 'استثماراتي',
        'transactions': 'التعاملات',
        'profits': 'تفاصيل الأرباح',
        'withdrawal': 'طلب سحب',
        'reports': 'التقارير',
        'settings': 'الإعدادات'
    };
    
    return titles[pageId] || 'بوابة المستثمر';
}

// تهيئة مستمعات الأحداث
function initEventListeners() {
    // زر تبديل وضع الإضاءة
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleDarkMode);
    }
    
    // زر الإشعارات
    const notificationBell = document.querySelector('.notification-bell');
    const notificationsPanel = document.querySelector('.notifications-panel');
    const closeNotifications = document.querySelector('.close-notifications');
    
    if (notificationBell && notificationsPanel) {
        notificationBell.addEventListener('click', function() {
            notificationsPanel.classList.toggle('active');
            notificationsOpen = !notificationsOpen;
        });
    }
    
    if (closeNotifications) {
        closeNotifications.addEventListener('click', function() {
            notificationsPanel.classList.remove('active');
            notificationsOpen = false;
        });
    }
    
    // زر تعيين جميع الإشعارات كمقروءة
    const markAllReadBtn = document.querySelector('.mark-all-read');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
    }
    
    // أزرار الإجراءات السريعة
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.classList.contains('withdraw') ? 'withdrawal' :
                        this.classList.contains('deposit') ? 'deposit' :
                        this.classList.contains('profits') ? 'profits' :
                        this.classList.contains('history') ? 'transactions' : '';
            
            if (action) {
                changePage(action);
            }
        });
    });
    
    // أزرار فترة الرسم البياني
    const periodButtons = document.querySelectorAll('.period');
    periodButtons.forEach(button => {
        button.addEventListener('click', function() {
            // إزالة الفئة النشطة من جميع الأزرار
            periodButtons.forEach(btn => btn.classList.remove('active'));
            
            // إضافة الفئة النشطة للزر المحدد
            this.classList.add('active');
            
            // تحديث الرسم البياني
            updateChartPeriod(this.textContent.trim());
        });
    });
    
    // نموذج طلب السحب
    const withdrawalForm = document.querySelector('.withdrawal-form');
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const amount = document.getElementById('withdrawal-amount').value;
            const method = document.getElementById('withdrawal-method').value;
            
            if (!amount || isNaN(amount) || amount <= 0) {
                showAlert('يرجى إدخال مبلغ صحيح للسحب', 'error');
                return;
            }
            
            // فتح نافذة تأكيد السحب
            openWithdrawalConfirmation(amount, method);
        });
    }
    
    // تغيير طريقة السحب
    const withdrawalMethod = document.getElementById('withdrawal-method');
    if (withdrawalMethod) {
        withdrawalMethod.addEventListener('change', function() {
            const bankDetails = document.getElementById('bank-details');
            const walletDetails = document.getElementById('wallet-details');
            
            if (this.value === 'bank') {
                bankDetails.style.display = 'block';
                walletDetails.style.display = 'none';
            } else if (this.value === 'wallet') {
                bankDetails.style.display = 'none';
                walletDetails.style.display = 'block';
            } else {
                bankDetails.style.display = 'none';
                walletDetails.style.display = 'none';
            }
        });
    }
    
    // أزرار فلتر المعاملات
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // إزالة الفئة النشطة من جميع الأزرار
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // إضافة الفئة النشطة للزر المحدد
            this.classList.add('active');
            
            // تصفية المعاملات
            filterTransactions(this.getAttribute('data-filter'));
        });
    });
    
    // زر إضافة استثمار جديد
    const addInvestmentBtn = document.querySelector('.add-investment-btn');
    if (addInvestmentBtn) {
        addInvestmentBtn.addEventListener('click', function() {
            openModal('add-investment-modal');
        });
    }
    
    // حساب ملخص الاستثمار عند تغيير المدخلات
    const investmentPlan = document.getElementById('investment-plan');
    const investmentAmount = document.getElementById('investment-amount');
    const investmentDuration = document.getElementById('investment-duration');
    
    if (investmentPlan && investmentAmount && investmentDuration) {
        [investmentPlan, investmentAmount, investmentDuration].forEach(input => {
            input.addEventListener('change', updateInvestmentSummary);
            input.addEventListener('keyup', updateInvestmentSummary);
        });
    }
    
    // زر إغلاق النوافذ المنبثقة
    document.querySelectorAll('.close-modal, .cancel-btn').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // زر تأكيد الاستثمار
    const submitInvestmentBtn = document.getElementById('submit-investment');
    if (submitInvestmentBtn) {
        submitInvestmentBtn.addEventListener('click', submitNewInvestment);
    }
    
    // تأكيد طلب السحب
    const confirmWithdrawBtn = document.querySelector('.confirm-btn');
    if (confirmWithdrawBtn) {
        confirmWithdrawBtn.addEventListener('click', confirmWithdrawal);
    }
}

// تبديل وضع الإضاءة (فاتح/داكن)
function toggleDarkMode() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
    
    // تحديث أيقونة الزر
    const themeIcon = document.querySelector('.theme-toggle i');
    if (themeIcon) {
        themeIcon.className = darkMode ? 'bx bx-sun' : 'bx bx-moon';
    }
    
    // تحديث الرسوم البيانية
    updateChartsTheme();
}

// تحديث التاريخ الحالي
function updateCurrentDate() {
    const dateDisplay = document.getElementById('current-date');
    if (dateDisplay) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        dateDisplay.textContent = today.toLocaleDateString('ar-SA', options);
    }
}

// استدعاء API لجلب بيانات المستثمر
async function fetchInvestorData() {
    try {
        // محاكاة الاتصال بالخادم
        await simulateLoading(1000);
        
        // في الواقع، هنا ستكون هناك استدعاءات للخادم الرئيسي لجلب البيانات
        // لغرض الشرح، سنقوم بتعيين بيانات تجريبية
        
        // بيانات المستثمر
        currentInvestor = {
            id: 'INV7842',
            name: 'محمد عبد الله',
            phone: '0501234567',
            email: 'mohammed@example.com',
            initialInvestment: 50000,
            totalInvestment: 50000,
            profitRate: 17.5,
            startDate: '2024-12-01',
            status: 'active',
            // بيانات إضافية حسب الحاجة
        };
        
        // المعاملات
        transactions = [
            {
                id: 'TXN001',
                type: 'deposit',
                amount: 10000,
                date: '2025-04-01',
                description: 'إيداع جديد',
                status: 'completed'
            },
            {
                id: 'TXN002',
                type: 'profit',
                amount: 8750,
                date: '2025-03-15',
                description: 'أرباح مارس',
                status: 'completed'
            },
            {
                id: 'TXN003',
                type: 'withdraw',
                amount: 5000,
                date: '2025-03-01',
                description: 'سحب',
                status: 'completed'
            },
            {
                id: 'TXN004',
                type: 'profit',
                amount: 8750,
                date: '2025-02-15',
                description: 'أرباح فبراير',
                status: 'completed'
            },
            {
                id: 'TXN005',
                type: 'deposit',
                amount: 15000,
                date: '2025-02-10',
                description: 'إيداع إضافي',
                status: 'completed'
            },
            {
                id: 'TXN006',
                type: 'profit',
                amount: 7000,
                date: '2025-01-15',
                description: 'أرباح يناير',
                status: 'completed'
            },
            {
                id: 'TXN007',
                type: 'withdraw',
                amount: 10000,
                date: '2025-01-05',
                description: 'سحب',
                status: 'completed'
            }
        ];
        
        // الاستثمارات
        investments = [
            {
                id: 'INV001',
                type: 'standard',
                amount: 50000,
                startDate: '2024-12-01',
                profitRate: 17.5,
                status: 'active',
                duration: 'open'
            },
            {
                id: 'INV002',
                type: 'short',
                amount: 25000,
                startDate: '2024-06-01',
                endDate: '2024-09-01',
                profitRate: 15,
                status: 'completed',
                duration: '3'
            }
        ];
        
        // الأرباح
        profits = [
            {
                id: 'PRF001',
                investmentId: 'INV001',
                amount: 8750,
                date: '2025-03-15',
                status: 'paid'
            },
            {
                id: 'PRF002',
                investmentId: 'INV001',
                amount: 8750,
                date: '2025-02-15',
                status: 'paid'
            },
            {
                id: 'PRF003',
                investmentId: 'INV001',
                amount: 7000,
                date: '2025-01-15',
                status: 'paid'
            },
            {
                id: 'PRF004',
                investmentId: 'INV001',
                amount: 8750,
                date: '2025-04-15',
                status: 'pending'
            }
        ];
        
        // الإشعارات
        notifications = [
            {
                id: 'NOT001',
                type: 'profit',
                title: 'تم إضافة أرباحك الشهرية',
                message: 'تهانينا! تم إضافة 8,750 دينار إلى حسابك.',
                date: new Date(new Date().getTime() - 2 * 60 * 60 * 1000), // قبل ساعتين
                read: false
            },
            {
                id: 'NOT002',
                type: 'system',
                title: 'تحديث في سياسة الاستثمار',
                message: 'تم تحديث سياسة الاستثمار. يرجى الاطلاع على التفاصيل.',
                date: new Date(new Date().getTime() - 5 * 60 * 60 * 1000), // قبل 5 ساعات
                read: false
            },
            {
                id: 'NOT003',
                type: 'transaction',
                title: 'عملية سحب ناجحة',
                message: 'تم سحب 5,000 دينار من حسابك بنجاح.',
                date: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000), // قبل يومين
                read: true
            },
            {
                id: 'NOT004',
                type: 'system',
                title: 'موعد استحقاق الأرباح القادم',
                message: 'ستحصل على أرباحك القادمة في 15 أبريل 2025.',
                date: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000), // قبل 3 أيام
                read: true
            }
        ];
        
        // تحديث واجهة المستخدم
        updateUserInterface();
        
    } catch (error) {
        console.error('خطأ في جلب بيانات المستثمر:', error);
        showAlert('حدث خطأ أثناء جلب البيانات. يرجى المحاولة مرة أخرى.', 'error');
    }
}

// تحديث واجهة المستخدم
function updateUserInterface() {
    // تحديث بيانات المستثمر في الشريط الجانبي
    updateInvestorProfile();
    
    // تحديث لوحة التحكم
    updateDashboard();
    
    // تحديث عدد الإشعارات غير المقروءة
    updateNotificationCount();
    
    // تحديث قائمة الإشعارات
    updateNotificationsList();
}

// تحديث بيانات المستثمر في الشريط الجانبي
function updateInvestorProfile() {
    if (!currentInvestor) return;
    
    const investorName = document.getElementById('investor-name');
    const investorInitial = document.getElementById('investor-initial');
    const membershipNumber = document.getElementById('membership-number');
    
    if (investorName) {
        investorName.textContent = currentInvestor.name;
    }
    
    if (investorInitial) {
        investorInitial.textContent = currentInvestor.name.charAt(0);
    }
    
    if (membershipNumber) {
        membershipNumber.textContent = currentInvestor.id;
    }
}

// تحديث لوحة التحكم
function updateDashboard() {
    if (!currentInvestor) return;
    
    // تحديث بطاقة الاستثمار
    const totalInvestment = document.getElementById('total-investment');
    const monthlyProfit = document.getElementById('monthly-profit');
    const dailyProfit = document.getElementById('daily-profit');
    const profitRate = document.getElementById('profit-rate');
    const cardInvestorName = document.getElementById('card-investor-name');
    const investmentDate = document.getElementById('investment-date');
    
    if (totalInvestment) {
        totalInvestment.textContent = formatCurrency(currentInvestor.totalInvestment);
    }
    
    if (monthlyProfit) {
        const profit = calculateMonthlyProfit(currentInvestor.totalInvestment, currentInvestor.profitRate);
        monthlyProfit.textContent = formatCurrency(profit);
    }
    
    if (dailyProfit) {
        const profit = calculateDailyProfit(currentInvestor.totalInvestment, currentInvestor.profitRate);
        dailyProfit.textContent = formatCurrency(profit);
    }
    
    if (profitRate) {
        profitRate.textContent = `${currentInvestor.profitRate}%`;
    }
    
    if (cardInvestorName) {
        cardInvestorName.textContent = currentInvestor.name;
    }
    
    if (investmentDate) {
        investmentDate.textContent = formatDate(currentInvestor.startDate);
    }
    
    // تحديث الإحصائيات السريعة
    const investmentDuration = document.getElementById('investment-duration');
    const totalReceivedProfit = document.getElementById('total-received-profit');
    const nextPaymentDate = document.getElementById('next-payment-date');
    const annualReturn = document.getElementById('annual-return');
    
    if (investmentDuration) {
        const duration = calculateInvestmentDuration(currentInvestor.startDate);
        investmentDuration.textContent = `${duration} يوم`;
    }
    
    if (totalReceivedProfit) {
        const total = calculateTotalReceivedProfits();
        totalReceivedProfit.textContent = formatCurrency(total);
    }
    
    if (nextPaymentDate) {
        const date = calculateNextPaymentDate();
        nextPaymentDate.textContent = formatDate(date);
    }
    
    if (annualReturn) {
        const annual = currentInvestor.profitRate * 12;
        annualReturn.textContent = `${annual}%`;
    }
    
    // تحديث المعاملات الأخيرة
    updateRecentTransactions();
}

// تحديث المعاملات الأخيرة
function updateRecentTransactions() {
    const transactionsList = document.querySelector('.transactions-list');
    if (!transactionsList || !transactions.length) return;
    
    // ترتيب المعاملات حسب التاريخ (الأحدث أولاً)
    const sortedTransactions = [...transactions].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // عرض أحدث 4 معاملات فقط
    const recentTransactions = sortedTransactions.slice(0, 4);
    
    // تفريغ القائمة
    transactionsList.innerHTML = '';
    
    // إضافة المعاملات
    recentTransactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = `transaction-item ${transaction.type}`;
        
        let icon = '';
        switch (transaction.type) {
            case 'deposit':
                icon = '<i class="bx bx-plus-circle"></i>';
                break;
            case 'withdraw':
                icon = '<i class="bx bx-minus-circle"></i>';
                break;
            case 'profit':
                icon = '<i class="bx bx-dollar-circle"></i>';
                break;
            default:
                icon = '<i class="bx bx-transfer"></i>';
        }
        
        const amountClass = transaction.type === 'withdraw' ? 'negative' : 'positive';
        const amountSign = transaction.type === 'withdraw' ? '-' : '+';
        
        item.innerHTML = `
            <div class="transaction-icon">
                ${icon}
            </div>
            <div class="transaction-details">
                <h4>${getTransactionTitle(transaction.type)}</h4>
                <p>${formatDate(transaction.date)}</p>
            </div>
            <div class="transaction-amount ${amountClass}">
                ${amountSign}${formatCurrency(transaction.amount)}
            </div>
        `;
        
        transactionsList.appendChild(item);
    });
}

// تحديث محتوى الصفحة حسب الصفحة المعروضة
function updatePageContent(pageId) {
    switch (pageId) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'transactions':
            renderTransactionsPage();
            break;
        case 'profits':
            renderProfitsPage();
            break;
        case 'investments':
            renderInvestmentsPage();
            break;
        case 'withdrawal':
            renderWithdrawalPage();
            break;
        // إضافة المزيد من الصفحات حسب الحاجة
    }
}

// عرض صفحة المعاملات
function renderTransactionsPage() {
    const transactionsContainer = document.querySelector('#transactions-page .transactions-container');
    if (!transactionsContainer) return;
    
    // ترتيب المعاملات حسب التاريخ (الأحدث أولاً)
    const sortedTransactions = [...transactions].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // تفريغ القائمة
    transactionsContainer.innerHTML = '';
    
    // إضافة المعاملات
    sortedTransactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = `transaction-item ${transaction.type}`;
        
        let icon = '';
        switch (transaction.type) {
            case 'deposit':
                icon = '<i class="bx bx-plus-circle"></i>';
                break;
            case 'withdraw':
                icon = '<i class="bx bx-minus-circle"></i>';
                break;
            case 'profit':
                icon = '<i class="bx bx-dollar-circle"></i>';
                break;
            default:
                icon = '<i class="bx bx-transfer"></i>';
        }
        
        const amountClass = transaction.type === 'withdraw' ? 'negative' : 'positive';
        const amountSign = transaction.type === 'withdraw' ? '-' : '+';
        
        const date = new Date(transaction.date);
        
        item.innerHTML = `
            <div class="transaction-date">
                <div class="day">${date.getDate().toString().padStart(2, '0')}</div>
                <div class="month">${getMonthName(date.getMonth())}</div>
            </div>
            <div class="transaction-icon">
                ${icon}
            </div>
            <div class="transaction-details">
                <h4>${getTransactionTitle(transaction.type)}</h4>
                <p>${transaction.description}</p>
            </div>
            <div class="transaction-amount ${amountClass}">
                ${amountSign}${formatCurrency(transaction.amount)}
            </div>
        `;
        
        transactionsContainer.appendChild(item);
    });
}

// تصفية المعاملات حسب النوع
function filterTransactions(type) {
    const transactionsContainer = document.querySelector('#transactions-page .transactions-container');
    if (!transactionsContainer) return;
    
    // ترتيب المعاملات حسب التاريخ (الأحدث أولاً)
    const sortedTransactions = [...transactions].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // تصفية المعاملات حسب النوع
    const filteredTransactions = type === 'all' ? 
        sortedTransactions : 
        sortedTransactions.filter(t => t.type === type);
    
    // تفريغ القائمة
    transactionsContainer.innerHTML = '';
    
    if (filteredTransactions.length === 0) {
        transactionsContainer.innerHTML = `
            <div class="empty-state">
                <i class="bx bx-search"></i>
                <p>لا توجد معاملات من هذا النوع</p>
            </div>
        `;
        return;
    }
    
    // إضافة المعاملات المصفّاة
    filteredTransactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = `transaction-item ${transaction.type}`;
        
        let icon = '';
        switch (transaction.type) {
            case 'deposit':
                icon = '<i class="bx bx-plus-circle"></i>';
                break;
            case 'withdraw':
                icon = '<i class="bx bx-minus-circle"></i>';
                break;
            case 'profit':
                icon = '<i class="bx bx-dollar-circle"></i>';
                break;
            default:
                icon = '<i class="bx bx-transfer"></i>';
        }
        
        const amountClass = transaction.type === 'withdraw' ? 'negative' : 'positive';
        const amountSign = transaction.type === 'withdraw' ? '-' : '+';
        
        const date = new Date(transaction.date);
        
        item.innerHTML = `
            <div class="transaction-date">
                <div class="day">${date.getDate().toString().padStart(2, '0')}</div>
                <div class="month">${getMonthName(date.getMonth())}</div>
            </div>
            <div class="transaction-icon">
                ${icon}
            </div>
            <div class="transaction-details">
                <h4>${getTransactionTitle(transaction.type)}</h4>
                <p>${transaction.description}</p>
            </div>
            <div class="transaction-amount ${amountClass}">
                ${amountSign}${formatCurrency(transaction.amount)}
            </div>
        `;
        
        transactionsContainer.appendChild(item);
    });
}
// عرض صفحة الأرباح
function renderProfitsPage() {
    // تحديث ملخص الأرباح
    updateProfitSummary();
    
    // عرض جدول الأرباح
    renderProfitsTable();
    
    // تحديث مخطط توقعات الأرباح
    updateProfitProjections();
}

// تحديث ملخص الأرباح
function updateProfitSummary() {
    if (!currentInvestor || !profits) return;
    
    // حساب إجمالي الأرباح الشهرية
    const monthlyProfit = calculateMonthlyProfit(currentInvestor.totalInvestment, currentInvestor.profitRate);
    
    // حساب إجمالي الأرباح المتراكمة
    const totalProfits = calculateTotalReceivedProfits();
    
    // حساب النسبة المئوية من رأس المال
    const percentageOfCapital = (totalProfits / currentInvestor.initialInvestment) * 100;
    
    // حساب الربح اليومي المتوقع
    const dailyProfit = calculateDailyProfit(currentInvestor.totalInvestment, currentInvestor.profitRate);
    
    // تحديث العناصر في واجهة المستخدم
    const monthlyProfitElement = document.querySelector('.profit-summary .summary-card:nth-child(1) .summary-value');
    const totalProfitsElement = document.querySelector('.profit-summary .summary-card:nth-child(2) .summary-value');
    const percentageElement = document.querySelector('.profit-summary .summary-card:nth-child(2) .summary-percentage');
    const dailyProfitElement = document.querySelector('.profit-summary .summary-card:nth-child(3) .summary-value');
    
    if (monthlyProfitElement) {
        monthlyProfitElement.textContent = formatCurrency(monthlyProfit);
    }
    
    if (totalProfitsElement) {
        totalProfitsElement.textContent = formatCurrency(totalProfits);
    }
    
    if (percentageElement) {
        percentageElement.textContent = `${percentageOfCapital.toFixed(1)}% من رأس المال`;
    }
    
    if (dailyProfitElement) {
        dailyProfitElement.textContent = formatCurrency(dailyProfit);
    }
}

// عرض جدول الأرباح
function renderProfitsTable() {
    const profitTable = document.querySelector('.profit-table tbody');
    if (!profitTable || !profits) return;
    
    // ترتيب الأرباح حسب التاريخ (الأحدث أولاً)
    const sortedProfits = [...profits].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // تفريغ الجدول
    profitTable.innerHTML = '';
    
    // إضافة الأرباح
    sortedProfits.forEach(profit => {
        const row = document.createElement('tr');
        
        // الحصول على الاستثمار المرتبط
        const investment = investments.find(inv => inv.id === profit.investmentId);
        
        const date = new Date(profit.date);
        const month = getMonthName(date.getMonth());
        const year = date.getFullYear();
        
        row.innerHTML = `
            <td>${month} ${year}</td>
            <td>${formatCurrency(investment ? investment.amount : 0)}</td>
            <td>${investment ? investment.profitRate : currentInvestor.profitRate}%</td>
            <td>${formatCurrency(profit.amount)}</td>
            <td>${formatDate(profit.date)}</td>
            <td><span class="status ${profit.status === 'paid' ? 'completed' : 'pending'}">${profit.status === 'paid' ? 'تم الدفع' : 'قيد الانتظار'}</span></td>
        `;
        
        profitTable.appendChild(row);
    });
}

// تحديث مخطط توقعات الأرباح
function updateProfitProjections() {
    const projectionChart = document.getElementById('projection-chart');
    if (!projectionChart || !currentInvestor) return;
    
    // حساب توقعات الأرباح للأشهر الستة المقبلة
    const sixMonthsProjection = calculateProfitProjection(6);
    
    // حساب توقعات الأرباح للعام المقبل
    const yearlyProjection = calculateProfitProjection(12);
    
    // تحديث العناصر في واجهة المستخدم
    const sixMonthsElement = document.querySelector('.projection-info .info-card:nth-child(1) .value');
    const yearlyElement = document.querySelector('.projection-info .info-card:nth-child(2) .value');
    
    if (sixMonthsElement) {
        sixMonthsElement.textContent = formatCurrency(sixMonthsProjection);
    }
    
    if (yearlyElement) {
        yearlyElement.textContent = formatCurrency(yearlyProjection);
    }
    
    // تهيئة مخطط التوقعات إذا كان ApexCharts متاحًا
    if (window.ApexCharts) {
        const projectionOptions = {
            series: [{
                name: 'الأرباح المتوقعة',
                data: generateProjectionData()
            }],
            chart: {
                type: 'area',
                height: 300,
                fontFamily: 'Tajawal, sans-serif',
                toolbar: {
                    show: false
                },
                zoom: {
                    enabled: false
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            colors: ['#3b82f6'],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.2,
                    stops: [0, 90, 100]
                }
            },
            xaxis: {
                categories: generateMonthLabels(12),
                labels: {
                    style: {
                        colors: Array(12).fill('#64748b'),
                        fontFamily: 'Tajawal, sans-serif'
                    }
                }
            },
            yaxis: {
                labels: {
                    formatter: function(val) {
                        return formatCurrency(val, false);
                    },
                    style: {
                        colors: ['#64748b'],
                        fontFamily: 'Tajawal, sans-serif'
                    }
                }
            },
            tooltip: {
                x: {
                    format: 'MM/yyyy'
                },
                y: {
                    formatter: function(val) {
                        return formatCurrency(val);
                    }
                }
            },
            theme: {
                mode: darkMode ? 'dark' : 'light'
            }
        };
        
        // تدمير المخطط السابق إذا كان موجودًا
        if (window.projectionChartInstance) {
            window.projectionChartInstance.destroy();
        }
        
        // إنشاء مخطط جديد
        window.projectionChartInstance = new ApexCharts(projectionChart, projectionOptions);
        window.projectionChartInstance.render();
    }
}

// عرض صفحة الاستثمارات
function renderInvestmentsPage() {
    // عرض الاستثمارات الحالية
    renderCurrentInvestments();
    
    // عرض خطط الاستثمار المتاحة
    renderInvestmentPlans();
}

// عرض الاستثمارات الحالية
function renderCurrentInvestments() {
    const investmentsContainer = document.querySelector('.investments-container');
    if (!investmentsContainer || !investments) return;
    
    // تفريغ القائمة
    investmentsContainer.innerHTML = '';
    
    // إضافة الاستثمارات
    investments.forEach(investment => {
        const card = document.createElement('div');
        card.className = `investment-card ${investment.status}`;
        
        // حساب نسبة الأرباح المستلمة
        const totalProfits = profits
            .filter(p => p.investmentId === investment.id && p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);
        
        const profitPercentage = (totalProfits / investment.amount) * 100;
        
        card.innerHTML = `
            <div class="investment-header">
                <div class="investment-title">${getInvestmentTypeName(investment.type)}</div>
                <div class="investment-badge">${investment.status === 'active' ? 'نشط' : 'مكتمل'}</div>
            </div>
            
            <div class="investment-body">
                <div class="investment-amount">${formatCurrency(investment.amount)}</div>
                <div class="investment-info">
                    <div class="info-row">
                        <span class="info-label">تاريخ البدء</span>
                        <span class="info-value">${formatDate(investment.startDate)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">${investment.status === 'completed' ? 'تاريخ الانتهاء' : 'المدة'}</span>
                        <span class="info-value">${investment.status === 'completed' ? formatDate(investment.endDate) : getDurationText(investment.duration)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">نسبة العائد</span>
                        <span class="info-value">${investment.profitRate}% شهريًا</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">الحالة</span>
                        <span class="info-value status-${investment.status}">${investment.status === 'active' ? 'نشط' : 'مكتمل'}</span>
                    </div>
                </div>
            </div>
            
            <div class="investment-progress">
                <div class="progress-label">${investment.status === 'active' ? 'الأرباح المستلمة' : 'العائد الإجمالي'}</div>
                <div class="progress-bar">
                    <div class="progress-fill ${investment.status}" style="width: ${profitPercentage.toFixed(1)}%;"></div>
                </div>
                <div class="progress-value">${profitPercentage.toFixed(1)}% (${formatCurrency(totalProfits)})</div>
            </div>
            
            <div class="investment-actions">
                ${investment.status === 'active' ? `
                    <button class="action-btn" data-action="increase" data-id="${investment.id}">
                        <i class="bx bx-plus-circle"></i>
                        <span>زيادة</span>
                    </button>
                    <button class="action-btn" data-action="withdraw" data-id="${investment.id}">
                        <i class="bx bx-money-withdraw"></i>
                        <span>سحب</span>
                    </button>
                    <button class="action-btn" data-action="analyze" data-id="${investment.id}">
                        <i class="bx bx-chart"></i>
                        <span>تحليل</span>
                    </button>
                ` : `
                    <button class="action-btn" data-action="report" data-id="${investment.id}">
                        <i class="bx bx-file"></i>
                        <span>التقرير</span>
                    </button>
                    <button class="action-btn" data-action="reinvest" data-id="${investment.id}">
                        <i class="bx bx-repeat"></i>
                        <span>استثمار مجدد</span>
                    </button>
                `}
            </div>
        `;
        
        investmentsContainer.appendChild(card);
        
        // إضافة مستمعات الأحداث للأزرار
        const actionButtons = card.querySelectorAll('.action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', handleInvestmentAction);
        });
    });
}

// عرض خطط الاستثمار المتاحة
function renderInvestmentPlans() {
    // هذه الدالة يمكن تنفيذها لعرض خطط الاستثمار المتاحة
    // يمكن استدعاء API للحصول على الخطط المتاحة من النظام الرئيسي
}

// عرض صفحة طلب السحب
function renderWithdrawalPage() {
    if (!currentInvestor) return;
    
    // تحديث الرصيد المتاح للسحب
    const balanceAmount = document.querySelector('.available-balance .balance-amount');
    if (balanceAmount) {
        balanceAmount.textContent = formatCurrency(currentInvestor.totalInvestment);
    }
    
    // تحديث الحد الأقصى للسحب في النموذج
    const withdrawalAmount = document.getElementById('withdrawal-amount');
    if (withdrawalAmount) {
        withdrawalAmount.max = currentInvestor.totalInvestment;
    }
    
    // عرض تاريخ طلبات السحب السابقة
    renderWithdrawalHistory();
}

// عرض تاريخ طلبات السحب السابقة
function renderWithdrawalHistory() {
    const historyTable = document.querySelector('.withdrawal-history tbody');
    if (!historyTable) return;
    
    // الحصول على عمليات السحب من قائمة المعاملات
    const withdrawals = transactions.filter(t => t.type === 'withdraw');
    
    // ترتيب عمليات السحب حسب التاريخ (الأحدث أولاً)
    const sortedWithdrawals = [...withdrawals].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // تفريغ الجدول
    historyTable.innerHTML = '';
    
    if (sortedWithdrawals.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="text-center">لا توجد طلبات سحب سابقة</td>';
        historyTable.appendChild(row);
        return;
    }
    
    // إضافة عمليات السحب
    sortedWithdrawals.forEach(withdrawal => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(withdrawal.date)}</td>
            <td>${formatCurrency(withdrawal.amount)}</td>
            <td>نقدًا</td>
            <td><span class="status completed">تم الاستلام</span></td>
        `;
        historyTable.appendChild(row);
    });
}

// تهيئة الرسوم البيانية
function initCharts() {
    // تهيئة مخطط نمو الأرباح
    initProfitChart();
}

// تهيئة مخطط نمو الأرباح
function initProfitChart() {
    const profitChart = document.getElementById('profit-chart');
    if (!profitChart || !window.ApexCharts) return;
    
    const options = {
        series: [{
            name: 'الربح الشهري',
            data: getProfitData()
        }],
        chart: {
            type: 'area',
            height: 300,
            fontFamily: 'Tajawal, sans-serif',
            toolbar: {
                show: false
            },
            zoom: {
                enabled: false
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        colors: ['#3b82f6'],
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.2,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: getProfitMonths(),
            labels: {
                style: {
                    colors: Array(6).fill('#64748b'),
                    fontFamily: 'Tajawal, sans-serif'
                }
            }
        },
        yaxis: {
            labels: {
                formatter: function(val) {
                    return formatCurrency(val, false);
                },
                style: {
                    colors: ['#64748b'],
                    fontFamily: 'Tajawal, sans-serif'
                }
            }
        },
        tooltip: {
            x: {
                format: 'MM/yyyy'
            },
            y: {
                formatter: function(val) {
                    return formatCurrency(val);
                }
            }
        },
        theme: {
            mode: darkMode ? 'dark' : 'light'
        }
    };
    
    // إنشاء المخطط
    const chart = new ApexCharts(profitChart, options);
    chart.render();
    
    // تخزين مرجع للمخطط
    window.profitChartInstance = chart;
}

// تحديث فترة الرسم البياني
function updateChartPeriod(period) {
    if (!window.profitChartInstance) return;
    
    let data = [];
    let categories = [];
    
    switch(period) {
        case 'أسبوعي':
            data = getProfitData('weekly');
            categories = getProfitMonths('weekly');
            break;
        case 'شهري':
            data = getProfitData('monthly');
            categories = getProfitMonths('monthly');
            break;
        case 'سنوي':
            data = getProfitData('yearly');
            categories = getProfitMonths('yearly');
            break;
        default:
            data = getProfitData();
            categories = getProfitMonths();
    }
    
    window.profitChartInstance.updateOptions({
        xaxis: {
            categories: categories
        },
        series: [{
            data: data
        }]
    });
}

// تحديث سمة الرسوم البيانية
function updateChartsTheme() {
    if (window.profitChartInstance) {
        window.profitChartInstance.updateOptions({
            theme: {
                mode: darkMode ? 'dark' : 'light'
            }
        });
    }
    
    if (window.projectionChartInstance) {
        window.projectionChartInstance.updateOptions({
            theme: {
                mode: darkMode ? 'dark' : 'light'
            }
        });
    }
}

// إظهار النوافذ المنبثقة
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

// فتح نافذة تأكيد السحب
function openWithdrawalConfirmation(amount, method) {
    const modal = document.getElementById('withdrawal-confirmation-modal');
    if (!modal) return;
    
    // تحديث بيانات النافذة
    const amountDisplay = modal.querySelector('.amount-display');
    const methodDisplay = modal.querySelector('.detail-value:nth-of-type(2)');
    const dateDisplay = modal.querySelector('.detail-value:nth-of-type(3)');
    const lostProfitsDisplay = modal.querySelector('.detail-row.negative .detail-value');
    
    if (amountDisplay) {
        amountDisplay.textContent = formatCurrency(amount);
    }
    
    if (methodDisplay) {
        methodDisplay.textContent = getWithdrawalMethodName(method);
    }
    
    if (dateDisplay) {
        dateDisplay.textContent = formatDate(new Date().toISOString());
    }
    
    if (lostProfitsDisplay) {
        // حساب الأرباح المفقودة بسبب السحب
        const lostProfits = calculateLostProfits(amount, currentInvestor.profitRate);
        lostProfitsDisplay.textContent = formatCurrency(lostProfits);
    }
    
    // فتح النافذة
    modal.classList.add('active');
}

// تأكيد طلب السحب
function confirmWithdrawal() {
    // الحصول على البيانات من النافذة
    const modal = document.getElementById('withdrawal-confirmation-modal');
    if (!modal) return;
    
    const amountDisplay = modal.querySelector('.amount-display');
    if (!amountDisplay) return;
    
    // استخراج المبلغ من النص
    const amountText = amountDisplay.textContent;
    const amount = parseFloat(amountText.replace(/[^\d.]/g, ''));
    
    if (isNaN(amount) || amount <= 0) {
        showAlert('حدث خطأ في معالجة طلب السحب. يرجى المحاولة مرة أخرى.', 'error');
        return;
    }
    
    // إرسال طلب السحب إلى النظام الرئيسي
    sendWithdrawalRequest(amount)
        .then(() => {
            // إغلاق النافذة
            modal.classList.remove('active');
            
            // عرض إشعار نجاح
            showAlert('تم إرسال طلب السحب بنجاح. سيتم معالجته في أقرب وقت ممكن.', 'success');
            
            // تحديث البيانات
            updateWithdrawalData(amount);
            
            // العودة إلى صفحة لوحة التحكم
            changePage('dashboard');
        })
        .catch(error => {
            console.error('خطأ في إرسال طلب السحب:', error);
            showAlert('حدث خطأ أثناء إرسال طلب السحب. يرجى المحاولة مرة أخرى.', 'error');
        });
}

// إرسال طلب السحب إلى النظام الرئيسي
async function sendWithdrawalRequest(amount) {
    try {
        // محاكاة الاتصال بالخادم
        await simulateLoading(1500);
        
        // في الواقع، هنا ستكون هناك استدعاءات للخادم الرئيسي لإرسال طلب السحب
        console.log(`إرسال طلب سحب بمبلغ ${amount}`);
        
        return true;
    } catch (error) {
        console.error('خطأ في إرسال طلب السحب:', error);
        throw error;
    }
}

// تحديث بيانات السحب
function updateWithdrawalData(amount) {
    // إضافة عملية سحب جديدة
    const newWithdrawal = {
        id: `TXN${Date.now()}`,
        type: 'withdraw',
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        description: 'سحب',
        status: 'completed'
    };
    
    // إضافة العملية إلى قائمة المعاملات
    transactions.unshift(newWithdrawal);
    
    // تحديث إجمالي الاستثمار
    currentInvestor.totalInvestment -= amount;
    
    // تحديث واجهة المستخدم
    updateUserInterface();
}

// معالجة إجراءات الاستثمار
function handleInvestmentAction(event) {
    const action = this.getAttribute('data-action');
    const investmentId = this.getAttribute('data-id');
    
    if (!action || !investmentId) return;
    
    switch (action) {
        case 'increase':
            // زيادة الاستثمار
            openModal('add-investment-modal');
            break;
            
        case 'withdraw':
            // سحب من الاستثمار
            changePage('withdrawal');
            break;
            
        case 'analyze':
            // تحليل الاستثمار
            showAlert('جاري تطوير هذه الميزة حاليًا', 'info');
            break;
            
        case 'report':
            // عرض تقرير الاستثمار
            showAlert('جاري تطوير هذه الميزة حاليًا', 'info');
            break;
            
        case 'reinvest':
            // إعادة استثمار
            openModal('add-investment-modal');
            break;
    }
}

// تحديث ملخص الاستثمار الجديد
function updateInvestmentSummary() {
    const investmentPlan = document.getElementById('investment-plan');
    const investmentAmount = document.getElementById('investment-amount');
    const investmentDuration = document.getElementById('investment-duration');
    
    if (!investmentPlan || !investmentAmount || !investmentDuration) return;
    
    const planValue = investmentPlan.value;
    const amountValue = parseFloat(investmentAmount.value) || 0;
    const durationValue = investmentDuration.value;
    
    // الحصول على نسبة الربح حسب الخطة
    let profitRate = 0;
    switch (planValue) {
        case 'standard':
            profitRate = 17.5;
            break;
        case 'short':
            profitRate = 15;
            break;
        case 'long':
            profitRate = 20;
            break;
    }
    
    // حساب الربح الشهري المتوقع
    const monthlyProfit = (amountValue * profitRate) / 100;
    
    // حساب إجمالي الربح المتوقع حسب المدة
    let totalProfit = 0;
    if (durationValue === 'open') {
        totalProfit = monthlyProfit * 12; // حساب لمدة سنة كمثال
    } else {
        totalProfit = monthlyProfit * parseInt(durationValue);
    }
    
    // تحديث ملخص الاستثمار
    const summaryAmount = document.getElementById('summary-amount');
    const summaryRate = document.getElementById('summary-rate');
    const summaryMonthly = document.getElementById('summary-monthly');
    const summaryTotal = document.getElementById('summary-total');
    
    if (summaryAmount) {
        summaryAmount.textContent = formatCurrency(amountValue);
    }
    
    if (summaryRate) {
        summaryRate.textContent = profitRate > 0 ? `${profitRate}%` : '-';
    }
    
    if (summaryMonthly) {
        summaryMonthly.textContent = formatCurrency(monthlyProfit);
    }
    
    if (summaryTotal) {
        summaryTotal.textContent = formatCurrency(totalProfit);
    }
    
    // تحديث المبلغ الأدنى المطلوب
    const minAmount = document.getElementById('min-amount');
    if (minAmount && planValue) {
        let minAmountValue = 0;
        switch (planValue) {
            case 'standard':
                minAmountValue = 10000;
                break;
            case 'short':
                minAmountValue = 5000;
                break;
            case 'long':
                minAmountValue = 25000;
                break;
        }
        
        minAmount.textContent = formatCurrency(minAmountValue, false);
        
        // تحديث الحد الأدنى في حقل الإدخال
        investmentAmount.min = minAmountValue;
    }
}

// إرسال استثمار جديد
function submitNewInvestment() {
    const investmentPlan = document.getElementById('investment-plan');
    const investmentAmount = document.getElementById('investment-amount');
    const investmentDuration = document.getElementById('investment-duration');
    const depositMethod = document.getElementById('deposit-method');
    
    if (!investmentPlan || !investmentAmount || !investmentDuration || !depositMethod) return;
    
    const planValue = investmentPlan.value;
    const amountValue = parseFloat(investmentAmount.value) || 0;
    const durationValue = investmentDuration.value;
    const methodValue = depositMethod.value;
    
    if (!planValue) {
        showAlert('يرجى اختيار خطة الاستثمار', 'error');
        return;
    }
    
    // الحصول على الحد الأدنى للخطة
    let minAmount = 0;
    switch (planValue) {
        case 'standard':
            minAmount = 10000;
            break;
        case 'short':
            minAmount = 5000;
            break;
        case 'long':
            minAmount = 25000;
            break;
    }
    
    if (amountValue < minAmount) {
        showAlert(`المبلغ المدخل أقل من الحد الأدنى (${formatCurrency(minAmount)})`, 'error');
        return;
    }
    
    // إرسال طلب الاستثمار إلى النظام الرئيسي
    sendInvestmentRequest(planValue, amountValue, durationValue, methodValue)
        .then(() => {
            // إغلاق النافذة
            document.getElementById('add-investment-modal').classList.remove('active');
            
            // عرض إشعار نجاح
            showAlert('تم إرسال طلب الاستثمار بنجاح. سيتم معالجته في أقرب وقت ممكن.', 'success');
            
            // تحديث البيانات
            updateInvestmentData(planValue, amountValue, durationValue);
            
            // العودة إلى صفحة الاستثمارات
            changePage('investments');
        })
        .catch(error => {
            console.error('خطأ في إرسال طلب الاستثمار:', error);
            showAlert('حدث خطأ أثناء إرسال طلب الاستثمار. يرجى المحاولة مرة أخرى.', 'error');
        });
}

// إرسال طلب استثمار جديد إلى النظام الرئيسي
async function sendInvestmentRequest(plan, amount, duration, method) {
    try {
        // محاكاة الاتصال بالخادم
        await simulateLoading(1500);
        
        // في الواقع، هنا ستكون هناك استدعاءات للخادم الرئيسي لإرسال طلب الاستثمار
        console.log(`إرسال طلب استثمار: خطة=${plan}, مبلغ=${amount}, مدة=${duration}, طريقة=${method}`);
        
        return true;
    } catch (error) {
        console.error('خطأ في إرسال طلب الاستثمار:', error);
        throw error;
    }
}

// تحديث بيانات الاستثمار
function updateInvestmentData(plan, amount, duration) {
    // الحصول على نسبة الربح حسب الخطة
    let profitRate = 0;
    switch (plan) {
        case 'standard':
            profitRate = 17.5;
            break;
        case 'short':
            profitRate = 15;
            break;
        case 'long':
            profitRate = 20;
            break;
    }
    
    // إضافة استثمار جديد
    const newInvestment = {
        id: `INV${Date.now()}`,
        type: plan,
        amount: amount,
        startDate: new Date().toISOString().split('T')[0],
        profitRate: profitRate,
        status: 'active',
        duration: duration
    };
    
    // إضافة الاستثمار إلى قائمة الاستثمارات
    investments.push(newInvestment);
    
    // إضافة عملية إيداع جديدة
    const newDeposit = {
        id: `TXN${Date.now()}`,
        type: 'deposit',
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        description: 'إيداع جديد',
        status: 'completed'
    };
    
    // إضافة العملية إلى قائمة المعاملات
    transactions.unshift(newDeposit);
    
    // تحديث إجمالي الاستثمار
    currentInvestor.totalInvestment += amount;
    
    // تحديث واجهة المستخدم
    updateUserInterface();
}

// تحديث عدد الإشعارات غير المقروءة
function updateNotificationCount() {
    const badge = document.querySelector('.notification-count');
    if (!badge || !notifications) return;
    
    // حساب عدد الإشعارات غير المقروءة
    const unreadCount = notifications.filter(n => !n.read).length;
    
    // تحديث العدد
    badge.textContent = unreadCount;
    
    // إخفاء الشارة إذا لم يكن هناك إشعارات غير مقروءة
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
}

// تحديث قائمة الإشعارات
function updateNotificationsList() {
    const notificationsList = document.querySelector('.notifications-list');
    if (!notificationsList || !notifications) return;
    
    // ترتيب الإشعارات حسب التاريخ (الأحدث أولاً)
    const sortedNotifications = [...notifications].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // تفريغ القائمة
    notificationsList.innerHTML = '';
    
    if (sortedNotifications.length === 0) {
        notificationsList.innerHTML = `
            <div class="empty-state">
                <i class="bx bx-bell-off"></i>
                <p>لا توجد إشعارات حاليًا</p>
            </div>
        `;
        return;
    }
    
    // إضافة الإشعارات
    sortedNotifications.forEach(notification => {
        const item = document.createElement('div');
        item.className = `notification-item ${notification.read ? '' : 'unread'}`;
        
        let icon = '';
        switch (notification.type) {
            case 'profit':
                icon = '<i class="bx bx-dollar-circle"></i>';
                break;
            case 'transaction':
                icon = '<i class="bx bx-transfer"></i>';
                break;
            case 'system':
                icon = '<i class="bx bx-bell"></i>';
                break;
            default:
                icon = '<i class="bx bx-bell"></i>';
        }
        
        item.innerHTML = `
            <div class="notification-icon ${notification.type}">
                ${icon}
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                <div class="notification-time">${formatTimeAgo(notification.date)}</div>
            </div>
        `;
        
        notificationsList.appendChild(item);
        
        // إضافة مستمع الحدث للنقر
        item.addEventListener('click', function() {
            markNotificationAsRead(notification.id);
        });
    });
}

// تعيين الإشعار كمقروء
function markNotificationAsRead(id) {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;
    
    // تعيين الإشعار كمقروء
    notification.read = true;
    
    // تحديث واجهة المستخدم
    updateNotificationCount();
    updateNotificationsList();
}

// تعيين جميع الإشعارات كمقروءة
function markAllNotificationsAsRead() {
    if (!notifications) return;
    
    // تعيين جميع الإشعارات كمقروءة
    notifications.forEach(n => {
        n.read = true;
    });
    
    // تحديث واجهة المستخدم
    updateNotificationCount();
    updateNotificationsList();
    
    // عرض إشعار نجاح
    showAlert('تم تعيين جميع الإشعارات كمقروءة', 'success');
}

// ==== دوال مساعدة ====

// محاكاة الانتظار (للاتصال بالخادم)
function simulateLoading(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// حساب الربح الشهري
function calculateMonthlyProfit(amount, rate) {
    return (amount * rate) / 100;
}

// حساب الربح اليومي
function calculateDailyProfit(amount, rate) {
    return ((amount * rate) / 100) / 30;
}

// حساب مدة الاستثمار بالأيام
function calculateInvestmentDuration(startDate) {
    const start = new Date(startDate);
    const now = new Date();
    
    // حساب الفرق بالأيام
    const diffTime = Math.abs(now - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

// حساب إجمالي الأرباح المستلمة
function calculateTotalReceivedProfits() {
    if (!profits) return 0;
    
    return profits
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
}

// حساب تاريخ الدفع القادم
function calculateNextPaymentDate() {
    if (!profits) return '';
    
    // البحث عن الربح الذي لم يتم دفعه بعد
    const pendingProfit = profits.find(p => p.status === 'pending');
    
    if (pendingProfit) {
        return pendingProfit.date;
    }
    
    // إذا لم يوجد ربح قيد الانتظار، نحسب التاريخ القادم
    // استنادًا إلى آخر ربح تم دفعه
    const paidProfits = profits.filter(p => p.status === 'paid');
    
    if (paidProfits.length > 0) {
        const lastProfitDate = new Date(paidProfits[0].date);
        lastProfitDate.setMonth(lastProfitDate.getMonth() + 1);
        return lastProfitDate.toISOString().split('T')[0];
    }
    
    return '';
}

// حساب الأرباح المفقودة بسبب السحب
function calculateLostProfits(amount, rate) {
    return (amount * rate) / 100;
}

// حساب توقعات الأرباح
function calculateProfitProjection(months) {
    if (!currentInvestor) return 0;
    
    const monthlyProfit = calculateMonthlyProfit(currentInvestor.totalInvestment, currentInvestor.profitRate);
    return monthlyProfit * months;
}

// إنشاء بيانات لمخطط التوقعات
function generateProjectionData() {
    const data = [];
    
    // إنشاء بيانات للأشهر الـ 12 القادمة
    let cumulativeProfit = 0;
    
    for (let i = 1; i <= 12; i++) {
        const monthlyProfit = calculateMonthlyProfit(currentInvestor.totalInvestment, currentInvestor.profitRate);
        cumulativeProfit += monthlyProfit;
        data.push(cumulativeProfit);
    }
    
    return data;
}

// إنشاء تسميات الأشهر
function generateMonthLabels(count = 6) {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
        const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthName = getMonthName(month.getMonth());
        const year = month.getFullYear();
        months.push(`${monthName} ${year}`);
    }
    
    return months;
}

// الحصول على اسم الشهر
function getMonthName(monthIndex) {
    const months = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    return months[monthIndex];
}

// الحصول على بيانات الأرباح للرسم البياني
function getProfitData(period = 'monthly') {
    // استنادًا إلى الفترة المحددة، نقوم بإنشاء بيانات مختلفة
    const data = [];
    
    if (!profits) return data;
    
    // ترتيب الأرباح حسب التاريخ (الأقدم أولاً)
    const sortedProfits = [...profits].sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
    });
    
    // في الواقع، هنا نقوم بتجميع الأرباح حسب الفترة
    // لكن لغرض العرض، سنستخدم قيمًا عشوائية
    switch (period) {
        case 'weekly':
            // بيانات أسبوعية
            for (let i = 0; i < 6; i++) {
                data.push(1500 + Math.floor(Math.random() * 1000));
            }
            break;
            
        case 'yearly':
            // بيانات سنوية
            for (let i = 0; i < 6; i++) {
                data.push(40000 + Math.floor(Math.random() * 10000));
            }
            break;
            
        case 'monthly':
        default:
            // بيانات شهرية (استخدام الأرباح الفعلية)
            sortedProfits.forEach(profit => {
                data.push(profit.amount);
            });
            
            // إضافة قيم متوقعة إذا كان عدد الأرباح أقل من 6
            while (data.length < 6) {
                const lastProfit = sortedProfits[sortedProfits.length - 1];
                const expectedProfit = lastProfit ? lastProfit.amount : 8750;
                data.push(expectedProfit);
            }
    }
    
    return data;
}

// الحصول على تسميات الأشهر للرسم البياني
function getProfitMonths(period = 'monthly') {
    const months = [];
    const now = new Date();
    
    let count;
    let step;
    
    switch (period) {
        case 'weekly':
            count = 6;
            step = 7; // أيام
            for (let i = 0; i < count; i++) {
                const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (count - i - 1) * step);
                const monthName = getMonthName(date.getMonth()).substring(0, 3);
                const day = date.getDate();
                months.push(`${day} ${monthName}`);
            }
            break;
            
        case 'yearly':
            count = 6;
            step = 1; // سنوات
            for (let i = 0; i < count; i++) {
                const year = now.getFullYear() - (count - i - 1);
                months.push(year.toString());
            }
            break;
            
        case 'monthly':
        default:
            count = 6;
            step = 1; // أشهر
            for (let i = 0; i < count; i++) {
                const date = new Date(now.getFullYear(), now.getMonth() - (count - i - 1), 1);
                const monthName = getMonthName(date.getMonth());
                const year = date.getFullYear();
                months.push(`${monthName} ${year}`);
            }
    }
    
    return months;
}

// تنسيق المبالغ المالية
function formatCurrency(amount, withCurrency = true) {
    if (isNaN(amount)) return '0 دينار';
    
    // تنسيق المبلغ بالفواصل
    const formattedAmount = amount.toLocaleString('ar-SA');
    
    // إضافة العملة إذا كان مطلوبًا
    return withCurrency ? `${formattedAmount} دينار` : formattedAmount;
}

// تنسيق التاريخ
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // تنسيق التاريخ بالطريقة العربية
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '/');
}

// تنسيق الوقت المنقضي
function formatTimeAgo(date) {
    if (!date) return '';
    
    const now = new Date();
    const diff = now - new Date(date);
    
    // تحويل الفرق إلى ثوانٍ
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
        return 'منذ لحظات';
    }
    
    // تحويل الفرق إلى دقائق
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 60) {
        return `منذ ${minutes} دقيقة`;
    }
    
    // تحويل الفرق إلى ساعات
    const hours = Math.floor(minutes / 60);
    
    if (hours < 24) {
        return `منذ ${hours} ساعة`;
    }
    
    // تحويل الفرق إلى أيام
    const days = Math.floor(hours / 24);
    
    if (days < 30) {
        return `منذ ${days} يوم`;
    }
    
    // تحويل الفرق إلى أشهر
    const months = Math.floor(days / 30);
    
    if (months < 12) {
        return `منذ ${months} شهر`;
    }
    
    // تحويل الفرق إلى سنوات
    const years = Math.floor(months / 12);
    
    return `منذ ${years} سنة`;
}

// الحصول على عنوان نوع المعاملة
function getTransactionTitle(type) {
    switch (type) {
        case 'deposit':
            return 'إيداع';
        case 'withdraw':
            return 'سحب';
        case 'profit':
            return 'استلام أرباح';
        default:
            return 'عملية';
    }
}

// الحصول على اسم نوع الاستثمار
function getInvestmentTypeName(type) {
    switch (type) {
        case 'standard':
            return 'خطة استثمار قياسية';
        case 'short':
            return 'استثمار قصير الأجل';
        case 'long':
            return 'استثمار طويل الأجل';
        default:
            return 'استثمار';
    }
}

// الحصول على نص المدة
function getDurationText(duration) {
    if (duration === 'open') {
        return 'غير محدودة';
    }
    
    const months = parseInt(duration);
    return `${months} أشهر`;
}

// الحصول على اسم طريقة السحب
function getWithdrawalMethodName(method) {
    switch (method) {
        case 'cash':
            return 'نقدًا في المقر';
        case 'bank':
            return 'تحويل بنكي';
        case 'wallet':
            return 'محفظة إلكترونية';
        default:
            return 'أخرى';
    }
}

// عرض إشعار للمستخدم
function showAlert(message, type = 'info') {
    // إنشاء عنصر الإشعار
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    // إضافة أيقونة حسب النوع
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="bx bx-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="bx bx-error-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="bx bx-error"></i>';
            break;
        default:
            icon = '<i class="bx bx-info-circle"></i>';
    }
    
    // إضافة المحتوى
    alert.innerHTML = `
        <div class="alert-content">
            <div class="alert-icon">
                ${icon}
            </div>
            <div class="alert-message">
                ${message}
            </div>
        </div>
        <button class="alert-close">
            <i class="bx bx-x"></i>
        </button>
    `;
    
    // إضافة الإشعار إلى الصفحة
    document.body.appendChild(alert);
    
    // إظهار الإشعار
    setTimeout(() => {
        alert.classList.add('show');
    }, 10);
    
    // إخفاء الإشعار بعد فترة
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(alert);
        }, 300);
    }, 5000);
    
    // إضافة مستمع الحدث لزر الإغلاق
    const closeButton = alert.querySelector('.alert-close');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            alert.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(alert);
            }, 300);
        });
    }
}
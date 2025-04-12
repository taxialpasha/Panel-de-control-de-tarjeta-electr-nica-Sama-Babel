/**
 * ملف app.js - المسؤول عن تهيئة التطبيق والتعامل مع واجهة المستخدم.
 */

// المتغيرات العامة
let currentPage = 'dashboard-page';
const settings = {
    storeName: 'متجر الكاشير',
    storePhone: '07XXXXXXXXX',
    storeAddress: 'بغداد - العراق',
    invoiceMessage: 'شكراً لتسوقك معنا! نتمنى لك يوماً سعيداً.',
    defaultTax: 0,
    defaultInterest: 4,
    stockAlert: 5
};

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    // استرجاع الإعدادات المحفوظة
    loadSettings();
    
    // تهيئة عناصر واجهة المستخدم
    initUI();
    
    // تهيئة الأحداث
    initEvents();
    
    // تحديث لوحة التحكم
    updateDashboard();
    
    // تحديث التاريخ والوقت بشكل دوري
    updateDateTime();
    setInterval(updateDateTime, 60000);
});

/**
 * تهيئة عناصر واجهة المستخدم
 */
function initUI() {
    // إخفاء جميع الصفحات وإظهار الصفحة الحالية
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(currentPage).classList.add('active');
    
    // تحديد العنصر النشط في شريط التنقل
    document.querySelectorAll('.bottom-nav li').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === currentPage) {
            item.classList.add('active');
        }
    });
    
    // تهيئة فلتر التاريخ للتقارير
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    if (document.getElementById('start-date')) {
        document.getElementById('start-date').value = formattedDate;
        document.getElementById('end-date').value = formattedDate;
    }
    
    if (document.getElementById('daily-date')) {
        document.getElementById('daily-date').value = formattedDate;
    }
    
    if (document.getElementById('payment-date')) {
        document.getElementById('payment-date').value = formattedDate;
    }
    
    // تهيئة صفحة الإعدادات
    if (document.getElementById('store-name')) {
        document.getElementById('store-name').value = settings.storeName;
        document.getElementById('store-phone').value = settings.storePhone;
        document.getElementById('store-address').value = settings.storeAddress;
        document.getElementById('invoice-message').value = settings.invoiceMessage;
        document.getElementById('default-tax').value = settings.defaultTax;
        document.getElementById('default-interest').value = settings.defaultInterest;
        document.getElementById('stock-alert').value = settings.stockAlert;
    }
}

/**
 * تهيئة الأحداث
 */
function initEvents() {
    // أحداث التنقل بين الصفحات
    document.querySelectorAll('.bottom-nav li').forEach(item => {
        item.addEventListener('click', () => {
            currentPage = item.getAttribute('data-page');
            initUI();
            
            // تنفيذ إجراءات خاصة بالصفحة عند الانتقال إليها
            if (currentPage === 'products-page') {
                loadProducts();
                loadCategories();
            } else if (currentPage === 'sales-page') {
                initSalesPage();
            } else if (currentPage === 'installments-page') {
                loadInstallments();
            } else if (currentPage === 'reports-page') {
                initReportsPage();
            } else if (currentPage === 'daily-page') {
                loadDailyTransactions();
            } else if (currentPage === 'dashboard-page') {
                updateDashboard();
            }
        });
    });
    
    // أحداث صفحة المنتجات
    if (document.getElementById('add-product-btn')) {
        document.getElementById('add-product-btn').addEventListener('click', () => {
            openProductModal();
        });
    }
    
    if (document.getElementById('add-category-btn')) {
        document.getElementById('add-category-btn').addEventListener('click', () => {
            openCategoryModal();
        });
    }
    
    if (document.getElementById('product-search')) {
        document.getElementById('product-search').addEventListener('input', (e) => {
            searchProducts(e.target.value);
        });
    }
    
    if (document.getElementById('product-form')) {
        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            saveProduct();
        });
    }
    
    if (document.getElementById('category-form')) {
        document.getElementById('category-form').addEventListener('submit', (e) => {
            e.preventDefault();
            saveCategory();
        });
    }
    
    // أحداث صفحة المبيعات
    if (document.getElementById('sale-product-search')) {
        document.getElementById('sale-product-search').addEventListener('input', (e) => {
            searchSaleProducts(e.target.value);
        });
        
        // فحص الباركود عند الضغط على Enter
        document.getElementById('sale-product-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const barcode = e.target.value.trim();
                if (barcode) {
                    const product = findProductByCode(barcode);
                    if (product) {
                        addToInvoice(product);
                        e.target.value = '';
                    }
                }
            }
        });
    }
    
    if (document.getElementById('cash-payment-btn')) {
        document.getElementById('cash-payment-btn').addEventListener('click', () => {
            openCashPaymentModal();
        });
    }
    
    if (document.getElementById('installment-btn')) {
        document.getElementById('installment-btn').addEventListener('click', () => {
            openInstallmentModal();
        });
    }
    
    if (document.getElementById('clear-invoice-btn')) {
        document.getElementById('clear-invoice-btn').addEventListener('click', () => {
            clearInvoice();
        });
    }
    
    if (document.getElementById('cash-payment-form')) {
        document.getElementById('cash-payment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            processCashPayment();
        });
    }
    
    if (document.getElementById('installment-form')) {
        document.getElementById('installment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            processInstallmentPayment();
        });
    }
    
    // أحداث الأقساط
    if (document.getElementById('installment-payment-form')) {
        document.getElementById('installment-payment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            processInstallmentPaymentEntry();
        });
    }
    
    // أحداث التقارير
    if (document.getElementById('generate-report-btn')) {
        document.getElementById('generate-report-btn').addEventListener('click', () => {
            generateReport();
        });
    }
    
    if (document.getElementById('print-report-btn')) {
        document.getElementById('print-report-btn').addEventListener('click', () => {
            window.print();
        });
    }
    
    if (document.getElementById('export-report-btn')) {
        document.getElementById('export-report-btn').addEventListener('click', () => {
            exportReport();
        });
    }
    
    document.querySelectorAll('.report-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.report-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    
    // أحداث الحركات اليومية
    if (document.getElementById('view-daily-btn')) {
        document.getElementById('view-daily-btn').addEventListener('click', () => {
            loadDailyTransactions();
        });
    }
    
    // أحداث صفحة الإعدادات
    if (document.getElementById('save-settings-btn')) {
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            saveSettings();
        });
    }
    
    if (document.getElementById('backup-btn')) {
        document.getElementById('backup-btn').addEventListener('click', () => {
            createBackup();
        });
    }
    
    if (document.getElementById('restore-btn')) {
        document.getElementById('restore-btn').addEventListener('click', () => {
            document.getElementById('restore-file').click();
        });
    }
    
    if (document.getElementById('restore-file')) {
        document.getElementById('restore-file').addEventListener('change', (e) => {
            restoreBackup(e.target.files[0]);
        });
    }
    
    // إغلاق المودال
    document.querySelectorAll('.close-modal, .close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });
    
    // أحداث إضافية
    if (document.getElementById('discount-value')) {
        document.getElementById('discount-value').addEventListener('input', () => {
            calculateInvoiceTotal();
        });
    }
    
    if (document.getElementById('discount-type')) {
        document.getElementById('discount-type').addEventListener('change', () => {
            calculateInvoiceTotal();
        });
    }
    
    // أحداث حساب التقسيط
    if (document.getElementById('down-payment')) {
        document.getElementById('down-payment').addEventListener('input', () => {
            calculateInstallment();
        });
    }
    
    if (document.getElementById('installment-period')) {
        document.getElementById('installment-period').addEventListener('input', () => {
            calculateInstallment();
        });
    }
    
    if (document.getElementById('interest-rate')) {
        document.getElementById('interest-rate').addEventListener('input', () => {
            calculateInstallment();
        });
    }
    
    // أحداث الدفع النقدي
    if (document.getElementById('cash-amount')) {
        document.getElementById('cash-amount').addEventListener('input', () => {
            calculateCashRemaining();
        });
    }
}

/**
 /**
 * تحديث التاريخ والوقت
 */
function updateDateTime() {
    const dateTimeElement = document.getElementById('date-time');
    if (!dateTimeElement) {
        console.warn('عنصر التاريخ والوقت غير موجود في الصفحة');
        return;
    }
    
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    dateTimeElement.textContent = now.toLocaleDateString('ar-IQ', options);
}

/**
 * تحديث لوحة التحكم
 */
function updateDashboard() {
    // الحصول على بيانات المبيعات اليومية
    const today = new Date().toISOString().split('T')[0];
    const sales = getSalesByDate(today);
    
    // إحصائيات المبيعات
    let totalSales = 0;
    sales.forEach(sale => {
        totalSales += sale.total;
    });
    
    document.getElementById('today-sales').textContent = formatCurrency(totalSales);
    document.getElementById('today-invoices').textContent = sales.length;
    
    // أعلى المنتجات مبيعاً
    const topProducts = getTopSellingProducts();
    const topProductsList = document.getElementById('top-products');
    topProductsList.innerHTML = '';
    
    topProducts.slice(0, 5).forEach(product => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${product.name}</span>
            <span>${product.soldQuantity} قطعة</span>
        `;
        topProductsList.appendChild(li);
    });
    
    // الأقساط المستحقة
    const dueInstallments = getDueInstallments();
    const dueInstallmentsList = document.getElementById('due-installments');
    dueInstallmentsList.innerHTML = '';
    
    dueInstallments.slice(0, 5).forEach(installment => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${installment.customerName}</span>
            <span>${formatCurrency(installment.monthlyAmount)} د.ع</span>
        `;
        dueInstallmentsList.appendChild(li);
    });
    
    // المخزون المنخفض
    const lowStockProducts = getLowStockProducts();
    const lowStockList = document.getElementById('low-stock');
    lowStockList.innerHTML = '';
    
    lowStockProducts.slice(0, 5).forEach(product => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${product.name}</span>
            <span>${product.quantity} قطعة</span>
        `;
        lowStockList.appendChild(li);
    });
}

/**
 * تنسيق المبلغ المالي
 * @param {number} amount - المبلغ المالي
 * @returns {string} - المبلغ المنسق
 */
function formatCurrency(amount) {
    return amount.toLocaleString('ar-IQ');
}

/**
 * فتح مودال إضافة/تعديل منتج
 * @param {string} productId - معرف المنتج (للتعديل)
 */
function openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('product-modal-title');
    const form = document.getElementById('product-form');
    
    // تهيئة نموذج المنتج
    form.reset();
    
    // تعبئة قائمة التصنيفات
    const categorySelect = document.getElementById('product-category');
    categorySelect.innerHTML = '';
    
    const categories = getCategories();
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
    
    if (productId) {
        // وضع للتعديل
        modalTitle.textContent = 'تعديل المنتج';
        const product = getProductById(productId);
        
        if (product) {
            document.getElementById('product-code').value = product.code;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.categoryId;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-cost').value = product.cost;
            document.getElementById('product-quantity').value = product.quantity;
            
            // تخزين معرف المنتج للتعديل
            form.setAttribute('data-product-id', productId);
        }
    } else {
        // وضع للإضافة
        modalTitle.textContent = 'إضافة منتج جديد';
        form.removeAttribute('data-product-id');
    }
    
    // إظهار المودال
    modal.style.display = 'block';
}

/**
 * فتح مودال إضافة/تعديل تصنيف
 * @param {string} categoryId - معرف التصنيف (للتعديل)
 */
function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('category-modal');
    const modalTitle = document.getElementById('category-modal-title');
    const form = document.getElementById('category-form');
    
    // تهيئة نموذج التصنيف
    form.reset();
    
    if (categoryId) {
        // وضع للتعديل
        modalTitle.textContent = 'تعديل التصنيف';
        const category = getCategoryById(categoryId);
        
        if (category) {
            document.getElementById('category-name').value = category.name;
            
            // تخزين معرف التصنيف للتعديل
            form.setAttribute('data-category-id', categoryId);
        }
    } else {
        // وضع للإضافة
        modalTitle.textContent = 'إضافة تصنيف جديد';
        form.removeAttribute('data-category-id');
    }
    
    // إظهار المودال
    modal.style.display = 'block';
}

/**
 * فتح مودال الدفع النقدي
 */
function openCashPaymentModal() {
    const modal = document.getElementById('cash-payment-modal');
    const form = document.getElementById('cash-payment-form');
    
    // التأكد من وجود عناصر في الفاتورة
    if (!hasInvoiceItems()) {
        alert('الرجاء إضافة منتجات إلى الفاتورة أولاً');
        return;
    }
    
    // تهيئة نموذج الدفع
    form.reset();
    
    // عرض المبلغ المستحق
    const totalAmount = calculateInvoiceTotal();
    document.getElementById('cash-due-amount').textContent = formatCurrency(totalAmount);
    
    // تعيين المبلغ المدفوع افتراضياً
    document.getElementById('cash-amount').value = totalAmount;
    calculateCashRemaining();
    
    // إظهار المودال
    modal.style.display = 'block';
}

/**
 * فتح مودال التقسيط
 */
function openInstallmentModal() {
    const modal = document.getElementById('installment-modal');
    const form = document.getElementById('installment-form');
    
    // التأكد من وجود عناصر في الفاتورة
    if (!hasInvoiceItems()) {
        alert('الرجاء إضافة منتجات إلى الفاتورة أولاً');
        return;
    }
    
    // تهيئة نموذج التقسيط
    form.reset();
    
    // عرض المبلغ الكلي
    const totalAmount = calculateInvoiceTotal();
    document.getElementById('installment-total-amount').textContent = formatCurrency(totalAmount);
    
    // تعيين القيم الافتراضية
    document.getElementById('down-payment').value = Math.round(totalAmount * 0.2); // 20% دفعة أولى افتراضية
    document.getElementById('installment-period').value = 12; // 12 شهر افتراضي
    document.getElementById('interest-rate').value = settings.defaultInterest;
    
    // حساب التفاصيل
    calculateInstallment();
    
    // إظهار المودال
    modal.style.display = 'block';
}

/**
 * حساب المبلغ المتبقي في الدفع النقدي
 */
function calculateCashRemaining() {
    const dueAmount = parseFloat(document.getElementById('cash-due-amount').textContent.replace(/,/g, ''));
    const paidAmount = parseFloat(document.getElementById('cash-amount').value) || 0;
    const remaining = paidAmount - dueAmount;
    
    document.getElementById('cash-remaining').textContent = formatCurrency(remaining);
    
    // تغيير لون المبلغ المتبقي حسب قيمته
    const remainingElement = document.getElementById('cash-remaining');
    if (remaining < 0) {
        remainingElement.style.color = 'var(--danger-color)';
    } else {
        remainingElement.style.color = 'var(--success-color)';
    }
}

/**
 * حساب تفاصيل التقسيط
 */
function calculateInstallment() {
    const totalAmount = parseFloat(document.getElementById('installment-total-amount').textContent.replace(/,/g, ''));
    const downPayment = parseFloat(document.getElementById('down-payment').value) || 0;
    const period = parseInt(document.getElementById('installment-period').value) || 12;
    const interestRate = parseFloat(document.getElementById('interest-rate').value) || 0;
    
    // حساب المبلغ بعد إضافة الفائدة
    const interestAmount = totalAmount * (interestRate / 100);
    const amountWithInterest = totalAmount + interestAmount;
    
    // حساب المبلغ المتبقي بعد الدفعة الأولى
    const remainingAmount = amountWithInterest - downPayment;
    
    // حساب القسط الشهري
    const monthlyInstallment = remainingAmount / period;
    
    // عرض النتائج
    document.getElementById('amount-with-interest').textContent = formatCurrency(amountWithInterest);
    document.getElementById('remaining-amount').textContent = formatCurrency(remainingAmount);
    document.getElementById('monthly-installment').textContent = formatCurrency(monthlyInstallment);
}

/**
 * إغلاق جميع المودالز
 */
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

/**
 * حفظ إعدادات النظام
 */
function saveSettings() {
    settings.storeName = document.getElementById('store-name').value;
    settings.storePhone = document.getElementById('store-phone').value;
    settings.storeAddress = document.getElementById('store-address').value;
    settings.invoiceMessage = document.getElementById('invoice-message').value;
    settings.defaultTax = parseFloat(document.getElementById('default-tax').value) || 0;
    settings.defaultInterest = parseFloat(document.getElementById('default-interest').value) || 0;
    settings.stockAlert = parseInt(document.getElementById('stock-alert').value) || 5;
    
    // حفظ الإعدادات في التخزين المحلي
    localStorage.setItem('cashier-settings', JSON.stringify(settings));
    
    alert('تم حفظ الإعدادات بنجاح!');
}

/**
 * استرجاع إعدادات النظام
 */
function loadSettings() {
    const savedSettings = localStorage.getItem('cashier-settings');
    if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        Object.assign(settings, parsedSettings);
    }
}

/**
 * إنشاء نسخة احتياطية
 */
function createBackup() {
    const backup = {
        products: getProductsData(),
        categories: getCategoriesData(),
        sales: getSalesData(),
        installments: getInstallmentsData(),
        settings: settings,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashier-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

/**
 * استعادة النسخة الاحتياطية
 * @param {File} file - ملف النسخة الاحتياطية
 */
function restoreBackup(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            
            // التحقق من صحة بيانات النسخة الاحتياطية
            if (!backup.products || !backup.categories || !backup.settings) {
                throw new Error('ملف النسخة الاحتياطية غير صالح');
            }
            
            // استعادة البيانات
            restoreProductsData(backup.products);
            restoreCategoriesData(backup.categories);
            restoreSalesData(backup.sales || []);
            restoreInstallmentsData(backup.installments || []);
            
            // استعادة الإعدادات
            Object.assign(settings, backup.settings);
            localStorage.setItem('cashier-settings', JSON.stringify(settings));
            
            // تحديث واجهة المستخدم
            initUI();
            
            // تحديث البيانات في الصفحة الحالية
            if (currentPage === 'products-page') {
                loadProducts();
                loadCategories();
            } else if (currentPage === 'sales-page') {
                initSalesPage();
            } else if (currentPage === 'installments-page') {
                loadInstallments();
            } else if (currentPage === 'dashboard-page') {
                updateDashboard();
            }
            
            alert('تم استعادة النسخة الاحتياطية بنجاح!');
        } catch (error) {
            alert('حدث خطأ أثناء استعادة النسخة الاحتياطية: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

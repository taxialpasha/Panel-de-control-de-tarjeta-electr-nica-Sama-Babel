/**
 * ملف reports.js - المسؤول عن إدارة التقارير والإحصائيات
 */

// متغيرات عامة
let currentReportType = 'sales';
let transactions = [];

/**
 * تهيئة صفحة التقارير
 */
function initReportsPage() {
    // تحميل سجل المعاملات
    loadTransactions();
    
    // تعيين التواريخ الافتراضية
    setDefaultDates();
    
    // إضافة أحداث أزرار التقارير
    initReportEvents();
    
    // عرض التقرير الافتراضي
    generateReport();
}

/**
 * تحميل سجل المعاملات من التخزين المحلي
 */
function loadTransactions() {
    const storedTransactions = localStorage.getItem('cashier-transactions');
    if (storedTransactions) {
        transactions = JSON.parse(storedTransactions);
    }
}

/**
 * حفظ سجل المعاملات في التخزين المحلي
 */
function saveTransactions() {
    localStorage.setItem('cashier-transactions', JSON.stringify(transactions));
}

/**
 * تعيين التواريخ الافتراضية (اليوم)
 */
function setDefaultDates() {
    const today = getFormattedDate(new Date());
    
    document.getElementById('start-date').value = today;
    document.getElementById('end-date').value = today;
}

/**
 * إضافة أحداث أزرار التقارير
 */
function initReportEvents() {
    document.querySelectorAll('.report-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.report-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            currentReportType = e.target.getAttribute('data-report');
            generateReport();
        });
    });
}

/**
 * إنشاء وعرض التقرير
 */
function generateReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const reportContent = document.getElementById('report-content');
    
    if (!startDate || !endDate) {
        alert('الرجاء تحديد التواريخ المطلوبة!');
        return;
    }
    
    // عرض التقرير حسب النوع
    switch (currentReportType) {
        case 'sales':
            reportContent.innerHTML = generateSalesReport(startDate, endDate);
            break;
        case 'inventory':
            reportContent.innerHTML = generateInventoryReport();
            break;
        case 'installments':
            reportContent.innerHTML = generateInstallmentsReport(startDate, endDate);
            break;
        default:
            reportContent.innerHTML = '<div class="empty-message">نوع التقرير غير معروف!</div>';
    }
}

/**
 * إنشاء تقرير المبيعات
 * @param {string} startDate - تاريخ البداية
 * @param {string} endDate - تاريخ النهاية
 * @returns {string} - محتوى HTML للتقرير
 */
function generateSalesReport(startDate, endDate) {
    // الحصول على المبيعات في النطاق الزمني
    const salesInRange = getSalesByDateRange(startDate, endDate);
    
    if (salesInRange.length === 0) {
        return '<div class="empty-message">لا توجد مبيعات في النطاق الزمني المحدد!</div>';
    }
    
    // حساب الإحصائيات
    const totalSales = salesInRange.reduce((sum, sale) => sum + sale.total, 0);
    const cashSales = salesInRange.filter(sale => sale.paymentMethod === 'cash');
    const installmentSales = salesInRange.filter(sale => sale.paymentMethod === 'installment');
    
    const totalCashSales = cashSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalInstallmentSales = installmentSales.reduce((sum, sale) => sum + sale.total, 0);
    
    // الحصول على تقرير مبيعات المنتجات
    const productSalesReport = getProductSalesReport(startDate, endDate);
    
    // إنشاء محتوى التقرير
    let reportHTML = `
        <div class="report-summary">
            <h3>ملخص المبيعات من ${formatDate(startDate)} إلى ${formatDate(endDate)}</h3>
            <div class="summary-stats">
                <div class="stats-card">
                    <div class="stats-value">${formatCurrency(totalSales)} د.ع</div>
                    <div class="stats-label">إجمالي المبيعات</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${salesInRange.length}</div>
                    <div class="stats-label">عدد الفواتير</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${formatCurrency(totalCashSales)} د.ع</div>
                    <div class="stats-label">المبيعات النقدية</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${formatCurrency(totalInstallmentSales)} د.ع</div>
                    <div class="stats-label">المبيعات بالتقسيط</div>
                </div>
            </div>
        </div>
        
        <div class="report-section">
            <h3>المبيعات حسب المنتجات</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>الرمز</th>
                        <th>المنتج</th>
                        <th>الكمية المباعة</th>
                        <th>إجمالي المبيعات</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    productSalesReport.forEach(product => {
        reportHTML += `
            <tr>
                <td>${product.code}</td>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>${formatCurrency(product.total)} د.ع</td>
            </tr>
        `;
    });
    
    reportHTML += `
                </tbody>
            </table>
        </div>
        
        <div class="report-section">
            <h3>قائمة الفواتير</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ</th>
                        <th>المبلغ</th>
                        <th>طريقة الدفع</th>
                        <th>العميل</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    salesInRange.forEach(sale => {
        reportHTML += `
            <tr>
                <td>${sale.number}</td>
                <td>${formatDateTime(sale.timestamp)}</td>
                <td>${formatCurrency(sale.total)} د.ع</td>
                <td>${sale.paymentMethod === 'cash' ? 'نقدي' : 'تقسيط'}</td>
                <td>${sale.customer ? sale.customer.name : '-'}</td>
            </tr>
        `;
    });
    
    reportHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    return reportHTML;
}

/**
 * إنشاء تقرير المخزون
 * @returns {string} - محتوى HTML للتقرير
 */
function generateInventoryReport() {
    if (products.length === 0) {
        return '<div class="empty-message">لا توجد منتجات في المخزون!</div>';
    }
    
    // حساب إجمالي قيمة المخزون
    let totalInventoryValue = 0;
    let totalInventoryCost = 0;
    products.forEach(product => {
        totalInventoryValue += product.price * product.quantity;
        totalInventoryCost += product.cost * product.quantity;
    });
    
    const inventoryProfit = totalInventoryValue - totalInventoryCost;
    
    // عدد المنتجات منخفضة المخزون
    const lowStockCount = products.filter(p => p.quantity <= settings.stockAlert).length;
    
    // إنشاء محتوى التقرير
    let reportHTML = `
        <div class="report-summary">
            <h3>ملخص المخزون</h3>
            <div class="summary-stats">
                <div class="stats-card">
                    <div class="stats-value">${products.length}</div>
                    <div class="stats-label">عدد المنتجات</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${formatCurrency(totalInventoryValue)} د.ع</div>
                    <div class="stats-label">قيمة المخزون (سعر البيع)</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${formatCurrency(totalInventoryCost)} د.ع</div>
                    <div class="stats-label">تكلفة المخزون</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${formatCurrency(inventoryProfit)} د.ع</div>
                    <div class="stats-label">الربح المتوقع</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${lowStockCount}</div>
                    <div class="stats-label">المنتجات منخفضة المخزون</div>
                </div>
            </div>
        </div>
        
        <div class="report-section">
            <h3>حالة المخزون</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>الرمز</th>
                        <th>المنتج</th>
                        <th>التصنيف</th>
                        <th>الكمية</th>
                        <th>سعر التكلفة</th>
                        <th>سعر البيع</th>
                        <th>القيمة الإجمالية</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    products.forEach(product => {
        const category = getCategoryById(product.categoryId);
        const totalValue = product.price * product.quantity;
        
        // تحديد صنف الصف حسب حالة المخزون
        let rowClass = '';
        if (product.quantity <= 0) {
            rowClass = 'out-of-stock';
        } else if (product.quantity <= settings.stockAlert) {
            rowClass = 'low-stock';
        }
        
        reportHTML += `
            <tr class="${rowClass}">
                <td>${product.code}</td>
                <td>${product.name}</td>
                <td>${category ? category.name : 'غير مصنف'}</td>
                <td>${product.quantity}</td>
                <td>${formatCurrency(product.cost)} د.ع</td>
                <td>${formatCurrency(product.price)} د.ع</td>
                <td>${formatCurrency(totalValue)} د.ع</td>
            </tr>
        `;
    });
    
    reportHTML += `
                </tbody>
            </table>
        </div>
        
        <div class="report-section">
            <h3>المنتجات منخفضة المخزون</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>الرمز</th>
                        <th>المنتج</th>
                        <th>التصنيف</th>
                        <th>الكمية المتوفرة</th>
                        <th>حد التنبيه</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    const lowStockProducts = products.filter(p => p.quantity <= settings.stockAlert);
    
    if (lowStockProducts.length === 0) {
        reportHTML += `
            <tr>
                <td colspan="5" class="empty-message">لا توجد منتجات منخفضة المخزون!</td>
            </tr>
        `;
    } else {
        lowStockProducts.forEach(product => {
            const category = getCategoryById(product.categoryId);
            
            reportHTML += `
                <tr>
                    <td>${product.code}</td>
                    <td>${product.name}</td>
                    <td>${category ? category.name : 'غير مصنف'}</td>
                    <td>${product.quantity}</td>
                    <td>${settings.stockAlert}</td>
                </tr>
            `;
        });
    }
    
    reportHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    return reportHTML;
}

/**
 * إنشاء تقرير الأقساط
 * @param {string} startDate - تاريخ البداية
 * @param {string} endDate - تاريخ النهاية
 * @returns {string} - محتوى HTML للتقرير
 */
function generateInstallmentsReport(startDate, endDate) {
    // الحصول على عقود الأقساط في النطاق الزمني
    const installmentsInRange = getInstallmentsReport(startDate, endDate);
    
    if (installmentsInRange.length === 0) {
        return '<div class="empty-message">لا توجد عقود أقساط في النطاق الزمني المحدد!</div>';
    }
    
    // حساب الإحصائيات
    const totalContractsValue = installmentsInRange.reduce((sum, contract) => sum + contract.totalAmount, 0);
    const totalDownPayments = installmentsInRange.reduce((sum, contract) => sum + contract.downPayment, 0);
    const totalRemainingAmount = installmentsInRange.reduce((sum, contract) => sum + contract.remainingAmount, 0);
    
    // تصنيف العقود حسب الحالة
    const activeContracts = installmentsInRange.filter(contract => contract.status === 'active');
    const completedContracts = installmentsInRange.filter(contract => contract.status === 'completed');
    const lateContracts = installmentsInRange.filter(contract => contract.status === 'active' && isLatePayment(contract));
    
    // إنشاء محتوى التقرير
    let reportHTML = `
        <div class="report-summary">
            <h3>ملخص الأقساط من ${formatDate(startDate)} إلى ${formatDate(endDate)}</h3>
            <div class="summary-stats">
                <div class="stats-card">
                    <div class="stats-value">${installmentsInRange.length}</div>
                    <div class="stats-label">عدد العقود</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${formatCurrency(totalContractsValue)} د.ع</div>
                    <div class="stats-label">القيمة الإجمالية</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${formatCurrency(totalDownPayments)} د.ع</div>
                    <div class="stats-label">إجمالي الدفعات الأولى</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${formatCurrency(totalRemainingAmount)} د.ع</div>
                    <div class="stats-label">إجمالي المبالغ المتبقية</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${activeContracts.length}</div>
                    <div class="stats-label">العقود النشطة</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${completedContracts.length}</div>
                    <div class="stats-label">العقود المكتملة</div>
                </div>
                <div class="stats-card">
                    <div class="stats-value">${lateContracts.length}</div>
                    <div class="stats-label">العقود المتأخرة</div>
                </div>
            </div>
        </div>
        
        <div class="report-section">
            <h3>قائمة عقود التقسيط</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>رقم العقد</th>
                        <th>تاريخ العقد</th>
                        <th>العميل</th>
                        <th>رقم الهاتف</th>
                        <th>المبلغ الكلي</th>
                        <th>الدفعة الأولى</th>
                        <th>المبلغ المتبقي</th>
                        <th>عدد الأقساط</th>
                        <th>القسط الشهري</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    installmentsInRange.forEach(contract => {
        // تحديد حالة العقد كنص
        let statusText = '';
        let statusClass = '';
        
        if (contract.status === 'completed') {
            statusText = 'مكتمل';
            statusClass = 'status-completed';
        } else if (isLatePayment(contract)) {
            statusText = 'متأخر';
            statusClass = 'status-late';
        } else {
            statusText = 'نشط';
            statusClass = 'status-active';
        }
        
        reportHTML += `
            <tr>
                <td>${contract.contractNumber}</td>
                <td>${formatDate(contract.startDate)}</td>
                <td>${contract.customerName}</td>
                <td>${contract.customerPhone}</td>
                <td>${formatCurrency(contract.totalAmount)} د.ع</td>
                <td>${formatCurrency(contract.downPayment)} د.ع</td>
                <td>${formatCurrency(contract.remainingAmount)} د.ع</td>
                <td>${contract.originalPeriod}</td>
                <td>${formatCurrency(contract.monthlyAmount)} د.ع</td>
                <td class="${statusClass}">${statusText}</td>
            </tr>
        `;
    });
    
    reportHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    return reportHTML;
}

/**
 * تصدير التقرير الحالي إلى ملف CSV
 */
function exportReport() {
    const reportContent = document.getElementById('report-content');
    const reportTable = reportContent.querySelector('.report-table');
    
    if (!reportTable) {
        alert('لا يوجد تقرير للتصدير!');
        return;
    }
    
    let filename = '';
    
    switch (currentReportType) {
        case 'sales':
            filename = `تقرير_المبيعات_${getFormattedDate(new Date())}.csv`;
            break;
        case 'inventory':
            filename = `تقرير_المخزون_${getFormattedDate(new Date())}.csv`;
            break;
        case 'installments':
            filename = `تقرير_الأقساط_${getFormattedDate(new Date())}.csv`;
            break;
        default:
            filename = `تقرير_${getFormattedDate(new Date())}.csv`;
    }
    
    exportTableToCSV(reportTable, filename);
}

/**
 * تسجيل حركة جديدة
 * @param {string} actionType - نوع الحركة
 * @param {object} details - تفاصيل الحركة
 */
function recordTransaction(actionType, details) {
    const transaction = {
        id: generateUniqueId(),
        timestamp: new Date().toISOString(),
        actionType: actionType,
        details: details,
        user: 'admin' // يمكن تحديث هذا لاحقًا مع نظام المستخدمين
    };
    
    transactions.push(transaction);
    saveTransactions();
}

/**
 * تحميل الحركات اليومية
 * @param {string} date - التاريخ المطلوب (اختياري، التاريخ الحالي افتراضيًا)
 */
function loadDailyTransactions(date = null) {
    const selectedDate = date || document.getElementById('daily-date').value || getFormattedDate(new Date());
    document.getElementById('daily-date').value = selectedDate;
    
    // تحويل التاريخ إلى yyyy-mm-dd
    const targetDate = selectedDate.split('T')[0];
    
    // فلتر الحركات حسب التاريخ
    const dailyTransactions = transactions.filter(transaction => {
        const transactionDate = transaction.timestamp.split('T')[0];
        return transactionDate === targetDate;
    });
    
    // عرض الحركات
    displayDailyTransactions(dailyTransactions);
    
    // حساب الإحصائيات
    calculateDailyStats(selectedDate);
}

/**
 * عرض الحركات اليومية
 * @param {Array} dailyTransactions - الحركات اليومية
 */
function displayDailyTransactions(dailyTransactions) {
    const transactionsList = document.getElementById('daily-list');
    if (!transactionsList) return;
    
    transactionsList.innerHTML = '';
    
    if (dailyTransactions.length === 0) {
        transactionsList.innerHTML = `
            <tr>
                <td colspan="5" class="empty-message">لا توجد حركات في هذا اليوم!</td>
            </tr>
        `;
        return;
    }
    
    dailyTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        let detailsText = '';
        
        switch (transaction.actionType) {
            case 'بيع نقدي':
            case 'بيع بالتقسيط':
                detailsText = `فاتورة رقم: ${transaction.details.invoiceNumber}`;
                break;
            case 'دفع قسط':
                detailsText = `عقد رقم: ${transaction.details.contractNumber}`;
                break;
            case 'إضافة منتج':
            case 'تعديل منتج':
            case 'حذف منتج':
                detailsText = `منتج: ${transaction.details.productName}`;
                break;
            case 'إضافة تصنيف':
            case 'تعديل تصنيف':
            case 'حذف تصنيف':
                detailsText = `تصنيف: ${transaction.details.categoryName}`;
                break;
            default:
                detailsText = JSON.stringify(transaction.details);
        }
        
        let amount = '';
        if (transaction.details.total) {
            amount = `${formatCurrency(transaction.details.total)} د.ع`;
        } else if (transaction.details.paymentAmount) {
            amount = `${formatCurrency(transaction.details.paymentAmount)} د.ع`;
        }
        
        row.innerHTML = `
            <td>${formatTime(transaction.timestamp)}</td>
            <td>${transaction.actionType}</td>
            <td>${detailsText}</td>
            <td>${amount}</td>
            <td>${transaction.user}</td>
        `;
        
        transactionsList.appendChild(row);
    });
}

/**
 * حساب إحصائيات اليوم
 * @param {string} date - التاريخ المطلوب
 */
function calculateDailyStats(date) {
    // الحصول على المبيعات في اليوم المحدد
    const salesInDay = getSalesByDate(date);
    
    // حساب المبيعات النقدية
    const cashSales = salesInDay
        .filter(sale => sale.paymentMethod === 'cash')
        .reduce((sum, sale) => sum + sale.total, 0);
    
    // حساب المبيعات بالتقسيط
    const installmentSales = salesInDay
        .filter(sale => sale.paymentMethod === 'installment')
        .reduce((sum, sale) => sum + sale.total, 0);
    
    // حساب دفعات الأقساط
    let installmentPayments = 0;
    
    // البحث عن حركات دفع الأقساط في اليوم المحدد
    const paymentTransactions = transactions.filter(t => {
        const transactionDate = t.timestamp.split('T')[0];
        return transactionDate === date.split('T')[0] && t.actionType === 'دفع قسط';
    });
    
    paymentTransactions.forEach(t => {
        if (t.details.paymentAmount) {
            installmentPayments += t.details.paymentAmount;
        }
    });
    
    // عرض الإحصائيات
    document.getElementById('daily-cash-sales').textContent = formatCurrency(cashSales);
    document.getElementById('daily-installment-sales').textContent = formatCurrency(installmentSales);
    document.getElementById('daily-installment-payments').textContent = formatCurrency(installmentPayments);
    document.getElementById('daily-total').textContent = formatCurrency(cashSales + installmentPayments);
}

/**
 * استعادة بيانات المعاملات
 * @param {Array} backupTransactions - نسخة احتياطية من المعاملات
 */
function restoreTransactionsData(backupTransactions) {
    transactions = backupTransactions;
    saveTransactions();
}

/**
 * الحصول على بيانات المعاملات
 * @returns {Array} - بيانات المعاملات
 */
function getTransactionsData() {
    return transactions;
}
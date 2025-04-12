/**
 * ملف payments.js - المسؤول عن إدارة الأقساط والمدفوعات
 */
/**
 * تعديل وظائف إدارة الأقساط لضمان الحفظ والاسترجاع المستمر للبيانات
 */

// متغيرات عامة
let installmentContracts = [];

/**
 * تهيئة نظام الأقساط - تُستدعى عند بدء التطبيق
 */
function initPayments() {
    // استرجاع بيانات الأقساط من التخزين المحلي
    loadInstallmentContracts();
    
    // إضافة مستمعي الأحداث للعناصر ذات الصلة
    attachInstallmentEventListeners();
    
    // تهيئة عرض بيانات الأقساط إذا كنا في صفحة الأقساط
    if (document.getElementById('installments-list')) {
        loadInstallments();
    }
    
    console.log("تم تهيئة نظام الأقساط");
    console.log("عدد عقود الأقساط المحملة:", installmentContracts.length);
}

/**
 * تحميل عقود الأقساط من التخزين المحلي
 */
function loadInstallmentContracts() {
    try {
        const storedContracts = localStorage.getItem('cashier-installments');
        if (storedContracts) {
            installmentContracts = JSON.parse(storedContracts);
            console.log("تم تحميل عقود الأقساط بنجاح:", installmentContracts.length);
        } else {
            console.log("لم يتم العثور على بيانات أقساط مخزنة");
            installmentContracts = [];
        }
    } catch (error) {
        console.error("خطأ في تحميل بيانات الأقساط:", error);
        installmentContracts = [];
    }
}

/**
 * حفظ عقود الأقساط في التخزين المحلي
 */
function saveInstallmentContracts() {
    try {
        localStorage.setItem('cashier-installments', JSON.stringify(installmentContracts));
        console.log("تم حفظ عقود الأقساط بنجاح:", installmentContracts.length);
        return true;
    } catch (error) {
        console.error("خطأ في حفظ بيانات الأقساط:", error);
        showAlert('حدث خطأ في حفظ بيانات الأقساط!', 'error');
        return false;
    }
}

/**
 * إضافة عقد تقسيط جديد
 * @param {object} contract - بيانات العقد
 * @returns {string} - معرف العقد المضاف
 */
function addInstallmentContract(contract) {
    // التأكد من وجود معرف فريد للعقد
    if (!contract.id) {
        contract.id = generateUniqueId();
    }
    
    // إضافة طابع زمني للإنشاء إذا لم يكن موجوداً
    if (!contract.createdAt) {
        contract.createdAt = new Date().toISOString();
    }
    
    // إضافة العقد إلى المصفوفة
    installmentContracts.push(contract);
    
    // حفظ البيانات في التخزين المحلي
    if (saveInstallmentContracts()) {
        // تحديث العرض إذا كنا في صفحة الأقساط
        if (document.getElementById('installments-list')) {
            loadInstallments();
        }
        
        // إعادة معرف العقد المضاف
        return contract.id;
    }
    
    return null;
}

/**
 * إضافة مستمعي الأحداث لعناصر إدارة الأقساط
 */
function attachInstallmentEventListeners() {
    // مستمع لتغيير فلتر عرض الأقساط
    const filterSelect = document.getElementById('installment-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            loadInstallments(filterSelect.value, document.getElementById('installment-search')?.value || '');
        });
    }
    
    // مستمع لحقل البحث في الأقساط
    const searchInput = document.getElementById('installment-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            loadInstallments(filterSelect?.value || 'all', e.target.value);
        });
    }
    
    // مستمع لنموذج دفع القسط
    const installmentPaymentForm = document.getElementById('installment-payment-form');
    if (installmentPaymentForm) {
        installmentPaymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            processInstallmentPaymentEntry();
        });
    }
}

/**
 * معالجة دفع القسط وتحديث بيانات العقد
 */
function processInstallmentPaymentEntry() {
    const form = document.getElementById('installment-payment-form');
    const contractId = form.getAttribute('data-contract-id');
    
    // البحث عن العقد في قائمة العقود
    const contractIndex = installmentContracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) {
        showAlert('لم يتم العثور على العقد المطلوب!', 'error');
        return;
    }
    
    const contract = installmentContracts[contractIndex];
    
    // استخراج بيانات الدفعة
    const paymentAmount = parseFloat(document.getElementById('payment-amount').value) || 0;
    const paymentDate = document.getElementById('payment-date').value;
    const paymentNotes = document.getElementById('payment-notes').value;
    
    // التحقق من المدخلات
    if (paymentAmount <= 0) {
        showAlert('الرجاء إدخال مبلغ صحيح!', 'error');
        return;
    }
    
    // حساب المبلغ المتبقي
    const paidAmount = contract.paymentHistory.reduce((total, payment) => total + payment.amount, 0);
    const remainingAmount = contract.remainingAmount - (paidAmount - contract.downPayment);
    
    // التحقق من أن المبلغ المدفوع لا يتجاوز المبلغ المتبقي
    if (paymentAmount > remainingAmount) {
        if (!confirm('المبلغ المدفوع أكبر من المبلغ المتبقي. هل تريد الاستمرار؟')) {
            return;
        }
    }
    
    // إضافة الدفعة
    const payment = {
        id: generateUniqueId(),
        amount: paymentAmount,
        date: new Date(paymentDate).toISOString(),
        notes: paymentNotes || 'دفعة قسط',
        createdAt: new Date().toISOString()
    };
    
    // إضافة الدفعة إلى سجل دفعات العقد
    contract.paymentHistory.push(payment);
    
    // تحديث تاريخ الدفعة التالية
    contract.nextPaymentDate = addMonthsToDate(new Date(paymentDate), 1).toISOString();
    
    // التحقق من اكتمال الدفع
    const newPaidTotal = paidAmount + paymentAmount;
    
    if (newPaidTotal >= contract.totalAmount) {
        contract.status = 'completed';
        contract.completedAt = new Date().toISOString();
    }
    
    // تحديث العقد في المصفوفة
    installmentContracts[contractIndex] = contract;
    
    // حفظ التغييرات في التخزين المحلي
    if (saveInstallmentContracts()) {
        // تحديث العرض
        loadInstallments();
        
        // تسجيل الحركة
        recordTransaction('دفع قسط', {
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            customerName: contract.customerName,
            paymentAmount: paymentAmount
        });
        
        // طباعة إيصال الدفع
        printPaymentReceipt(contract, payment);
        
        // إغلاق المودال
        closeAllModals();
        
        // عرض رسالة نجاح
        showAlert('تم تسجيل الدفعة بنجاح!', 'success');
    }
}

/**
 * تحديث حالة عقد تقسيط معين
 * @param {string} contractId - معرف العقد
 * @param {string} status - الحالة الجديدة
 */
function updateInstallmentStatus(contractId, status) {
    // البحث عن العقد في قائمة العقود
    const contractIndex = installmentContracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) {
        console.error("لم يتم العثور على العقد:", contractId);
        return false;
    }
    
    // تحديث حالة العقد
    installmentContracts[contractIndex].status = status;
    
    // تحديث تاريخ التعديل
    installmentContracts[contractIndex].updatedAt = new Date().toISOString();
    
    // حفظ التغييرات
    if (saveInstallmentContracts()) {
        // تحديث العرض إذا كنا في صفحة الأقساط
        if (document.getElementById('installments-list')) {
            loadInstallments();
        }
        return true;
    }
    
    return false;
}

/**
 * فحص وتحديث حالات الأقساط المتأخرة
 * يتم استدعاؤها عند تحميل التطبيق لتحديث حالات الأقساط المتأخرة
 */
function checkLateInstallments() {
    const today = new Date();
    let updatedCount = 0;
    
    installmentContracts.forEach((contract, index) => {
        if (contract.status === 'active') {
            const nextPaymentDate = new Date(contract.nextPaymentDate);
            // اعتبار التأخير بعد 7 أيام من تاريخ الاستحقاق
            const lateDate = new Date(nextPaymentDate);
            lateDate.setDate(lateDate.getDate() + 7);
            
            if (today > lateDate && contract.status !== 'late') {
                // تحديث حالة العقد إلى متأخر
                installmentContracts[index].status = 'late';
                installmentContracts[index].updatedAt = new Date().toISOString();
                updatedCount++;
            }
        }
    });
    
    if (updatedCount > 0) {
        // حفظ التغييرات إذا كان هناك تحديث
        saveInstallmentContracts();
        console.log(`تم تحديث ${updatedCount} عقد متأخر`);
    }
}

// استدعاء دالة فحص الأقساط المتأخرة عند تحميل الملف
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة نظام الأقساط
    initPayments();
    
    // فحص وتحديث حالات الأقساط المتأخرة
    checkLateInstallments();
});

/**
 * تهيئة نظام الأقساط
 */
function initPayments() {
    loadInstallmentContracts();
}

/**
 * تحميل عقود الأقساط من التخزين المحلي
 */
function loadInstallmentContracts() {
    const storedContracts = localStorage.getItem('cashier-installments');
    if (storedContracts) {
        installmentContracts = JSON.parse(storedContracts);
    }
}

/**
 * حفظ عقود الأقساط في التخزين المحلي
 */
function saveInstallmentContracts() {
    localStorage.setItem('cashier-installments', JSON.stringify(installmentContracts));
}

/**
 * إضافة عقد تقسيط جديد
 * @param {object} contract - بيانات العقد
 */
function addInstallmentContract(contract) {
    installmentContracts.push(contract);
    saveInstallmentContracts();
}

/**
 * تحميل وعرض قائمة الأقساط
 * @param {string} filter - نوع الفلتر (all, active, completed, late)
 * @param {string} searchQuery - نص البحث (اختياري)
 */
function loadInstallments(filter = 'all', searchQuery = '') {
    const installmentsTable = document.getElementById('installments-list');
    if (!installmentsTable) return;
    
    installmentsTable.innerHTML = '';
    
    // تطبيق الفلتر والبحث
    let filteredContracts = installmentContracts;
    
    // فلتر حسب الحالة
    if (filter !== 'all') {
        filteredContracts = filteredContracts.filter(contract => {
            if (filter === 'active' && contract.status === 'active') return true;
            if (filter === 'completed' && contract.status === 'completed') return true;
            if (filter === 'late') {
                // التحقق من تأخير الدفعات
                return contract.status === 'active' && isLatePayment(contract);
            }
            return false;
        });
    }
    
    // فلتر حسب البحث
    if (searchQuery.trim() !== '') {
        const query = searchQuery.trim().toLowerCase();
        filteredContracts = filteredContracts.filter(contract => {
            return (
                contract.customerName.toLowerCase().includes(query) ||
                contract.customerPhone.includes(query) ||
                contract.contractNumber.toLowerCase().includes(query)
            );
        });
    }
    
    // تحديث العرض
    if (filteredContracts.length === 0) {
        installmentsTable.innerHTML = `
            <tr>
                <td colspan="9" class="empty-message">لا توجد عقود أقساط مطابقة للبحث.</td>
            </tr>
        `;
        return;
    }
    
    filteredContracts.forEach(contract => {
        // حساب المبلغ المدفوع
        const paidAmount = contract.paymentHistory.reduce((total, payment) => total + payment.amount, 0);
        
        // حساب المبلغ المتبقي
        const remainingAmount = contract.remainingAmount - (paidAmount - contract.downPayment);
        
        // تحديد حالة العقد
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
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${contract.contractNumber}</td>
            <td>${contract.customerName}</td>
            <td>${contract.customerPhone}</td>
            <td>${formatCurrency(contract.totalAmount)} د.ع</td>
            <td>${formatCurrency(contract.monthlyAmount)} د.ع</td>
            <td>${formatCurrency(paidAmount)} د.ع</td>
            <td>${formatCurrency(remainingAmount)} د.ع</td>
            <td class="${statusClass}">${statusText}</td>
            <td class="actions-cell">
                <button class="pay-installment-btn table-btn primary-btn" data-id="${contract.id}">
                    <i class="fas fa-money-bill-wave"></i>
                </button>
                <button class="view-installment-btn table-btn secondary-btn" data-id="${contract.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="print-installment-btn table-btn secondary-btn" data-id="${contract.id}">
                    <i class="fas fa-print"></i>
                </button>
            </td>
        `;
        
        installmentsTable.appendChild(row);
    });
    
    // إضافة أحداث للأزرار
    document.querySelectorAll('.pay-installment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const contractId = btn.getAttribute('data-id');
            openPayInstallmentModal(contractId);
        });
    });
    
    document.querySelectorAll('.view-installment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const contractId = btn.getAttribute('data-id');
            viewInstallmentDetails(contractId);
        });
    });
    
    document.querySelectorAll('.print-installment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const contractId = btn.getAttribute('data-id');
            printInstallmentContract(contractId);
        });
    });
    
    // تحديث فلتر العرض إذا كان موجوداً
    const filterSelect = document.getElementById('installment-filter');
    if (filterSelect) {
        filterSelect.value = filter;
        
        // إضافة حدث للفلتر
        filterSelect.addEventListener('change', () => {
            loadInstallments(filterSelect.value, searchQuery);
        });
    }
    
    // تحديث حقل البحث إذا كان موجوداً
    const searchInput = document.getElementById('installment-search');
    if (searchInput) {
        searchInput.value = searchQuery;
        
        // إضافة حدث للبحث
        searchInput.addEventListener('input', (e) => {
            loadInstallments(filter, e.target.value);
        });
    }
}

/**
 * التحقق من تأخير دفع القسط
 * @param {object} contract - بيانات العقد
 * @returns {boolean} - هل هناك تأخير في الدفع
 */
function isLatePayment(contract) {
    if (contract.status !== 'active') return false;
    
    const today = new Date();
    const nextPaymentDate = new Date(contract.nextPaymentDate);
    
    // اعتبار التأخير بعد 7 أيام من تاريخ الاستحقاق
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);
    
    return today > nextPaymentDate;
}

/**
 * فتح مودال دفع القسط
 * @param {string} contractId - معرف العقد
 */
function openPayInstallmentModal(contractId) {
    const contract = getInstallmentContractById(contractId);
    if (!contract) return;
    
    const modal = document.getElementById('pay-installment-modal');
    const form = document.getElementById('installment-payment-form');
    
    // تهيئة نموذج الدفع
    form.reset();
    
    // عرض معلومات العقد
    document.getElementById('payment-customer-name').textContent = contract.customerName;
    document.getElementById('payment-contract-id').textContent = contract.contractNumber;
    document.getElementById('payment-monthly-amount').textContent = formatCurrency(contract.monthlyAmount);
    
    // حساب المبلغ المتبقي
    const paidAmount = contract.paymentHistory.reduce((total, payment) => total + payment.amount, 0);
    const remainingAmount = contract.remainingAmount - (paidAmount - contract.downPayment);
    document.getElementById('payment-remaining').textContent = formatCurrency(remainingAmount);
    
    // تعيين المبلغ المدفوع افتراضياً
    document.getElementById('payment-amount').value = contract.monthlyAmount;
    
    // تعيين تاريخ اليوم
    document.getElementById('payment-date').value = getFormattedDate(new Date());
    
    // تخزين معرف العقد للدفع
    form.setAttribute('data-contract-id', contractId);
    
    // إظهار المودال
    modal.style.display = 'block';
}

/**
 * معالجة دفع القسط
 */
function processInstallmentPaymentEntry() {
    const form = document.getElementById('installment-payment-form');
    const contractId = form.getAttribute('data-contract-id');
    
    const contract = getInstallmentContractById(contractId);
    if (!contract) return;
    
    const paymentAmount = parseFloat(document.getElementById('payment-amount').value) || 0;
    const paymentDate = document.getElementById('payment-date').value;
    const paymentNotes = document.getElementById('payment-notes').value;
    
    // التحقق من المدخلات
    if (paymentAmount <= 0) {
        alert('الرجاء إدخال مبلغ صحيح!');
        return;
    }
    
    // حساب المبلغ المتبقي
    const paidAmount = contract.paymentHistory.reduce((total, payment) => total + payment.amount, 0);
    const remainingAmount = contract.remainingAmount - (paidAmount - contract.downPayment);
    
    // التحقق من أن المبلغ المدفوع لا يتجاوز المبلغ المتبقي
    if (paymentAmount > remainingAmount) {
        if (!confirm('المبلغ المدفوع أكبر من المبلغ المتبقي. هل تريد الاستمرار؟')) {
            return;
        }
    }
    
    // إضافة الدفعة
    const payment = {
        amount: paymentAmount,
        date: new Date(paymentDate).toISOString(),
        notes: paymentNotes || 'دفعة قسط'
    };
    
    contract.paymentHistory.push(payment);
    
    // تحديث تاريخ الدفعة التالية
    contract.nextPaymentDate = addMonthsToDate(new Date(paymentDate), 1).toISOString();
    
    // التحقق من اكتمال الدفع
    const newPaidTotal = paidAmount + paymentAmount;
    
    if (newPaidTotal >= contract.totalAmount) {
        contract.status = 'completed';
    }
    
    // حفظ التغييرات
    saveInstallmentContracts();
    
    // تحديث العرض
    loadInstallments();
    
    // تسجيل الحركة
    recordTransaction('دفع قسط', {
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        customerName: contract.customerName,
        paymentAmount: paymentAmount
    });
    
    // طباعة إيصال الدفع
    printPaymentReceipt(contract, payment);
    
    // إغلاق المودال
    closeAllModals();
    
    // عرض رسالة نجاح
    showAlert('تم تسجيل الدفعة بنجاح!', 'success');
}

/**
 * عرض تفاصيل عقد التقسيط
 * @param {string} contractId - معرف العقد
 */
function viewInstallmentDetails(contractId) {
    const contract = getInstallmentContractById(contractId);
    if (!contract) return;
    
    // إنشاء مودال تفاصيل العقد
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'contract-details-modal';
    
    // حساب المبلغ المدفوع
    const paidAmount = contract.paymentHistory.reduce((total, payment) => total + payment.amount, 0);
    
    // حساب المبلغ المتبقي
    const remainingAmount = contract.totalAmount - paidAmount;
    
    // تحديد حالة العقد
    let statusText = '';
    
    if (contract.status === 'completed') {
        statusText = 'مكتمل';
    } else if (isLatePayment(contract)) {
        statusText = 'متأخر';
    } else {
        statusText = 'نشط';
    }
    
    // إنشاء جدول للدفعات
    let paymentsTable = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>تاريخ الدفع</th>
                    <th>المبلغ</th>
                    <th>ملاحظات</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    contract.paymentHistory.forEach(payment => {
        paymentsTable += `
            <tr>
                <td>${formatDate(payment.date)}</td>
                <td>${formatCurrency(payment.amount)} د.ع</td>
                <td>${payment.notes}</td>
            </tr>
        `;
    });
    
    paymentsTable += `
            </tbody>
        </table>
    `;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>تفاصيل عقد التقسيط</h3>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <div class="contract-details">
                    <div class="details-section">
                        <h4>معلومات العميل</h4>
                        <div class="details-row">
                            <span class="details-label">الاسم:</span>
                            <span class="details-value">${contract.customerName}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">رقم الهاتف:</span>
                            <span class="details-value">${contract.customerPhone}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">العنوان:</span>
                            <span class="details-value">${contract.customerAddress || '-'}</span>
                        </div>
                    </div>
                    
                    <div class="details-section">
                        <h4>تفاصيل العقد</h4>
                        <div class="details-row">
                            <span class="details-label">رقم العقد:</span>
                            <span class="details-value">${contract.contractNumber}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">رقم الفاتورة:</span>
                            <span class="details-value">${contract.invoiceNumber}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">تاريخ العقد:</span>
                            <span class="details-value">${formatDate(contract.startDate)}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">المبلغ الكلي:</span>
                            <span class="details-value">${formatCurrency(contract.totalAmount)} د.ع</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">الدفعة الأولى:</span>
                            <span class="details-value">${formatCurrency(contract.downPayment)} د.ع</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">المبلغ المتبقي:</span>
                            <span class="details-value">${formatCurrency(contract.remainingAmount)} د.ع</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">القسط الشهري:</span>
                            <span class="details-value">${formatCurrency(contract.monthlyAmount)} د.ع</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">فترة التقسيط:</span>
                            <span class="details-value">${contract.originalPeriod} شهر</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">نسبة الفائدة:</span>
                            <span class="details-value">${contract.interestRate}%</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">المبلغ المدفوع:</span>
                            <span class="details-value">${formatCurrency(paidAmount)} د.ع</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">المبلغ المتبقي:</span>
                            <span class="details-value">${formatCurrency(remainingAmount)} د.ع</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">موعد الدفعة القادمة:</span>
                            <span class="details-value">${formatDate(contract.nextPaymentDate)}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">الحالة:</span>
                            <span class="details-value status-${contract.status}">${statusText}</span>
                        </div>
                    </div>
                    
                    <div class="details-section">
                        <h4>سجل الدفعات</h4>
                        ${paymentsTable}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // إظهار المودال
    modal.style.display = 'block';
    
    // إضافة حدث لإغلاق المودال
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

/**
 * طباعة عقد التقسيط
 * @param {string} contractId - معرف العقد
 */
function printInstallmentContract(contractId) {
    const contract = getInstallmentContractById(contractId);
    if (!contract) return;
    
    // إعداد بيانات العقد للطباعة
    const contractData = {
        contractNumber: contract.contractNumber,
        invoiceNumber: contract.invoiceNumber,
        date: contract.startDate,
        customerName: contract.customerName,
        customerPhone: contract.customerPhone,
        customerAddress: contract.customerAddress || '',
        totalAmount: contract.totalAmount,
        downPayment: contract.downPayment,
        remainingAmount: contract.remainingAmount,
        monthlyAmount: contract.monthlyAmount,
        period: contract.originalPeriod,
        interestRate: contract.interestRate
    };
    
    // إنشاء نافذة الطباعة
    const printWindow = window.open('', '_blank');
    
    // الحصول على إعدادات المتجر
    const settings = JSON.parse(localStorage.getItem('cashier-settings')) || {
        storeName: 'متجر الكاشير',
        storePhone: '',
        storeAddress: '',
        invoiceMessage: 'شكراً للتعامل معنا!'
    };
    
    // إنشاء محتوى HTML للعقد
    const contractHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>عقد تقسيط - ${contractData.contractNumber}</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    margin: 0;
                    padding: 20px;
                    direction: rtl;
                }
                .contract-header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 15px;
                }
                .contract-title {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .store-info {
                    margin-bottom: 10px;
                }
                .contract-subtitle {
                    font-size: 18px;
                    margin-bottom: 10px;
                }
                .contract-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
                .contract-details {
                    margin-bottom: 20px;
                }
                .details-section {
                    margin-bottom: 20px;
                }
                .details-section h2 {
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                    margin-bottom: 10px;
                }
                .details-row {
                    display: flex;
                    margin-bottom: 5px;
                }
                .details-label {
                    font-weight: bold;
                    min-width: 150px;
                }
                .payment-schedule {
                    margin-top: 20px;
                }
                .payment-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                .payment-table th, .payment-table td {
                    padding: 8px;
                    border: 1px solid #ddd;
                    text-align: right;
                }
                .payment-table th {
                    background-color: #f2f2f2;
                }
                .signatures {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 50px;
                }
                .signature-block {
                    text-align: center;
                    width: 200px;
                }
                .signature-line {
                    border-top: 1px solid #333;
                    margin-top: 50px;
                    margin-bottom: 10px;
                }
                .terms {
                    margin-top: 30px;
                    font-size: 14px;
                }
                @media print {
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <div class="contract-header">
                <div class="contract-title">${settings.storeName}</div>
                <div class="store-info">
                    ${settings.storeAddress ? `<div>${settings.storeAddress}</div>` : ''}
                    ${settings.storePhone ? `<div>هاتف: ${settings.storePhone}</div>` : ''}
                </div>
                <div class="contract-subtitle">عقد بيع بالتقسيط</div>
            </div>
            
            <div class="contract-info">
                <div>
                    <div>رقم العقد: ${contractData.contractNumber}</div>
                    <div>رقم الفاتورة: ${contractData.invoiceNumber}</div>
                </div>
                <div>
                    <div>التاريخ: ${formatDate(contractData.date)}</div>
                </div>
            </div>
            
            <div class="contract-details">
                <div class="details-section">
                    <h2>معلومات العميل</h2>
                    <div class="details-row">
                        <span class="details-label">الاسم:</span>
                        <span class="details-value">${contractData.customerName}</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">رقم الهاتف:</span>
                        <span class="details-value">${contractData.customerPhone}</span>
                    </div>
                    ${contractData.customerAddress ? `
                    <div class="details-row">
                        <span class="details-label">العنوان:</span>
                        <span class="details-value">${contractData.customerAddress}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="details-section">
                    <h2>تفاصيل العقد</h2>
                    <div class="details-row">
                        <span class="details-label">إجمالي المبلغ:</span>
                        <span class="details-value">${formatCurrency(contractData.totalAmount)} د.ع</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">الدفعة الأولى:</span>
                        <span class="details-value">${formatCurrency(contractData.downPayment)} د.ع</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">المبلغ المتبقي:</span>
                        <span class="details-value">${formatCurrency(contractData.remainingAmount)} د.ع</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">نسبة الفائدة:</span>
                        <span class="details-value">${contractData.interestRate}%</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">عدد الأقساط:</span>
                        <span class="details-value">${contractData.period} شهر</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">القسط الشهري:</span>
                        <span class="details-value">${formatCurrency(contractData.monthlyAmount)} د.ع</span>
                    </div>
                </div>
                
                <div class="payment-schedule">
                    <h2>جدول الأقساط</h2>
                    <table class="payment-table">
                        <thead>
                            <tr>
                                <th>رقم القسط</th>
                                <th>تاريخ الاستحقاق</th>
                                <th>المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Array.from({ length: contractData.period }).map((_, index) => {
                                const paymentDate = addMonthsToDate(new Date(contractData.date), index + 1);
                                return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${formatDate(paymentDate)}</td>
                                    <td>${formatCurrency(contractData.monthlyAmount)} د.ع</td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="terms">
                    <h2>الشروط والأحكام</h2>
                    <ul>
                        <li>يلتزم المشتري بدفع الأقساط الشهرية في موعدها المحدد.</li>
                        <li>في حالة التأخر عن سداد قسطين متتاليين، يحق للبائع اتخاذ الإجراءات القانونية.</li>
                        <li>لا يحق للمشتري التصرف في المنتجات المشتراة قبل سداد كامل الأقساط.</li>
                        <li>يعتبر هذا العقد ساري المفعول من تاريخ توقيعه من قبل الطرفين.</li>
                        <li>تم تحرير هذا العقد من نسختين بيد كل طرف نسخة للعمل بموجبها.</li>
                    </ul>
                </div>
                
                <div class="signatures">
                    <div class="signature-block">
                        <div class="signature-line"></div>
                        <div>توقيع البائع</div>
                    </div>
                    <div class="signature-block">
                        <div class="signature-line"></div>
                        <div>توقيع المشتري</div>
                    </div>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `;
    
    // كتابة محتوى HTML في نافذة الطباعة
    printWindow.document.write(contractHtml);
    printWindow.document.close();
}

/**
 * طباعة إيصال دفع القسط
 * @param {object} contract - بيانات العقد
 * @param {object} payment - بيانات الدفعة
 */
function printPaymentReceipt(contract, payment) {
    // إنشاء نافذة الطباعة
    const printWindow = window.open('', '_blank');
    
    // الحصول على إعدادات المتجر
    const settings = JSON.parse(localStorage.getItem('cashier-settings')) || {
        storeName: 'متجر الكاشير',
        storePhone: '',
        storeAddress: '',
        invoiceMessage: 'شكراً للتعامل معنا!'
    };
    
    // حساب المبلغ المدفوع الإجمالي
    const paidAmount = contract.paymentHistory.reduce((total, p) => total + p.amount, 0);
    
    // حساب المبلغ المتبقي
    const remainingAmount = contract.totalAmount - paidAmount;
    
    // إنشاء محتوى HTML للإيصال
    const receiptHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>إيصال دفع قسط</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    margin: 0;
                    padding: 20px;
                    direction: rtl;
                }
                .receipt-header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .receipt-title {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .store-info {
                    margin-bottom: 10px;
                }
                .receipt-subtitle {
                    font-size: 18px;
                    margin-bottom: 10px;
                }
                .receipt-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
                .receipt-details {
                    margin-bottom: 20px;
                }
                .details-section {
                    margin-bottom: 20px;
                }
                .details-section h2 {
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                    margin-bottom: 10px;
                }
                .details-row {
                    display: flex;
                    margin-bottom: 5px;
                }
                .details-label {
                    font-weight: bold;
                    min-width: 150px;
                }
                .receipt-footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 10px;
                    border-top: 1px dashed #ddd;
                }
                .signature-block {
                    text-align: center;
                    width: 200px;
                    margin: 50px auto 0;
                }
                .signature-line {
                    border-top: 1px solid #333;
                    margin-top: 50px;
                    margin-bottom: 10px;
                }
                @media print {
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                <div class="receipt-title">${settings.storeName}</div>
                <div class="store-info">
                    ${settings.storeAddress ? `<div>${settings.storeAddress}</div>` : ''}
                    ${settings.storePhone ? `<div>هاتف: ${settings.storePhone}</div>` : ''}
                </div>
                <div class="receipt-subtitle">إيصال دفع قسط</div>
            </div>
            
            <div class="receipt-info">
                <div>
                    <div>رقم العقد: ${contract.contractNumber}</div>
                    <div>رقم الفاتورة: ${contract.invoiceNumber}</div>
                </div>
                <div>
                    <div>تاريخ الدفع: ${formatDate(payment.date)}</div>
                </div>
            </div>
            
            <div class="receipt-details">
                <div class="details-section">
                    <h2>معلومات العميل</h2>
                    <div class="details-row">
                        <span class="details-label">الاسم:</span>
                        <span class="details-value">${contract.customerName}</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">رقم الهاتف:</span>
                        <span class="details-value">${contract.customerPhone}</span>
                    </div>
                </div>
                
                <div class="details-section">
                    <h2>تفاصيل الدفعة</h2>
                    <div class="details-row">
                        <span class="details-label">المبلغ المدفوع:</span>
                        <span class="details-value">${formatCurrency(payment.amount)} د.ع</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">إجمالي المبلغ:</span>
                        <span class="details-value">${formatCurrency(contract.totalAmount)} د.ع</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">إجمالي المدفوع:</span>
                        <span class="details-value">${formatCurrency(paidAmount)} د.ع</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">المبلغ المتبقي:</span>
                        <span class="details-value">${formatCurrency(remainingAmount)} د.ع</span>
                    </div>
                    ${payment.notes ? `
                    <div class="details-row">
                        <span class="details-label">ملاحظات:</span>
                        <span class="details-value">${payment.notes}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="signature-block">
                <div class="signature-line"></div>
                <div>توقيع المستلم</div>
            </div>
            
            <div class="receipt-footer">
                <p>${settings.invoiceMessage}</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `;
    
    // كتابة محتوى HTML في نافذة الطباعة
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
}

/**
 * الحصول على عقد تقسيط بواسطة المعرف
 * @param {string} contractId - معرف العقد
 * @returns {object|null} - العقد المطلوب أو null إذا لم يوجد
 */
function getInstallmentContractById(contractId) {
    return installmentContracts.find(c => c.id === contractId) || null;
}

/**
 * الحصول على الأقساط المستحقة
 * @returns {Array} - قائمة الأقساط المستحقة
 */
function getDueInstallments() {
    const today = new Date();
    
    return installmentContracts
        .filter(contract => {
            if (contract.status !== 'active') return false;
            
            const nextPaymentDate = new Date(contract.nextPaymentDate);
            return nextPaymentDate <= today;
        })
        .map(contract => ({
            id: contract.id,
            contractNumber: contract.contractNumber,
            customerName: contract.customerName,
            customerPhone: contract.customerPhone,
            monthlyAmount: contract.monthlyAmount,
            dueDate: contract.nextPaymentDate
        }));
}

/**
 * الحصول على تقرير الأقساط
 * @param {string} startDate - تاريخ البداية
 * @param {string} endDate - تاريخ النهاية
 * @param {string} status - حالة العقود (all, active, completed, late)
 * @returns {Array} - قائمة العقود المطابقة
 */
function getInstallmentsReport(startDate, endDate, status = 'all') {
    // تحويل التواريخ إلى كائنات Date
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // فلتر العقود حسب تاريخ البداية
    const filteredContracts = installmentContracts.filter(contract => {
        const contractDate = new Date(contract.startDate);
        return contractDate >= start && contractDate <= end;
    });
    
    // فلتر حسب الحالة
    if (status !== 'all') {
        return filteredContracts.filter(contract => {
            if (status === 'active' && contract.status === 'active') return true;
            if (status === 'completed' && contract.status === 'completed') return true;
            if (status === 'late') {
                return contract.status === 'active' && isLatePayment(contract);
            }
            return false;
        });
    }
    
    return filteredContracts;
}

/**
 * استعادة بيانات الأقساط
 * @param {Array} backupInstallments - نسخة احتياطية من الأقساط
 */
function restoreInstallmentsData(backupInstallments) {
    installmentContracts = backupInstallments;
    saveInstallmentContracts();
}

/**
 * الحصول على بيانات الأقساط
 * @returns {Array} - بيانات الأقساط
 */
function getInstallmentsData() {
    return installmentContracts;
}
/**
 * ملف sales.js - المسؤول عن إدارة المبيعات والفواتير
 */

// متغيرات عامة
let currentInvoice = {
    id: null,
    number: null,
    date: null,
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    paymentMethod: null,
    customer: null
};
let sales = [];

/**
 * تهيئة صفحة المبيعات
 */
function initSalesPage() {
    // تحميل المبيعات السابقة
    loadSales();
    
    // عرض المنتجات
    displaySaleProducts();
    
    // إنشاء فاتورة جديدة
    initNewInvoice();
}

/**
 * تحميل المبيعات السابقة من التخزين المحلي
 */
function loadSales() {
    const storedSales = localStorage.getItem('cashier-sales');
    if (storedSales) {
        sales = JSON.parse(storedSales);
    }
}

/**
 * حفظ المبيعات في التخزين المحلي
 */
function saveSales() {
    localStorage.setItem('cashier-sales', JSON.stringify(sales));
}

/**
 * تهيئة فاتورة جديدة
 */
function initNewInvoice() {
    const invoiceNumber = generateInvoiceNumber();
    currentInvoice = {
        id: generateUniqueId(),
        number: invoiceNumber,
        date: new Date(),
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        paymentMethod: null,
        customer: null
    };
    
    // عرض معلومات الفاتورة
    document.getElementById('invoice-number').textContent = invoiceNumber;
    document.getElementById('invoice-date').textContent = formatDate(currentInvoice.date);
    
    // إعادة تعيين قائمة العناصر
    document.getElementById('invoice-items-list').innerHTML = '';
    
    // إعادة تعيين المجموع والخصم
    document.getElementById('invoice-subtotal').textContent = '0';
    document.getElementById('discount-value').value = '';
    document.getElementById('invoice-total').textContent = '0';
}

/**
 * عرض المنتجات في صفحة المبيعات
 * @param {Array} filteredProducts - قائمة المنتجات المفلترة (اختياري)
 */
function displaySaleProducts(filteredProducts = null) {
    const productsGrid = document.getElementById('sale-products-grid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = '';
    
    const productsToDisplay = filteredProducts || products;
    
    if (productsToDisplay.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-message">لا توجد منتجات. قم بإضافة منتجات من صفحة المنتجات.</div>
        `;
        return;
    }
    
    productsToDisplay.forEach(product => {
        if (product.quantity <= 0) return; // عدم عرض المنتجات غير المتوفرة
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.setAttribute('data-id', product.id);
        
        productCard.innerHTML = `
            <div class="product-name">${product.name}</div>
            <div class="product-price">${formatCurrency(product.price)} د.ع</div>
            <div class="product-stock">المتوفر: ${product.quantity}</div>
        `;
        
        // حدث النقر لإضافة المنتج إلى الفاتورة
        productCard.addEventListener('click', () => {
            addToInvoice(product);
        });
        
        productsGrid.appendChild(productCard);
    });
}

/**
 * إضافة منتج إلى الفاتورة الحالية
 * @param {object} product - المنتج المراد إضافته
 */
function addToInvoice(product) {
    // التحقق من توفر المنتج
    if (product.quantity <= 0) {
        showAlert('المنتج غير متوفر في المخزون!', 'error');
        return;
    }
    
    // البحث عن المنتج في الفاتورة الحالية
    const existingItemIndex = currentInvoice.items.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex !== -1) {
        // المنتج موجود بالفعل، زيادة الكمية
        const existingItem = currentInvoice.items[existingItemIndex];
        
        // التحقق من توفر الكمية المطلوبة
        if (existingItem.quantity + 1 > product.quantity) {
            showAlert('الكمية المطلوبة غير متوفرة في المخزون!', 'error');
            return;
        }
        
        existingItem.quantity += 1;
        existingItem.total = existingItem.price * existingItem.quantity;
        
        // تحديث صف المنتج في الفاتورة
        updateInvoiceItemRow(existingItemIndex);
    } else {
        // إضافة المنتج كعنصر جديد
        const newItem = {
            productId: product.id,
            code: product.code,
            name: product.name,
            price: product.price,
            quantity: 1,
            total: product.price
        };
        
        currentInvoice.items.push(newItem);
        
        // إضافة صف جديد للمنتج
        addInvoiceItemRow(newItem, currentInvoice.items.length - 1);
    }
    
    // حساب إجمالي الفاتورة
    calculateInvoiceTotal();
}

/**
 * إضافة صف لمنتج في جدول الفاتورة
 * @param {object} item - عنصر الفاتورة
 * @param {number} index - مؤشر العنصر في المصفوفة
 */
function addInvoiceItemRow(item, index) {
    const invoiceItemsList = document.getElementById('invoice-items-list');
    
    const row = document.createElement('tr');
    row.setAttribute('data-index', index);
    
    row.innerHTML = `
        <td>${item.name}</td>
        <td>${formatCurrency(item.price)} د.ع</td>
        <td>
            <div class="quantity-control">
                <button class="quantity-btn minus-btn" data-index="${index}">-</button>
                <span class="quantity-value">${item.quantity}</span>
                <button class="quantity-btn plus-btn" data-index="${index}">+</button>
            </div>
        </td>
        <td class="item-total">${formatCurrency(item.total)} د.ع</td>
        <td>
            <button class="remove-item-btn" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        </td>
    `;
    
    invoiceItemsList.appendChild(row);
    
    // إضافة أحداث لأزرار التحكم بالكمية
    row.querySelector('.minus-btn').addEventListener('click', () => {
        updateItemQuantity(index, -1);
    });
    
    row.querySelector('.plus-btn').addEventListener('click', () => {
        updateItemQuantity(index, 1);
    });
    
    row.querySelector('.remove-item-btn').addEventListener('click', () => {
        removeInvoiceItem(index);
    });
}

/**
 * تحديث صف منتج في جدول الفاتورة
 * @param {number} index - مؤشر العنصر في المصفوفة
 */
function updateInvoiceItemRow(index) {
    const item = currentInvoice.items[index];
    const row = document.querySelector(`tr[data-index="${index}"]`);
    
    if (row) {
        row.querySelector('.quantity-value').textContent = item.quantity;
        row.querySelector('.item-total').textContent = `${formatCurrency(item.total)} د.ع`;
    }
}

/**
 * تحديث كمية عنصر في الفاتورة
 * @param {number} index - مؤشر العنصر في المصفوفة
 * @param {number} change - التغيير في الكمية (1 للزيادة، -1 للنقصان)
 */
function updateItemQuantity(index, change) {
    const item = currentInvoice.items[index];
    
    // الحصول على معلومات المنتج الحالية
    const product = getProductById(item.productId);
    
    if (change > 0) {
        // التحقق من توفر المخزون عند الزيادة
        if (item.quantity + change > product.quantity) {
            showAlert('الكمية المطلوبة غير متوفرة في المخزون!', 'error');
            return;
        }
    } else if (change < 0) {
        // التحقق من أن الكمية لا تقل عن 1
        if (item.quantity + change < 1) {
            return;
        }
    }
    
    // تحديث الكمية والإجمالي
    item.quantity += change;
    item.total = item.price * item.quantity;
    
    // تحديث صف المنتج
    updateInvoiceItemRow(index);
    
    // حساب إجمالي الفاتورة
    calculateInvoiceTotal();
}

/**
 * إزالة عنصر من الفاتورة
 * @param {number} index - مؤشر العنصر في المصفوفة
 */
function removeInvoiceItem(index) {
    // حذف العنصر من المصفوفة
    currentInvoice.items.splice(index, 1);
    
    // إعادة رسم جدول العناصر
    const invoiceItemsList = document.getElementById('invoice-items-list');
    invoiceItemsList.innerHTML = '';
    
    currentInvoice.items.forEach((item, idx) => {
        addInvoiceItemRow(item, idx);
    });
    
    // حساب إجمالي الفاتورة
    calculateInvoiceTotal();
}

/**
 * حساب إجمالي الفاتورة
 * @returns {number} - إجمالي الفاتورة
 */
function calculateInvoiceTotal() {
    // حساب المجموع الفرعي
    currentInvoice.subtotal = currentInvoice.items.reduce((sum, item) => sum + item.total, 0);
    
    // حساب الخصم
    const discountInput = document.getElementById('discount-value');
    const discountTypeSelect = document.getElementById('discount-type');
    
    const discountValue = parseFloat(discountInput.value) || 0;
    const discountType = discountTypeSelect.value;
    
    if (discountType === 'percentage') {
        currentInvoice.discount = (currentInvoice.subtotal * discountValue) / 100;
    } else {
        currentInvoice.discount = discountValue;
    }
    
    // التأكد من أن الخصم لا يتجاوز المجموع الفرعي
    if (currentInvoice.discount > currentInvoice.subtotal) {
        currentInvoice.discount = currentInvoice.subtotal;
    }
    
    // حساب الإجمالي
    currentInvoice.total = currentInvoice.subtotal - currentInvoice.discount;
    
    // تحديث العرض
    document.getElementById('invoice-subtotal').textContent = formatCurrency(currentInvoice.subtotal);
    document.getElementById('invoice-total').textContent = formatCurrency(currentInvoice.total);
    
    return currentInvoice.total;
}

/**
 * فحص وجود عناصر في الفاتورة
 * @returns {boolean} - true إذا كان هناك عناصر، false خلاف ذلك
 */
function hasInvoiceItems() {
    return currentInvoice.items.length > 0;
}

/**
 * معالجة الدفع النقدي
 */
function processCashPayment() {
    const paidAmount = parseFloat(document.getElementById('cash-amount').value);
    
    if (isNaN(paidAmount) || paidAmount < currentInvoice.total) {
        showAlert('المبلغ المدفوع غير كافٍ!', 'error');
        return;
    }
    
    // حفظ معلومات الدفع
    currentInvoice.paymentMethod = 'cash';
    currentInvoice.paidAmount = paidAmount;
    currentInvoice.change = paidAmount - currentInvoice.total;
    
    // حفظ الفاتورة
    saveSale();
    
    // طباعة الفاتورة
    printCurrentInvoice();
    
    // إنشاء فاتورة جديدة
    initNewInvoice();
    
    // إغلاق المودال
    closeAllModals();
    
    // عرض رسالة نجاح
    showAlert('تمت عملية البيع بنجاح!', 'success');
}

/**
 * معالجة الدفع بالتقسيط
 */
function processInstallmentPayment() {
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;
    const customerAddress = document.getElementById('customer-address').value;
    const downPayment = parseFloat(document.getElementById('down-payment').value) || 0;
    const installmentPeriod = parseInt(document.getElementById('installment-period').value) || 12;
    const interestRate = parseFloat(document.getElementById('interest-rate').value) || 0;
    
    // التحقق من المدخلات
    if (!customerName || !customerPhone) {
        showAlert('الرجاء إدخال معلومات العميل المطلوبة!', 'error');
        return;
    }
    
    // حساب المبلغ بعد إضافة الفائدة
    const interestAmount = currentInvoice.total * (interestRate / 100);
    const totalWithInterest = currentInvoice.total + interestAmount;
    
    // حساب المبلغ المتبقي بعد الدفعة الأولى
    const remainingAmount = totalWithInterest - downPayment;
    
    // حساب القسط الشهري
    const monthlyInstallment = remainingAmount / installmentPeriod;
    
    // حفظ معلومات الدفع
    currentInvoice.paymentMethod = 'installment';
    currentInvoice.customer = {
        name: customerName,
        phone: customerPhone,
        address: customerAddress
    };
    currentInvoice.installmentDetails = {
        totalWithInterest: totalWithInterest,
        downPayment: downPayment,
        remainingAmount: remainingAmount,
        installmentPeriod: installmentPeriod,
        monthlyInstallment: monthlyInstallment,
        interestRate: interestRate
    };
    
    // حفظ الفاتورة
    const saleId = saveSale();
    
    // إنشاء عقد التقسيط
    createInstallmentContract(saleId);
    
    // طباعة الفاتورة
    printCurrentInvoice();
    
    // إنشاء فاتورة جديدة
    initNewInvoice();
    
    // إغلاق المودال
    closeAllModals();
    
    // عرض رسالة نجاح
    showAlert('تمت عملية البيع بالتقسيط بنجاح!', 'success');
}

/**
 * حفظ عملية البيع
 * @returns {string} - معرف عملية البيع
 */
function saveSale() {
    const sale = JSON.parse(JSON.stringify(currentInvoice));
    
    // تحديث المخزون
    currentInvoice.items.forEach(item => {
        updateProductStock(item.productId, -item.quantity);
    });
    
    // تحديث آخر رقم فاتورة
    const invoiceNumParts = currentInvoice.number.split('-');
    const lastNumStr = invoiceNumParts[invoiceNumParts.length - 1];
    const lastNum = parseInt(lastNumStr);
    updateLastInvoiceNumber(lastNum);
    
    // إضافة تاريخ العملية
    sale.timestamp = new Date().toISOString();
    
    // إضافة عملية البيع إلى المصفوفة
    sales.push(sale);
    
    // حفظ المبيعات
    saveSales();
    
    // تسجيل الحركة
    const actionType = sale.paymentMethod === 'cash' ? 'بيع نقدي' : 'بيع بالتقسيط';
    recordTransaction(actionType, {
        invoiceId: sale.id,
        invoiceNumber: sale.number,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        customerName: sale.customer ? sale.customer.name : null
    });
    
    return sale.id;
}

/**
 * إنشاء عقد تقسيط
 * @param {string} saleId - معرف عملية البيع
 */
function createInstallmentContract(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || sale.paymentMethod !== 'installment') return;
    
    const contract = {
        id: generateUniqueId(),
        saleId: saleId,
        invoiceNumber: sale.number,
        contractNumber: `INST-${sale.number.split('-')[1]}-${sale.number.split('-')[2]}`,
        customerName: sale.customer.name,
        customerPhone: sale.customer.phone,
        customerAddress: sale.customer.address,
        totalAmount: sale.installmentDetails.totalWithInterest,
        downPayment: sale.installmentDetails.downPayment,
        remainingAmount: sale.installmentDetails.remainingAmount,
        originalPeriod: sale.installmentDetails.installmentPeriod,
        remainingPeriod: sale.installmentDetails.installmentPeriod,
        monthlyAmount: sale.installmentDetails.monthlyInstallment,
        interestRate: sale.installmentDetails.interestRate,
        startDate: new Date().toISOString(),
        nextPaymentDate: addMonthsToDate(new Date(), 1).toISOString(),
        paymentHistory: [
            {
                amount: sale.installmentDetails.downPayment,
                date: new Date().toISOString(),
                notes: 'الدفعة الأولى'
            }
        ],
        status: 'active'
    };
    
    // إضافة العقد إلى قائمة العقود
    addInstallmentContract(contract);
    
    return contract.id;
}

/**
 * طباعة الفاتورة الحالية
 */
function printCurrentInvoice() {
    // إعداد بيانات الفاتورة للطباعة
    const invoiceData = {
        invoiceNumber: currentInvoice.number,
        date: currentInvoice.date,
        items: currentInvoice.items,
        subtotal: currentInvoice.subtotal,
        discount: currentInvoice.discount,
        total: currentInvoice.total,
        paymentMethod: currentInvoice.paymentMethod,
        paidAmount: currentInvoice.paidAmount || 0
    };
    
    // إضافة معلومات العميل في حالة التقسيط
    if (currentInvoice.paymentMethod === 'installment' && currentInvoice.customer) {
        invoiceData.customerName = currentInvoice.customer.name;
        invoiceData.customerPhone = currentInvoice.customer.phone;
        
        // إضافة تفاصيل التقسيط
        invoiceData.totalWithInterest = currentInvoice.installmentDetails.totalWithInterest;
        invoiceData.downPayment = currentInvoice.installmentDetails.downPayment;
        invoiceData.remainingAmount = currentInvoice.installmentDetails.remainingAmount;
        invoiceData.installmentPeriod = currentInvoice.installmentDetails.installmentPeriod;
        invoiceData.monthlyInstallment = currentInvoice.installmentDetails.monthlyInstallment;
    }
    
    // طباعة الفاتورة
    printInvoice(invoiceData);
}

/**
 * إلغاء الفاتورة الحالية
 */
function clearInvoice() {
    if (!hasInvoiceItems()) return;
    
    if (confirm('هل أنت متأكد من إلغاء الفاتورة الحالية؟')) {
        initNewInvoice();
        showAlert('تم إلغاء الفاتورة!', 'info');
    }
}

/**
 * الحصول على المبيعات حسب التاريخ
 * @param {string} date - التاريخ المطلوب
 * @returns {Array} - المبيعات في التاريخ المحدد
 */
function getSalesByDate(date) {
    // تحويل التاريخ إلى yyyy-mm-dd
    const targetDate = date.split('T')[0];
    
    return sales.filter(sale => {
        const saleDate = sale.timestamp.split('T')[0];
        return saleDate === targetDate;
    });
}

/**
 * الحصول على مبيعات نطاق زمني
 * @param {string} startDate - تاريخ البداية
 * @param {string} endDate - تاريخ النهاية
 * @returns {Array} - المبيعات في النطاق الزمني
 */
function getSalesByDateRange(startDate, endDate) {
    // تحويل التواريخ إلى كائنات Date
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return sales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= start && saleDate <= end;
    });
}

/**
 * الحصول على إجمالي المبيعات في نطاق زمني
 * @param {string} startDate - تاريخ البداية
 * @param {string} endDate - تاريخ النهاية
 * @param {string} paymentMethod - طريقة الدفع (اختياري)
 * @returns {number} - إجمالي المبيعات
 */
function getTotalSalesByDateRange(startDate, endDate, paymentMethod = null) {
    const filteredSales = getSalesByDateRange(startDate, endDate);
    
    // تصفية حسب طريقة الدفع إذا تم تحديدها
    const salesByMethod = paymentMethod 
        ? filteredSales.filter(sale => sale.paymentMethod === paymentMethod)
        : filteredSales;
    
    // حساب الإجمالي
    return salesByMethod.reduce((total, sale) => total + sale.total, 0);
}

/**
 * الحصول على عدد المبيعات في نطاق زمني
 * @param {string} startDate - تاريخ البداية
 * @param {string} endDate - تاريخ النهاية
 * @param {string} paymentMethod - طريقة الدفع (اختياري)
 * @returns {number} - عدد المبيعات
 */
function getSalesCountByDateRange(startDate, endDate, paymentMethod = null) {
    const filteredSales = getSalesByDateRange(startDate, endDate);
    
    // تصفية حسب طريقة الدفع إذا تم تحديدها
    const salesByMethod = paymentMethod 
        ? filteredSales.filter(sale => sale.paymentMethod === paymentMethod)
        : filteredSales;
    
    return salesByMethod.length;
}

/**
 * الحصول على تقرير مبيعات المنتجات في نطاق زمني
 * @param {string} startDate - تاريخ البداية
 * @param {string} endDate - تاريخ النهاية
 * @returns {Array} - تقرير المبيعات
 */
function getProductSalesReport(startDate, endDate) {
    const filteredSales = getSalesByDateRange(startDate, endDate);
    const productSales = {};
    
    // تجميع مبيعات كل منتج
    filteredSales.forEach(sale => {
        sale.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = {
                    productId: item.productId,
                    name: item.name,
                    code: item.code,
                    quantity: 0,
                    total: 0
                };
            }
            
            productSales[item.productId].quantity += item.quantity;
            productSales[item.productId].total += item.total;
        });
    });
    
    // تحويل الكائن إلى مصفوفة وترتيبها حسب الإجمالي
    return Object.values(productSales).sort((a, b) => b.total - a.total);
}

/**
 * استعادة بيانات المبيعات
 * @param {Array} backupSales - نسخة احتياطية من المبيعات
 */
function restoreSalesData(backupSales) {
    sales = backupSales;
    saveSales();
}

/**
 * الحصول على بيانات المبيعات
 * @returns {Array} - بيانات المبيعات
 */
function getSalesData() {
    return sales;
}
/**
 * ملف utils.js - يحتوي على وظائف مساعدة عامة للنظام
 */

/**
 * إنشاء معرف فريد
 * @returns {string} - معرف فريد
 */
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
}

/**
* تنسيق التاريخ بالصيغة العربية
* @param {string|Date} date - التاريخ المراد تنسيقه
* @returns {string} - التاريخ المنسق
*/
function formatDate(date) {
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
  });
}

/**
* تنسيق الوقت
* @param {string|Date} date - التاريخ والوقت
* @returns {string} - الوقت المنسق
*/
function formatTime(date) {
  const dateObj = new Date(date);
  return dateObj.toLocaleTimeString('ar-IQ', {
      hour: '2-digit',
      minute: '2-digit'
  });
}

/**
* تنسيق التاريخ والوقت
* @param {string|Date} date - التاريخ والوقت
* @returns {string} - التاريخ والوقت المنسق
*/
function formatDateTime(date) {
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
  });
}

/**
* الحصول على التاريخ الحالي بصيغة YYYY-MM-DD
* @returns {string} - التاريخ الحالي
*/
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

/**
* تنسيق المبلغ المالي
* @param {number} amount - المبلغ المالي
* @returns {string} - المبلغ المنسق
*/
function formatCurrency(amount) {
  // تحويل المبلغ إلى رقم في حال كان نصاً
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // تنسيق الرقم بالفواصل للآلاف
  return numAmount.toLocaleString('ar-IQ');
}

/**
* إنشاء رقم فاتورة جديد
* @returns {string} - رقم الفاتورة
*/
function generateInvoiceNumber() {
  const today = new Date();
  const year = today.getFullYear().toString().substr(2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  
  // الحصول على آخر رقم فاتورة
  const lastInvoiceNum = getLastInvoiceNumber();
  const nextNum = (lastInvoiceNum + 1).toString().padStart(4, '0');
  
  return `INV-${year}${month}${day}-${nextNum}`;
}

/**
* الحصول على آخر رقم فاتورة
* @returns {number} - آخر رقم فاتورة
*/
function getLastInvoiceNumber() {
  // استرجاع آخر رقم فاتورة من التخزين المحلي
  const lastNum = localStorage.getItem('last-invoice-number');
  
  if (lastNum) {
      return parseInt(lastNum);
  }
  
  return 0;
}

/**
* تحديث آخر رقم فاتورة
* @param {number} number - رقم الفاتورة
*/
function updateLastInvoiceNumber(number) {
  localStorage.setItem('last-invoice-number', number.toString());
}

/**
* تصدير جدول إلى ملف CSV
* @param {HTMLTableElement} table - عنصر الجدول
* @param {string} filename - اسم الملف
*/
function exportTableToCSV(table, filename) {
  const rows = Array.from(table.querySelectorAll('tr'));
  
  // استخراج البيانات من الجدول
  const csvContent = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => {
          // تنظيف النص
          let text = cell.textContent.trim();
          // تغليف النص بعلامات الاقتباس إذا كان يحتوي على فواصل
          if (text.includes(',')) {
              text = `"${text}"`;
          }
          return text;
      }).join(',');
  }).join('\n');
  
  // إنشاء ملف التصدير
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  URL.revokeObjectURL(url);
}

/**
* طباعة فاتورة
* @param {object} invoiceData - بيانات الفاتورة
*/
function printInvoice(invoiceData) {
  // إنشاء نافذة الطباعة
  const printWindow = window.open('', '_blank');
  
  // الحصول على إعدادات المتجر
  const settings = JSON.parse(localStorage.getItem('cashier-settings')) || {
      storeName: 'متجر الكاشير',
      storePhone: '',
      storeAddress: '',
      invoiceMessage: 'شكراً لتسوقك معنا! نتمنى لك يوماً سعيداً.'
  };
  
  // إنشاء محتوى HTML للفاتورة
  const invoiceHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
          <meta charset="UTF-8">
          <title>فاتورة رقم ${invoiceData.invoiceNumber}</title>
          <style>
              body {
                  font-family: 'Arial', sans-serif;
                  margin: 0;
                  padding: 20px;
                  direction: rtl;
              }
              .invoice-header {
                  text-align: center;
                  margin-bottom: 20px;
              }
              .invoice-title {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 5px;
              }
              .store-info {
                  margin-bottom: 10px;
              }
              .invoice-details {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 20px;
              }
              .invoice-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
              }
              .invoice-table th, .invoice-table td {
                  padding: 8px;
                  border: 1px solid #ddd;
                  text-align: right;
              }
              .invoice-table th {
                  background-color: #f2f2f2;
              }
              .invoice-summary {
                  width: 300px;
                  margin-right: auto;
                  margin-left: 0;
              }
              .summary-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 5px 0;
              }
              .total-row {
                  font-weight: bold;
                  border-top: 1px solid #ddd;
                  padding-top: 5px;
                  margin-top: 5px;
              }
              .customer-info {
                  margin-top: 20px;
                  padding: 10px;
                  border: 1px solid #ddd;
                  border-radius: 5px;
              }
              .invoice-footer {
                  text-align: center;
                  margin-top: 30px;
                  padding-top: 10px;
                  border-top: 1px dashed #ddd;
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
          <div class="invoice-header">
              <div class="invoice-title">${settings.storeName}</div>
              <div class="store-info">
                  ${settings.storeAddress ? `<div>${settings.storeAddress}</div>` : ''}
                  ${settings.storePhone ? `<div>هاتف: ${settings.storePhone}</div>` : ''}
              </div>
          </div>
          
          <div class="invoice-details">
              <div>
                  <div>رقم الفاتورة: ${invoiceData.invoiceNumber}</div>
                  <div>التاريخ: ${formatDateTime(invoiceData.date)}</div>
              </div>
              ${invoiceData.customerName ? `
              <div>
                  <div>العميل: ${invoiceData.customerName}</div>
                  ${invoiceData.customerPhone ? `<div>الهاتف: ${invoiceData.customerPhone}</div>` : ''}
              </div>
              ` : ''}
          </div>
          
          <table class="invoice-table">
              <thead>
                  <tr>
                      <th>المنتج</th>
                      <th>السعر</th>
                      <th>الكمية</th>
                      <th>الإجمالي</th>
                  </tr>
              </thead>
              <tbody>
                  ${invoiceData.items.map(item => `
                  <tr>
                      <td>${item.name}</td>
                      <td>${formatCurrency(item.price)} د.ع</td>
                      <td>${item.quantity}</td>
                      <td>${formatCurrency(item.price * item.quantity)} د.ع</td>
                  </tr>
                  `).join('')}
              </tbody>
          </table>
          
          <div class="invoice-summary">
              <div class="summary-row">
                  <span>المجموع:</span>
                  <span>${formatCurrency(invoiceData.subtotal)} د.ع</span>
              </div>
              ${invoiceData.discount > 0 ? `
              <div class="summary-row">
                  <span>الخصم:</span>
                  <span>${formatCurrency(invoiceData.discount)} د.ع</span>
              </div>
              ` : ''}
              <div class="summary-row total-row">
                  <span>الإجمالي:</span>
                  <span>${formatCurrency(invoiceData.total)} د.ع</span>
              </div>
              ${invoiceData.paymentMethod === 'cash' ? `
              <div class="summary-row">
                  <span>المدفوع:</span>
                  <span>${formatCurrency(invoiceData.paidAmount)} د.ع</span>
              </div>
              <div class="summary-row">
                  <span>المتبقي:</span>
                  <span>${formatCurrency(invoiceData.paidAmount - invoiceData.total)} د.ع</span>
              </div>
              ` : ''}
          </div>
          
          ${invoiceData.paymentMethod === 'installment' ? `
          <div class="customer-info">
              <h3>تفاصيل التقسيط</h3>
              <div class="summary-row">
                  <span>إجمالي المبلغ مع الفائدة:</span>
                  <span>${formatCurrency(invoiceData.totalWithInterest)} د.ع</span>
              </div>
              <div class="summary-row">
                  <span>الدفعة الأولى:</span>
                  <span>${formatCurrency(invoiceData.downPayment)} د.ع</span>
              </div>
              <div class="summary-row">
                  <span>المبلغ المتبقي:</span>
                  <span>${formatCurrency(invoiceData.remainingAmount)} د.ع</span>
              </div>
              <div class="summary-row">
                  <span>عدد الأقساط:</span>
                  <span>${invoiceData.installmentPeriod} شهر</span>
              </div>
              <div class="summary-row">
                  <span>القسط الشهري:</span>
                  <span>${formatCurrency(invoiceData.monthlyInstallment)} د.ع</span>
              </div>
          </div>
          ` : ''}
          
          <div class="invoice-footer">
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
  printWindow.document.write(invoiceHtml);
  printWindow.document.close();
}

/**
* طباعة تقرير
* @param {string} title - عنوان التقرير
* @param {string} content - محتوى التقرير بصيغة HTML
*/
function printReport(title, content) {
  // إنشاء نافذة الطباعة
  const printWindow = window.open('', '_blank');
  
  // الحصول على إعدادات المتجر
  const settings = JSON.parse(localStorage.getItem('cashier-settings')) || {
      storeName: 'متجر الكاشير'
  };
  
  // إنشاء محتوى HTML للتقرير
  const reportHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
              body {
                  font-family: 'Arial', sans-serif;
                  margin: 0;
                  padding: 20px;
                  direction: rtl;
              }
              .report-header {
                  text-align: center;
                  margin-bottom: 20px;
              }
              .report-title {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 5px;
              }
              .report-date {
                  margin-bottom: 20px;
              }
              .report-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
              }
              .report-table th, .report-table td {
                  padding: 8px;
                  border: 1px solid #ddd;
                  text-align: right;
              }
              .report-table th {
                  background-color: #f2f2f2;
              }
              .report-summary {
                  margin-top: 20px;
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
          <div class="report-header">
              <div class="report-title">${settings.storeName}</div>
              <div class="report-title">${title}</div>
              <div class="report-date">تاريخ التقرير: ${formatDate(new Date())}</div>
          </div>
          
          <div class="report-content">
              ${content}
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
  printWindow.document.write(reportHtml);
  printWindow.document.close();
}

/**
* التحقق من حالة الاتصال بالإنترنت
* @returns {boolean} - حالة الاتصال
*/
function isOnline() {
  return navigator.onLine;
}

/**
* عرض رسالة تنبيه
* @param {string} message - نص الرسالة
* @param {string} type - نوع الرسالة (success, error, warning, info)
* @param {number} duration - مدة ظهور الرسالة بالمللي ثانية
*/
function showAlert(message, type = 'info', duration = 3000) {
  // التحقق من وجود عنصر الرسائل
  let alertsContainer = document.getElementById('alerts-container');
  
  // إنشاء عنصر الرسائل إذا لم يكن موجوداً
  if (!alertsContainer) {
      alertsContainer = document.createElement('div');
      alertsContainer.id = 'alerts-container';
      alertsContainer.style.position = 'fixed';
      alertsContainer.style.top = '20px';
      alertsContainer.style.left = '50%';
      alertsContainer.style.transform = 'translateX(-50%)';
      alertsContainer.style.zIndex = '9999';
      document.body.appendChild(alertsContainer);
  }
  
  // إنشاء عنصر الرسالة
  const alertElement = document.createElement('div');
  alertElement.className = `alert alert-${type}`;
  alertElement.textContent = message;
  
  // تحديد نمط الرسالة
  alertElement.style.padding = '12px 20px';
  alertElement.style.margin = '5px 0';
  alertElement.style.borderRadius = '4px';
  alertElement.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
  alertElement.style.opacity = '0';
  alertElement.style.transition = 'opacity 0.3s';
  
  // تحديد لون الرسالة حسب النوع
  switch (type) {
      case 'success':
          alertElement.style.backgroundColor = '#4CAF50';
          alertElement.style.color = 'white';
          break;
      case 'error':
          alertElement.style.backgroundColor = '#F44336';
          alertElement.style.color = 'white';
          break;
      case 'warning':
          alertElement.style.backgroundColor = '#FF9800';
          alertElement.style.color = 'white';
          break;
      default:
          alertElement.style.backgroundColor = '#2196F3';
          alertElement.style.color = 'white';
  }
  
  // إضافة الرسالة إلى الحاوية
  alertsContainer.appendChild(alertElement);
  
  // إظهار الرسالة بتأثير
  setTimeout(() => {
      alertElement.style.opacity = '1';
  }, 10);
  
  // إخفاء الرسالة بعد المدة المحددة
  setTimeout(() => {
      alertElement.style.opacity = '0';
      setTimeout(() => {
          alertsContainer.removeChild(alertElement);
          
          // إزالة الحاوية إذا لم تعد هناك رسائل
          if (alertsContainer.children.length === 0) {
              document.body.removeChild(alertsContainer);
          }
      }, 300);
  }, duration);
}

/**
* تصحيح الأرقام العربية للاستخدام في العمليات الحسابية
* @param {string} numStr - النص الذي يحتوي على أرقام
* @returns {string} - النص بعد تصحيح الأرقام
*/
function fixArabicNumbers(numStr) {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const hindiNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let result = numStr.toString();
  
  for (let i = 0; i < 10; i++) {
      const regex1 = new RegExp(arabicNumbers[i], 'g');
      const regex2 = new RegExp(hindiNumbers[i], 'g');
      result = result.replace(regex1, i).replace(regex2, i);
  }
  
  return result;
}

/**
* تعطيل/تفعيل عنصر
* @param {HTMLElement} element - العنصر المراد تعديله
* @param {boolean} disabled - حالة التعطيل
*/
function setElementDisabled(element, disabled) {
  if (element) {
      element.disabled = disabled;
      
      if (disabled) {
          element.setAttribute('disabled', 'disabled');
          element.classList.add('disabled');
      } else {
          element.removeAttribute('disabled');
          element.classList.remove('disabled');
      }
  }
}

/**
* الحصول على التاريخ بصيغة yyyy-mm-dd
* @param {Date} date - كائن التاريخ
* @returns {string} - التاريخ بالصيغة المطلوبة
*/
function getFormattedDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
* مقارنة التواريخ (يوم فقط)
* @param {Date|string} date1 - التاريخ الأول
* @param {Date|string} date2 - التاريخ الثاني
* @returns {number} - -1 إذا كان التاريخ الأول أقدم، 0 إذا كانا متساويين، 1 إذا كان التاريخ الأول أحدث
*/
function compareDates(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  // تعيين الوقت إلى الصفر لمقارنة اليوم فقط
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

/**
* الحصول على الفرق بين تاريخين بالأيام
* @param {Date|string} date1 - التاريخ الأول
* @param {Date|string} date2 - التاريخ الثاني
* @returns {number} - عدد الأيام بين التاريخين
*/
function getDaysDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  // تعيين الوقت إلى الصفر لمقارنة اليوم فقط
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  // حساب الفرق بالمللي ثانية وتحويله إلى أيام
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
* إضافة أشهر إلى تاريخ
* @param {Date|string} date - التاريخ الأصلي
* @param {number} months - عدد الأشهر للإضافة
* @returns {Date} - التاريخ الجديد بعد إضافة الأشهر
*/
function addMonthsToDate(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
* تحويل قيمة نصية إلى رقم
* @param {string} value - القيمة النصية
* @returns {number} - القيمة الرقمية
*/
function parseNumberValue(value) {
  // إزالة الفواصل والمسافات
  const cleanValue = fixArabicNumbers(value.toString().replace(/,/g, '').trim());
  return parseFloat(cleanValue) || 0;
}
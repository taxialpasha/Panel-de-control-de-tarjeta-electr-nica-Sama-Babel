/**
 * ملف inventory.js - المسؤول عن إدارة المنتجات والمخزون والتصنيفات
 */

// متغيرات عامة
let products = [];
let categories = [];

/**
 * تهيئة بيانات المخزون
 */
function initInventory() {
    loadProducts();
    loadCategories();
}

/**
 * تحميل المنتجات من التخزين المحلي
 */
function loadProducts() {
    const storedProducts = localStorage.getItem('cashier-products');
    if (storedProducts) {
        products = JSON.parse(storedProducts);
    }
    
    displayProducts();
}

/**
 * تحميل التصنيفات من التخزين المحلي
 */
function loadCategories() {
    const storedCategories = localStorage.getItem('cashier-categories');
    if (storedCategories) {
        categories = JSON.parse(storedCategories);
    } else {
        // إنشاء تصنيف افتراضي إذا لم توجد تصنيفات
        categories = [
            { id: 'default', name: 'عام' }
        ];
        saveCategories();
    }
    
    displayCategories();
}

/**
 * عرض المنتجات في الجدول
 * @param {Array} filteredProducts - قائمة المنتجات المفلترة (اختياري)
 */
function displayProducts(filteredProducts = null) {
    const productsTable = document.getElementById('products-list');
    if (!productsTable) return;
    
    productsTable.innerHTML = '';
    
    const productsToDisplay = filteredProducts || products;
    
    if (productsToDisplay.length === 0) {
        productsTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">لا توجد منتجات. قم بإضافة منتجات جديدة.</td>
            </tr>
        `;
        return;
    }
    
    productsToDisplay.forEach(product => {
        const category = getCategoryById(product.categoryId);
        const row = document.createElement('tr');
        
        // تحديد نمط الصف حسب كمية المخزون
        if (product.quantity <= settings.stockAlert) {
            row.classList.add('low-stock');
        }
        
        row.innerHTML = `
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${category ? category.name : 'غير مصنف'}</td>
            <td>${formatCurrency(product.price)} د.ع</td>
            <td>${product.quantity}</td>
            <td class="actions-cell">
                <button class="edit-product-btn table-btn primary-btn" data-id="${product.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-product-btn table-btn danger-btn" data-id="${product.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        productsTable.appendChild(row);
    });
    
    // إضافة أحداث للأزرار
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.getAttribute('data-id');
            openProductModal(productId);
        });
    });
    
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.getAttribute('data-id');
            deleteProduct(productId);
        });
    });
}

/**
 * عرض التصنيفات في القائمة
 */
function displayCategories() {
    // عرض التصنيفات في صفحة المنتجات
    const categoriesList = document.getElementById('categories-list');
    if (categoriesList) {
        // الحفاظ على خيار "جميع المنتجات"
        categoriesList.innerHTML = `
            <li class="category-item active" data-category="all">جميع المنتجات</li>
        `;
        
        categories.forEach(category => {
            const li = document.createElement('li');
            li.className = 'category-item';
            li.setAttribute('data-category', category.id);
            li.innerHTML = `
                ${category.name}
                <div class="category-actions">
                    <i class="fas fa-edit edit-category" data-id="${category.id}"></i>
                    <i class="fas fa-trash delete-category" data-id="${category.id}"></i>
                </div>
            `;
            categoriesList.appendChild(li);
        });
        
        // إضافة أحداث للتصنيفات
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // تجاهل النقر على أزرار التعديل/الحذف
                if (e.target.classList.contains('fas')) return;
                
                document.querySelectorAll('.category-item').forEach(i => {
                    i.classList.remove('active');
                });
                item.classList.add('active');
                
                const categoryId = item.getAttribute('data-category');
                if (categoryId === 'all') {
                    displayProducts();
                } else {
                    const filteredProducts = products.filter(p => p.categoryId === categoryId);
                    displayProducts(filteredProducts);
                }
            });
        });
        
        // إضافة أحداث لأزرار التعديل/الحذف
        document.querySelectorAll('.edit-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const categoryId = btn.getAttribute('data-id');
                openCategoryModal(categoryId);
            });
        });
        
        document.querySelectorAll('.delete-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const categoryId = btn.getAttribute('data-id');
                deleteCategory(categoryId);
            });
        });
    }
    
    // تحديث قائمة التصنيفات في نموذج المنتج
    const categorySelect = document.getElementById('product-category');
    if (categorySelect) {
        categorySelect.innerHTML = '';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }
    
    // تحديث تصنيفات صفحة المبيعات
    updateSalesCategories();
}

/**
 * تحديث أقسام التصنيفات في صفحة المبيعات
 */
function updateSalesCategories() {
    const salesCategories = document.getElementById('sale-categories');
    if (!salesCategories) return;
    
    salesCategories.innerHTML = `
        <div class="category-tab active" data-category="all">الكل</div>
    `;
    
    categories.forEach(category => {
        const tab = document.createElement('div');
        tab.className = 'category-tab';
        tab.setAttribute('data-category', category.id);
        tab.textContent = category.name;
        salesCategories.appendChild(tab);
    });
    
    // إضافة أحداث للأقسام
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => {
                t.classList.remove('active');
            });
            tab.classList.add('active');
            
            const categoryId = tab.getAttribute('data-category');
            if (categoryId === 'all') {
                displaySaleProducts();
            } else {
                const filteredProducts = products.filter(p => p.categoryId === categoryId);
                displaySaleProducts(filteredProducts);
            }
        });
    });
}

/**
 * حفظ المنتجات في التخزين المحلي
 */
function saveProducts() {
    localStorage.setItem('cashier-products', JSON.stringify(products));
}

/**
 * حفظ التصنيفات في التخزين المحلي
 */
function saveCategories() {
    localStorage.setItem('cashier-categories', JSON.stringify(categories));
}

/**
 * إضافة أو تعديل منتج
 */
function saveProduct() {
    const form = document.getElementById('product-form');
    const productId = form.getAttribute('data-product-id');
    
    const productData = {
        code: document.getElementById('product-code').value,
        name: document.getElementById('product-name').value,
        categoryId: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        cost: parseFloat(document.getElementById('product-cost').value),
        quantity: parseInt(document.getElementById('product-quantity').value)
    };
    
    // التحقق من وجود المنتج بنفس الرمز
    const existingProductIndex = products.findIndex(p => p.code === productData.code && p.id !== productId);
    if (existingProductIndex >= 0) {
        alert('يوجد منتج آخر بنفس الرمز. الرجاء استخدام رمز مختلف.');
        return;
    }
    
    if (productId) {
        // تعديل منتج موجود
        const index = products.findIndex(p => p.id === productId);
        if (index !== -1) {
            // الاحتفاظ ببعض البيانات من المنتج الأصلي
            productData.id = productId;
            productData.soldCount = products[index].soldCount || 0;
            
            products[index] = productData;
        }
    } else {
        // إضافة منتج جديد
        productData.id = generateUniqueId();
        productData.soldCount = 0;
        
        products.push(productData);
    }
    
    // حفظ التغييرات
    saveProducts();
    
    // تحديث العرض
    displayProducts();
    
    // تسجيل الحركة
    const actionType = productId ? 'تعديل منتج' : 'إضافة منتج';
    recordTransaction(actionType, {
        productId: productData.id,
        productName: productData.name,
        productCode: productData.code
    });
    
    // إغلاق المودال
    closeAllModals();
    
    // عرض رسالة نجاح
    showAlert(`تم ${productId ? 'تعديل' : 'إضافة'} المنتج بنجاح!`, 'success');
}

/**
 * إضافة أو تعديل تصنيف
 */
function saveCategory() {
    const form = document.getElementById('category-form');
    const categoryId = form.getAttribute('data-category-id');
    
    const categoryName = document.getElementById('category-name').value;
    
    // التحقق من وجود تصنيف بنفس الاسم
    const existingCategoryIndex = categories.findIndex(c => c.name === categoryName && c.id !== categoryId);
    if (existingCategoryIndex >= 0) {
        alert('يوجد تصنيف آخر بنفس الاسم. الرجاء استخدام اسم مختلف.');
        return;
    }
    
    if (categoryId) {
        // تعديل تصنيف موجود
        const index = categories.findIndex(c => c.id === categoryId);
        if (index !== -1) {
            categories[index].name = categoryName;
        }
    } else {
        // إضافة تصنيف جديد
        const newCategory = {
            id: generateUniqueId(),
            name: categoryName
        };
        
        categories.push(newCategory);
    }
    
    // حفظ التغييرات
    saveCategories();
    
    // تحديث العرض
    displayCategories();
    displayProducts();
    
    // تسجيل الحركة
    const actionType = categoryId ? 'تعديل تصنيف' : 'إضافة تصنيف';
    recordTransaction(actionType, {
        categoryId: categoryId || categories[categories.length - 1].id,
        categoryName: categoryName
    });
    
    // إغلاق المودال
    closeAllModals();
    
    // عرض رسالة نجاح
    showAlert(`تم ${categoryId ? 'تعديل' : 'إضافة'} التصنيف بنجاح!`, 'success');
}

/**
 * حذف منتج
 * @param {string} productId - معرف المنتج
 */
function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        return;
    }
    
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) return;
    
    const productName = products[productIndex].name;
    
    // حذف المنتج من المصفوفة
    products.splice(productIndex, 1);
    
    // حفظ التغييرات
    saveProducts();
    
    // تحديث العرض
    displayProducts();
    
    // تسجيل الحركة
    recordTransaction('حذف منتج', {
        productId: productId,
        productName: productName
    });
    
    // عرض رسالة نجاح
    showAlert('تم حذف المنتج بنجاح!', 'success');
}

/**
 * حذف تصنيف
 * @param {string} categoryId - معرف التصنيف
 */
function deleteCategory(categoryId) {
    if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟ سيتم نقل جميع المنتجات إلى التصنيف العام.')) {
        return;
    }
    
    const categoryIndex = categories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) return;
    
    const categoryName = categories[categoryIndex].name;
    
    // التحقق من وجود تصنيف عام
    let defaultCategoryId = 'default';
    const defaultCategoryExists = categories.some(c => c.id === defaultCategoryId);
    
    // إنشاء تصنيف عام إذا لم يكن موجوداً
    if (!defaultCategoryExists) {
        defaultCategoryId = generateUniqueId();
        categories.push({
            id: defaultCategoryId,
            name: 'عام'
        });
    }
    
    // نقل المنتجات إلى التصنيف العام
    products.forEach(product => {
        if (product.categoryId === categoryId) {
            product.categoryId = defaultCategoryId;
        }
    });
    
    // حذف التصنيف من المصفوفة
    categories.splice(categoryIndex, 1);
    
    // حفظ التغييرات
    saveCategories();
    saveProducts();
    
    // تحديث العرض
    displayCategories();
    displayProducts();
    
    // تسجيل الحركة
    recordTransaction('حذف تصنيف', {
        categoryId: categoryId,
        categoryName: categoryName
    });
    
    // عرض رسالة نجاح
    showAlert('تم حذف التصنيف بنجاح!', 'success');
}

/**
 * البحث عن منتجات
 * @param {string} query - نص البحث
 */
function searchProducts(query) {
    query = query.trim().toLowerCase();
    
    if (!query) {
        displayProducts();
        return;
    }
    
    const filteredProducts = products.filter(product => {
        return (
            product.name.toLowerCase().includes(query) ||
            product.code.toLowerCase().includes(query)
        );
    });
    
    displayProducts(filteredProducts);
}

/**
 * البحث عن منتجات في صفحة المبيعات
 * @param {string} query - نص البحث
 */
function searchSaleProducts(query) {
    query = query.trim().toLowerCase();
    
    if (!query) {
        displaySaleProducts();
        return;
    }
    
    const filteredProducts = products.filter(product => {
        return (
            product.name.toLowerCase().includes(query) ||
            product.code.toLowerCase().includes(query)
        );
    });
    
    displaySaleProducts(filteredProducts);
}

/**
 * الحصول على منتج بواسطة المعرف
 * @param {string} productId - معرف المنتج
 * @returns {object|null} - المنتج المطلوب أو null إذا لم يوجد
 */
function getProductById(productId) {
    return products.find(p => p.id === productId) || null;
}

/**
 * الحصول على منتج بواسطة الرمز
 * @param {string} code - رمز المنتج
 * @returns {object|null} - المنتج المطلوب أو null إذا لم يوجد
 */
function findProductByCode(code) {
    return products.find(p => p.code === code) || null;
}

/**
 * الحصول على تصنيف بواسطة المعرف
 * @param {string} categoryId - معرف التصنيف
 * @returns {object|null} - التصنيف المطلوب أو null إذا لم يوجد
 */
function getCategoryById(categoryId) {
    return categories.find(c => c.id === categoryId) || null;
}

/**
 * الحصول على قائمة التصنيفات
 * @returns {Array} - قائمة التصنيفات
 */
function getCategories() {
    return categories;
}

/**
 * الحصول على قائمة المنتجات
 * @returns {Array} - قائمة المنتجات
 */
function getProducts() {
    return products;
}

/**
 * الحصول على المنتجات ذات المخزون المنخفض
 * @returns {Array} - قائمة المنتجات ذات المخزون المنخفض
 */
function getLowStockProducts() {
    return products.filter(p => p.quantity <= settings.stockAlert)
        .sort((a, b) => a.quantity - b.quantity);
}

/**
 * الحصول على أكثر المنتجات مبيعاً
 * @returns {Array} - قائمة المنتجات الأكثر مبيعاً
 */
function getTopSellingProducts() {
    return [...products]
        .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
        .map(p => ({
            id: p.id,
            name: p.name,
            soldQuantity: p.soldCount || 0
        }));
}

/**
 * تحديث مخزون المنتج
 * @param {string} productId - معرف المنتج
 * @param {number} quantity - الكمية الجديدة (موجبة للإضافة، سالبة للخصم)
 * @returns {boolean} - نجاح العملية
 */
function updateProductStock(productId, quantity) {
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) return false;
    
    // التحقق من توفر المخزون الكافي عند الخصم
    if (quantity < 0 && products[productIndex].quantity + quantity < 0) {
        return false;
    }
    
    // تحديث الكمية
    products[productIndex].quantity += quantity;
    
    // تحديث عدد المبيعات عند الخصم
    if (quantity < 0) {
        products[productIndex].soldCount = (products[productIndex].soldCount || 0) - quantity;
    }
    
    // حفظ التغييرات
    saveProducts();
    
    return true;
}

/**
 * استعادة بيانات المنتجات
 * @param {Array} backupProducts - نسخة احتياطية من المنتجات
 */
function restoreProductsData(backupProducts) {
    products = backupProducts;
    saveProducts();
}

/**
 * استعادة بيانات التصنيفات
 * @param {Array} backupCategories - نسخة احتياطية من التصنيفات
 */
function restoreCategoriesData(backupCategories) {
    categories = backupCategories;
    saveCategories();
}

/**
 * الحصول على بيانات المنتجات
 * @returns {Array} - بيانات المنتجات
 */
function getProductsData() {
    return products;
}

/**
 * الحصول على بيانات التصنيفات
 * @returns {Array} - بيانات التصنيفات
 */
function getCategoriesData() {
    return categories;
}
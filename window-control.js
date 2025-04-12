document.addEventListener('DOMContentLoaded', function() {
  console.log('تم تحميل صفحة التطبيق');
  
  // أزرار التحكم بالنافذة
  const minimizeBtn = document.getElementById('minimize-btn');
  const maximizeBtn = document.getElementById('maximize-btn');
  const closeBtn = document.getElementById('close-btn');
  
  // التحقق من وجود واجهة Electron
  if (window.electronAPI) {
    console.log('واجهة Electron متاحة');
    
    // زر التصغير
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', function() {
        console.log('تم الضغط على زر التصغير');
        window.electronAPI.minimizeWindow();
      });
    }
    
    // زر التكبير
    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', async function() {
        console.log('تم الضغط على زر التكبير');
        const { isMaximized } = await window.electronAPI.maximizeWindow();
        if (isMaximized) {
          maximizeBtn.querySelector('i').className = 'fas fa-compress'; // تغيير الأيقونة إلى "تصغير"
        } else {
          maximizeBtn.querySelector('i').className = 'fas fa-expand'; // تغيير الأيقونة إلى "تكبير"
        }
      });
    }
    
    // زر الإغلاق
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        console.log('تم الضغط على زر الإغلاق');
        window.electronAPI.closeWindow();
      });
    }
  } else {
    console.warn('واجهة Electron غير متاحة');
  }
});
/**
 * تطبيق السمة المخزنة
 */
function applyStoredTheme() {
  // محاولة استرجاع إعدادات السمة من التخزين المحلي أو من إعدادات التطبيق
  let isDarkTheme = false;
  
  try {
    // محاولة استرداد السمة من إعدادات التطبيق أولاً
    if (window.electronAPI && window.electronAPI.toggleTheme) {
      window.electronAPI.toggleTheme().then(({ isDark }) => {
        document.body.classList.toggle('dark-theme', isDark);
        updateThemeIcon(isDark);
      });
    } else {
      // استخدام التخزين المحلي كبديل
      const theme = localStorage.getItem('theme');
      isDarkTheme = theme === 'dark';
      document.body.classList.toggle('dark-theme', isDarkTheme);
      updateThemeIcon(isDarkTheme);
    }
  } catch (error) {
    console.error('خطأ في تطبيق السمة المخزنة:', error);
  }
}

/**
 * تبديل السمة بين الوضع الفاتح والداكن
 */
function toggleTheme() {
  const isDarkTheme = document.body.classList.contains('dark-theme');
  const newTheme = !isDarkTheme;
  
  if (window.electronAPI && window.electronAPI.toggleTheme) {
    window.electronAPI.toggleTheme(newTheme).then(({ isDark }) => {
      document.body.classList.toggle('dark-theme', isDark);
      updateThemeIcon(isDark);
    });
  } else {
    // بديل إذا لم تكن واجهة برمجة التطبيقات متاحة
    document.body.classList.toggle('dark-theme', newTheme);
    updateThemeIcon(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  }
  
  // تطبيق السمة على عناصر الصفحة المختلفة
  applyThemeToElements(newTheme);
}

/**
 * تحديث أيقونة زر تبديل السمة
 * @param {boolean} isDark - هل السمة داكنة؟
 */
function updateThemeIcon(isDark) {
  const themeIcon = document.querySelector('#toggle-theme i');
  if (!themeIcon) return;
  
  if (isDark) {
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
  } else {
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
  }
}

/**
 * تطبيق السمة على عناصر الصفحة المختلفة
 * @param {boolean} isDarkTheme - هل السمة داكنة؟
 */
function applyThemeToElements(isDarkTheme) {
  // يمكن إضافة تخصيصات إضافية للعناصر حسب السمة
  const charts = document.querySelectorAll('.chart-container');
  
  if (charts.length > 0) {
    // تحديث ألوان الرسوم البيانية حسب السمة
    charts.forEach(chart => {
      if (chart.__chart) {
        // تحديث ألوان الرسم البياني
        updateChartColors(chart.__chart, isDarkTheme);
      }
    });
  }
}

/**
 * تحديث ألوان الرسم البياني حسب السمة
 * @param {Object} chart - كائن الرسم البياني
 * @param {boolean} isDarkTheme - هل السمة داكنة؟
 */
function updateChartColors(chart, isDarkTheme) {
  if (!chart || !chart.options) return;
  
  // تحديث ألوان الرسم البياني حسب السمة
  const textColor = isDarkTheme ? '#e2e8f0' : '#1e293b';
  const gridColor = isDarkTheme ? '#334155' : '#e2e8f0';
  
  if (chart.options.scales) {
    // تحديث ألوان المحاور
    Object.values(chart.options.scales).forEach(scale => {
      if (scale.ticks) {
        scale.ticks.color = textColor;
      }
      if (scale.grid) {
        scale.grid.color = gridColor;
      }
    });
  }
  
  if (chart.options.plugins && chart.options.plugins.legend) {
    chart.options.plugins.legend.labels.color = textColor;
  }
  
  chart.update();
}

/**
 * إضافة تأثيرات انتقال الصفحة لعناصر المحتوى
 */
function initPageTransitions() {
  // إضافة فئة الانتقال للمحتوى الرئيسي
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.classList.add('page-transition');
  }
  
  // إضافة تأثيرات انتقال للصفحات
  const navButtons = document.querySelectorAll('.bottom-nav li');
  navButtons.forEach(button => {
    if (button) {
      button.addEventListener('click', () => {
        setTimeout(() => {
          const activePage = document.querySelector('.page.active');
          if (activePage) {
            activePage.classList.add('page-transition');
          }
        }, 50);
      });
    }
  });
}

/**
 * التحقق من وجود واجهة برمجة تطبيق Electron
 * @returns {boolean} - هل تطبيق Electron متاح؟
 */
function isElectronAvailable() {
  return window.electronAPI !== undefined;
}

/**
 * تفعيل وضع ملء الشاشة
 */
function toggleFullScreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(err => {
      console.error('خطأ في محاولة تفعيل وضع ملء الشاشة:', err);
    });
  }
}

// كشف تغيير حجم النافذة لتحديث حالة زر التكبير/التصغير
window.addEventListener('resize', function() {
  if (!isElectronAvailable()) return;
  
  // تحديث أيقونة زر التكبير/التصغير عند تغيير حجم النافذة
  window.electronAPI.maximizeWindow().then(({ isMaximized }) => {
    const maximizeBtn = document.getElementById('maximize-btn');
    if (maximizeBtn && maximizeBtn.querySelector('i')) {
      maximizeBtn.querySelector('i').className = isMaximized 
        ? 'fas fa-compress' 
        : 'fas fa-expand';
    }
  });
});

ipcMain.handle('window-maximize', () => {
  console.log('طلب تكبير/استعادة النافذة');
  if (!mainWindow) return { isMaximized: false };

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return { isMaximized: false };
  } else {
    mainWindow.maximize();
    return { isMaximized: true };
  }
});



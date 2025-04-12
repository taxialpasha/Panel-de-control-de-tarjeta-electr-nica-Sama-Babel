const { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

// تعريف المتغيرات العامة
let mainWindow;
let splashWindow;
let darkMode = false;

// الحصول على مسار بيانات التطبيق
const appDataPath = path.join(app.getPath('userData'), 'cashier-system-data');

// التأكد من وجود مجلد بيانات التطبيق
if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath, { recursive: true });
}

/**
 * إنشاء نافذة شاشة البداية
 */
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // تحميل صفحة شاشة البداية
  splashWindow.loadFile(path.join(__dirname, 'Splash.html'));

  // إخفاء القائمة من نافذة البداية
  splashWindow.setMenuBarVisibility(false);

  // إزالة أدوات المطور
  // splashWindow.webContents.openDevTools({ mode: 'detach' });
}

/**
 * إنشاء النافذة الرئيسية للتطبيق
 */
function createMainWindow() {
  console.log('بدء إنشاء النافذة الرئيسية');
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false, // عدم إظهار النافذة حتى اكتمال التحميل
    frame: false, // إلغاء إطار النافذة الافتراضي
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'src/assets/icons/icon.png'),
    title: 'نظام الكاشير المتكامل'
  });

  // تحميل الصفحة الرئيسية للتطبيق
  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

  // إزالة أدوات المطور
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  // عند اكتمال تحميل النافذة الرئيسية
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('اكتمل تحميل النافذة الرئيسية');
    
    // إرسال رسالة تشخيصية للنافذة
    mainWindow.webContents.send('diagnostic-message', 'تم تحميل النافذة الرئيسية');
    
    // إضافة تأخير صغير لتحسين تجربة المستخدم
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        mainWindow.show();
        mainWindow.focus();
        console.log('تم إظهار النافذة الرئيسية');
      }
    }, 1500);
  });

  // عند إغلاق النافذة الرئيسية
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // استمع للرسائل من preload.js
  ipcMain.on('preload-ready', () => {
    console.log('ملف preload جاهز');
  });
}

// استدعاء الدالة عند تهيئة التطبيق
app.whenReady().then(() => {
  console.log('تطبيق الكاشير يبدأ التشغيل...');
  
  // تعيين الوضع الداكن
  darkMode = nativeTheme.shouldUseDarkColors;
  
  // إنشاء نافذة شاشة البداية
  createSplashWindow();
  
  // استدعاء النافذة الرئيسية بعد 3 ثوانٍ
  setTimeout(createMainWindow, 3000);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createSplashWindow();
  });
});

// إغلاق التطبيق عند إغلاق جميع النوافذ (ماعدا في نظام macOS)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// الرد على طلب مسار بيانات التطبيق
ipcMain.on('get-app-data-path', (event) => {
  event.returnValue = appDataPath;
});

// معالجة رسائل التحكم بالنافذة
ipcMain.handle('window-minimize', () => {
  console.log('طلب تصغير النافذة');
  if (mainWindow) {
    mainWindow.minimize();
    return true;
  }
  return false;
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

ipcMain.handle('window-close', () => {
  console.log('طلب إغلاق النافذة');
  if (mainWindow) {
    // اختياري: طلب تأكيد قبل الإغلاق
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['نعم', 'لا'],
      defaultId: 1,
      title: 'تأكيد إغلاق التطبيق',
      message: 'هل أنت متأكد من رغبتك في إغلاق التطبيق؟'
    }).then(result => {
      if (result.response === 0) {
        console.log('تأكيد إغلاق التطبيق');
        mainWindow.close();
      } else {
        console.log('إلغاء إغلاق التطبيق');
      }
    });
  }
  return true;
});

// التحكم في سمة التطبيق
ipcMain.handle('toggle-theme', async (event, isDark) => {
  if (isDark === undefined) {
    darkMode = !darkMode;
  } else {
    darkMode = isDark;
  }
  
  // حفظ إعداد السمة
  const settings = await getApplicationSettings();
  settings.theme = darkMode ? 'dark' : 'light';
  saveApplicationSettings(settings);
  
  // إبلاغ جميع النوافذ بتغيير السمة
  if (mainWindow) {
    mainWindow.webContents.send('theme-updated', darkMode);
  }
  
  return { isDark: darkMode };
});

// الحصول على معلومات التطبيق
ipcMain.handle('get-app-info', () => {
  return {
    appName: app.getName(),
    appVersion: app.getVersion(),
    platform: process.platform,
    appDataPath: appDataPath
  };
});

// استرجاع إعدادات التطبيق
async function getApplicationSettings() {
  const settingsPath = path.join(appDataPath, 'settings.json');
  
  try {
    if (fs.existsSync(settingsPath)) {
      const data = await fs.promises.readFile(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('خطأ في قراءة إعدادات التطبيق:', error);
  }
  
  return { theme: 'light' };
}

// حفظ إعدادات التطبيق
async function saveApplicationSettings(settings) {
  const settingsPath = path.join(appDataPath, 'settings.json');
  
  try {
    await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('خطأ في حفظ إعدادات التطبيق:', error);
  }
}


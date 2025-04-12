// preload.js مبسط
const { contextBridge, ipcRenderer } = require('electron');

// واجهة التحكم بالنافذة للصفحة
contextBridge.exposeInMainWorld('electronAPI', {
  // وظائف التحكم بالنافذة
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  
  // رسائل
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  }
});

// إبلاغ النافذة الرئيسية أن ملف preload جاهز
ipcRenderer.send('preload-ready');
// تحديد المسار الافتراضي لحفظ وقراءة البيانات
const appDataPath = ipcRenderer.sendSync('get-app-data-path');

// التأكد من وجود مجلد لحفظ البيانات
if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath, { recursive: true });
}

// واجهة برمجة التطبيق المتاحة للصفحة
contextBridge.exposeInMainWorld('electronAPI', {
  // وظائف التحكم بالنافذة
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  
  // وظائف النظام
  toggleTheme: (isDark) => ipcRenderer.invoke('toggle-theme', isDark),
  
  // الاستماع للأحداث
  onThemeUpdate: (callback) => {
    ipcRenderer.on('theme-updated', (event, isDark) => callback(isDark));
    return () => {
      ipcRenderer.removeAllListeners('theme-updated');
    };
  },
  
  // معلومات عامة
  getAppInfo: () => ipcRenderer.invoke('get-app-info')
});

// واجهة للتخزين المحلي المحسن
contextBridge.exposeInMainWorld('enhancedStorage', {
  setItem: async (key, value) => {
    try {
      const filePath = path.join(appDataPath, `${key}.json`);
      await fs.promises.writeFile(filePath, value);
      return true;
    } catch (error) {
      console.error('خطأ في تخزين البيانات:', error);
      return false;
    }
  },
  getItem: async (key) => {
    try {
      const filePath = path.join(appDataPath, `${key}.json`);
      if (fs.existsSync(filePath)) {
        return await fs.promises.readFile(filePath, 'utf8');
      }
      return null;
    } catch (error) {
      console.error('خطأ في قراءة البيانات:', error);
      return null;
    }
  },
  removeItem: async (key) => {
    try {
      const filePath = path.join(appDataPath, `${key}.json`);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      return true;
    } catch (error) {
      console.error('خطأ في حذف البيانات:', error);
      return false;
    }
  }
});

// واجهة لنظام الملفات
contextBridge.exposeInMainWorld('fs', {
  readFile: async (filePath, options = {}) => {
    try {
      // إذا كان المسار نسبي، نقوم بتحويله إلى مسار كامل
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(appDataPath, filePath);

      // قراءة الملف
      if (options.encoding) {
        return await fs.promises.readFile(fullPath, options);
      } else {
        return await fs.promises.readFile(fullPath);
      }
    } catch (error) {
      console.error('خطأ في قراءة الملف:', error);
      throw error;
    }
  },
  writeFile: async (filePath, data) => {
    try {
      // إذا كان المسار نسبي، نقوم بتحويله إلى مسار كامل
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(appDataPath, filePath);

      // التأكد من وجود المجلد
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // كتابة الملف
      await fs.promises.writeFile(fullPath, data);
      return true;
    } catch (error) {
      console.error('خطأ في كتابة الملف:', error);
      throw error;
    }
  },
  exists: (filePath) => {
    const fullPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(appDataPath, filePath);
    return fs.existsSync(fullPath);
  }
});

// إضافة مستمع حدث لرسائل التشخيص من النافذة الرئيسية
ipcRenderer.on('diagnostic-message', (event, message) => {
  console.log('[من main.js]:', message);
});

// إرسال رسالة جاهزة للنافذة الرئيسية
ipcRenderer.send('preload-ready');


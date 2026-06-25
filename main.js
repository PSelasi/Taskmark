//Electron main process
const { app, BrowserWindow, Tray, Menu, ipcMain, Notification } = require('electron');
const path = require('path');
const { initDatabase } = require('./src/database/db.js');

let mainWindow;
let tray = null;
let isQuitting = false;

// Ensure database initializes early
initDatabase();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Simplifies communication for standalone apps
    },
    frame: true,
    show: false
  });

  mainWindow.loadFile('src/pages/index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Intercept close to minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  // Use a fallback text placeholder if icon doesn't exist yet
  tray = new Tray(path.join(__dirname, 'src/assets/icon.png')); 
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Taskmark', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Exit', click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip('Taskmark');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Configure app to run on OS startup (optional toggle)
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe')
  });
});

// IPC Channel for Desktop Notifications triggered from Services
ipcMain.on('send-notification', (event, arg) => {
  new Notification({
    title: arg.title,
    body: arg.body,
    silent: false
  }).show();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
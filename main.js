const { app, BrowserWindow } = require('electron');
const { startServer } = require('./server');

let mainWindow;
let serverInstance;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 1000,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#111827',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  mainWindow.loadURL('http://127.0.0.1:3000');
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  serverInstance = startServer();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverInstance && typeof serverInstance.close === 'function') {
    serverInstance.close();
  }
  if (process.platform !== 'darwin') app.quit();
});

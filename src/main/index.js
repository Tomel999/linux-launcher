const { app, BrowserWindow, protocol, ipcMain } = require('electron');
const path = require('path');
const { initializeDirectories } = require('./lib/fileManager');
const minecraftLauncher = require('./lib/minecraftLauncher');

app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-setuid-sandbox');
app.commandLine.appendSwitch('--disable-dev-shm-usage');

require('./ipc/gameHandlers');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        resizable: true,
        frame: false,
        transparent: true,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: true,
        },
    });

    mainWindow.loadURL('app://./index.html');

}

ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-toggle-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});
ipcMain.on('window-close', () => mainWindow.close());

app.whenReady().then(async () => {
    const rendererPath = path.join(__dirname, '..', 'renderer');
    protocol.registerFileProtocol('app', (request, callback) => {
        const url = request.url.substr('app://./'.length);
        const filePath = path.join(rendererPath, url);
        callback({ path: filePath });
    });

    try {
        await initializeDirectories();

        await require('./lib/fileManager').migrateLegacyModFolders();

        await require('./lib/fileManager').ensureVersionFolders();
    } catch (error) {
        console.error("Nie udało się zainicjować katalogów:", error);
        app.quit();
        return;
    }

    minecraftLauncher.initialize();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
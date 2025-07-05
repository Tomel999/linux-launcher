const { Client } = require('minecraft-launcher-core');
const { BrowserWindow } = require('electron');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const { MINECRAFT_DIR } = require('./constants');
const channels = require('../../shared/ipcChannels');
const fileManager = require('./fileManager');
const modrinthClient = require('./modrinthClient');
const modManager = require('./modManager');
const javaManager = require('./javaManager');
const githubClient = require('./githubClient');
const curseforgeClient = require('./curseforgeClient');

const launcher = new Client();
let isInitialized = false;

function initialize() {
    if (isInitialized) return;

    const sendToAllWindows = (channel, ...args) => {
        BrowserWindow.getAllWindows().forEach(win => {
            if (win && !win.isDestroyed()) {
                win.webContents.send(channel, ...args);
            }
        });
    };

    launcher.on('progress', (e) => sendToAllWindows(channels.GAME_PROGRESS, { type: e.type, task: e.task, total: e.total }));
    launcher.on('download-status', (e) => sendToAllWindows(channels.GAME_DOWNLOAD_STATUS, { type: e.type, current: e.current, total: e.total }));
    launcher.on('data', (e) => console.log('[Gra]:', e));
    launcher.on('debug', (e) => console.log('[Launcher]:', e));

    isInitialized = true;
}

async function launchGame(options, event) {
    const { version, ram, playerName, window } = options;

    console.log('Uruchamianie Minecrafta z opcjami:', options);
    console.log(`\n=== PRZEŁĄCZANIE NA WERSJĘ ${version} ===`);

    const matches = version.match(/(\d+\.\d+(?:\.\d+)?)/g);
    const mcVersion = matches ? matches[matches.length - 1] : null;

    if (!mcVersion) {
        throw new Error(`Nie można wyodrębnić wersji MC z: ${version}`);
    }

    const preinstalledModsDir = await fileManager.getVersionModsDirectory(version);

    const versionFolderName = fileManager.getVersionFolderName(mcVersion);
    const versionMainDir = path.join(path.dirname(preinstalledModsDir));

    console.log(`Używanie hardlinków do modów z folderów:`);
    console.log(`  - Preinstalled: ${preinstalledModsDir}`);
    console.log(`  - Version main: ${versionMainDir}`);

    const sendToWindow = (channel, ...args) => {
        if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send(channel, ...args);
        }
    };

    const onModLog = (message) => {
        console.log(`[Mods] ${message}`);

    };

    const onModProgress = (message, current, total) => {
        sendToWindow(channels.GAME_PROGRESS, { type: 'mods', task: current, total: total });
    };

    try {
        onModLog(`Checking mods for Minecraft ${mcVersion}...`);

        const modResult = await modManager.downloadModsForVersion(mcVersion, preinstalledModsDir, onModLog, onModProgress);

        try {
            onModLog(`Checking GitHub mods for Minecraft ${mcVersion}...`);
            const githubResult = await githubClient.downloadModsForVersion(mcVersion, preinstalledModsDir, onModLog, onModProgress);
            if (githubResult.success) {
                let summary = `GitHub mods: Downloaded: ${githubResult.downloaded}, Skipped: ${githubResult.skipped}, Failed: ${githubResult.failed}`;
                if (githubResult.cleaned && githubResult.cleaned > 0) {
                    summary += `, Cleaned old versions: ${githubResult.cleaned}`;
                }
                if (githubResult.redownloaded && githubResult.redownloaded > 0) {
                    summary += `, Redownloaded: ${githubResult.redownloaded}`;
                }
                onModLog(summary);
            }
        } catch (githubError) {
            onModLog(`Error downloading GitHub mods: ${githubError.message}`);
            console.error('GitHub mod download error:', githubError);
        }

        try {
            onModLog(`Checking CurseForge mods for Minecraft ${mcVersion}...`);
            const curseforgeResult = await curseforgeClient.downloadModsForVersion(mcVersion, preinstalledModsDir, onModLog, onModProgress);
            if (curseforgeResult.success) {
                onModLog(`CurseForge mods: Downloaded: ${curseforgeResult.downloaded}, Skipped: ${curseforgeResult.skipped}, Failed: ${curseforgeResult.failed}`);
            }
        } catch (curseforgeError) {
            onModLog(`Error downloading CurseForge mods: ${curseforgeError.message}`);
            console.error('CurseForge mod download error:', curseforgeError);
        }

        if (modResult.success) {
            if (modResult.downloaded > 0 || modResult.skipped > 0) {
                onModLog(`Main mod setup complete! Downloaded: ${modResult.downloaded}, Skipped: ${modResult.skipped}, Failed: ${modResult.failed}`);
            }
        } else {
            onModLog(`Some main mods failed to download, but continuing with launch...`);
        }
    } catch (error) {
        onModLog(`Error downloading mods: ${error.message}`);
        console.error('Mod download error:', error);

    }

    const mainModsDir = path.join(MINECRAFT_DIR, 'mods');

    if (await fs.pathExists(mainModsDir)) {
        try {
            const files = await fs.readdir(mainModsDir);
            for (const file of files) {
                if (file.endsWith('.jar')) {
                    await fs.remove(path.join(mainModsDir, file));
                    console.log(`Usunięto plik: ${file} z głównego folderu mods`);
                }
            }
        } catch (error) {
            console.warn(`Błąd podczas czyszczenia głównego folderu mods: ${error.message}`);
        }
    } else {
        await fs.ensureDir(mainModsDir);
    }

    async function createModLink(sourcePath, targetPath, jarFile, sourceType) {
        try {
            if (process.platform === 'win32') {

                try {
                    await fs.link(sourcePath, targetPath);
                    console.log(`Stworzono hardlink (native) z ${sourceType}: ${jarFile}`);
                    return true;
                } catch (nativeLinkError) {
                    console.log(`Native hardlink failed, trying mklink: ${nativeLinkError.message}`);

                    await new Promise((resolve, reject) => {

                        const normalizedSource = path.resolve(sourcePath);
                        const normalizedTarget = path.resolve(targetPath);

                        const cmd = spawn('cmd.exe', ['/c', `mklink /H "${normalizedTarget}" "${normalizedSource}"`], {
                            stdio: ['ignore', 'pipe', 'pipe']
                        });

                        let stderr = '';
                        cmd.stderr.on('data', (data) => {
                            stderr += data.toString();
                        });

                        cmd.on('close', (code) => {
                            if (code === 0) {
                                console.log(`Stworzono hardlink (mklink) z ${sourceType}: ${jarFile}`);
                                resolve();
                            } else {
                                console.error(`mklink stderr: ${stderr}`);
                                reject(new Error(`mklink failed with code ${code}: ${stderr}`));
                            }
                        });

                        cmd.on('error', (err) => {
                            console.error(`mklink spawn error: ${err.message}`);
                            reject(err);
                        });
                    });
                    return true;
                }
            } else if (process.platform === 'linux' || process.platform === 'darwin') {

                try {
                    await fs.symlink(sourcePath, targetPath);
                    console.log(`Stworzono symlink z ${sourceType}: ${jarFile}`);
                    return true;
                } catch (symlinkError) {

                    await fs.link(sourcePath, targetPath);
                    console.log(`Stworzono hardlink z ${sourceType}: ${jarFile}`);
                    return true;
                }
            } else {

                await fs.link(sourcePath, targetPath);
                console.log(`Stworzono hardlink z ${sourceType}: ${jarFile}`);
                return true;
            }
        } catch (linkError) {
            console.error(`Błąd podczas tworzenia hardlinka z ${sourceType}: ${linkError.message}`);

            try {
                await fs.copy(sourcePath, targetPath);
                console.log(`Skopiowano mod (fallback) z ${sourceType}: ${jarFile}`);
                return true;
            } catch (copyError) {
                console.error(`Błąd podczas kopiowania pliku z ${sourceType}: ${copyError.message}`);
                return false;
            }
        }
    }

    let totalLinkedCount = 0;

    try {
        console.log(`\n=== LINKOWANIE MODÓW Z FOLDERU PREINSTALLED ===`);
        if (await fs.pathExists(preinstalledModsDir)) {
            const preinstalledFiles = await fs.readdir(preinstalledModsDir);
            const preinstalledJarFiles = preinstalledFiles.filter(file => file.endsWith('.jar'));

            console.log(`Znaleziono ${preinstalledJarFiles.length} modów w folderze preinstalled`);

            for (const jarFile of preinstalledJarFiles) {
                const sourcePath = path.join(preinstalledModsDir, jarFile);
                const targetPath = path.join(mainModsDir, jarFile);

                if (await createModLink(sourcePath, targetPath, jarFile, 'preinstalled')) {
                    totalLinkedCount++;
                }
            }
        } else {
            console.log(`Folder preinstalled nie istnieje: ${preinstalledModsDir}`);
        }
    } catch (error) {
        console.error(`Błąd podczas linkowania modów z preinstalled: ${error.message}`);
    }

    try {
        console.log(`\n=== LINKOWANIE MODÓW Z GŁÓWNEGO FOLDERU WERSJI ===`);
        if (await fs.pathExists(versionMainDir)) {
            const versionFiles = await fs.readdir(versionMainDir);
            const versionJarFiles = versionFiles.filter(file =>
                file.endsWith('.jar') && !file.includes('preinstalled')
            );

            console.log(`Znaleziono ${versionJarFiles.length} modów w głównym folderze wersji`);

            for (const jarFile of versionJarFiles) {
                const sourcePath = path.join(versionMainDir, jarFile);
                const targetPath = path.join(mainModsDir, jarFile);

                if (await fs.pathExists(targetPath)) {
                    console.log(`Plik ${jarFile} już istnieje (prawdopodobnie z preinstalled), pomijam`);
                    continue;
                }

                if (await createModLink(sourcePath, targetPath, jarFile, 'version main')) {
                    totalLinkedCount++;
                }
            }
        } else {
            console.log(`Główny folder wersji nie istnieje: ${versionMainDir}`);
        }
    } catch (error) {
        console.error(`Błąd podczas linkowania modów z głównego folderu wersji: ${error.message}`);
    }

    console.log(`\n=== PODSUMOWANIE LINKOWANIA ===`);
    console.log(`Utworzono łącznie ${totalLinkedCount} hardlinków/kopii modów w głównym folderze mods`);

    console.log(`Używanie katalogu gry: ${MINECRAFT_DIR}`);
    console.log(`Folder preinstalled modów: ${preinstalledModsDir}`);
    console.log(`Folder główny wersji: ${versionMainDir}`);

    console.log(`\n=== KONFIGURACJA JAVA DLA ${mcVersion} ===`);
    const javaInfo = await javaManager.findJavaForVersion(mcVersion);
    console.log(`Ścieżka Java: ${javaInfo.path}`);
    console.log(`Wersja Java: ${javaInfo.version || 'nieznana'}`);
    if (javaInfo.warning) {
        console.warn(`OSTRZEŻENIE: ${javaInfo.warning}`);
    }

    let windowOptions = {};
    if (window) {
        console.log('Opcje okna przed przetworzeniem:', window);
        if (window.fullscreen) {
            windowOptions = { fullscreen: true };
        } else if (window.width && window.height) {
            windowOptions = {
                width: parseInt(window.width, 10),
                height: parseInt(window.height, 10)
            };
        }
    }
    console.log('Finalne opcje okna:', windowOptions);

    const opts = {
        root: MINECRAFT_DIR,
        version: {
            number: mcVersion,
            type: 'release',
            custom: version,
        },
        memory: {
            max: `${ram}G`,
            min: '1G'
        },
        authorization: {
            name: playerName || `Player${Math.floor(Math.random() * 1000)}`,
            uuid: uuidv4()
        },
        overrides: {
            cwd: MINECRAFT_DIR
        },

        window: windowOptions,

        hideConsole: true,

        javaPath: javaInfo.path
    };

    console.log('Uruchamianie z opcjami:', JSON.stringify(opts, null, 2));

    launcher.once('close', (e) => {
        console.log('Gra została zamknięta. Kod wyjścia:', e);
        if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send(channels.GAME_CLOSED);
        }
    });

    if (process.platform === 'win32') {

        opts.overrides = opts.overrides || {};
        opts.overrides.windowsVerbatimArguments = true;

        opts.customLaunchArgs = ['/min'];

        opts.windows = {
            hideWindow: true
        };

        if (opts.javaPath && opts.javaPath.endsWith('java.exe')) {
            opts.javaPath = opts.javaPath.replace('java.exe', 'javaw.exe');
        } else if (opts.javaPath === 'java') {
            opts.javaPath = 'javaw';
        }
    }

    if (windowOptions.width && windowOptions.height) {

        opts.overrides = opts.overrides || {};
        opts.overrides.gameOptions = opts.overrides.gameOptions || {};
        opts.overrides.gameOptions.fullscreen = false;
        opts.overrides.gameOptions.width = windowOptions.width;
        opts.overrides.gameOptions.height = windowOptions.height;

        opts.customArgs = opts.customArgs || [];
        opts.customArgs.push(`-Dminecraft.window.width=${windowOptions.width}`);
        opts.customArgs.push(`-Dminecraft.window.height=${windowOptions.height}`);
    } else if (windowOptions.fullscreen) {

        opts.overrides = opts.overrides || {};
        opts.overrides.gameOptions = opts.overrides.gameOptions || {};
        opts.overrides.gameOptions.fullscreen = true;

        opts.customArgs = opts.customArgs || [];
        opts.customArgs.push(`-Dminecraft.window.fullscreen=true`);
    }

    launcher.launch(opts, { detached: true, stdio: 'ignore', windowsHide: true });

    return {
        success: true,
        version: version,
        mcVersion: mcVersion
    };
}

module.exports = {
    initialize,
    launchGame
};
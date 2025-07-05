const { ipcMain, dialog } = require('electron');
const channels = require('../../shared/ipcChannels');
const fileManager = require('../lib/fileManager');
const minecraftLauncher = require('../lib/minecraftLauncher');
const { installFabric } = require('../lib/fabricInstaller');
const modrinthClient = require('../lib/modrinthClient');
const curseforgeClient = require('../lib/curseforgeClient');
const githubClient = require('../lib/githubClient');

ipcMain.handle(channels.GET_VERSIONS, async (event) => {
    return await fileManager.getGameVersions(event);
});

ipcMain.handle(channels.LAUNCH_GAME, async (event, options) => {
    try {
        const version = options.version;
        const ram = options.ram;
        const playerName = options.playerName;
        const windowOptions = options.window;

        console.log('Opcje okna otrzymane od UI:', windowOptions);

        const result = await minecraftLauncher.launchGame({ version, ram, playerName, window: windowOptions }, event);
        return result;
    } catch (error) {
        console.error('Błąd podczas uruchamiania gry:', error);
        dialog.showErrorBox('Błąd uruchamiania', `Nie udało się uruchomić gry.\n\n${error.message}`);
        return { success: false, message: error.message };
    }
});

ipcMain.handle(channels.REINSTALL_FABRIC, async (event) => {
    const onLog = (log) => {
        if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send(channels.FABRIC_INSTALL_LOG, log);
        }
    };
    return await installFabric(onLog);
});

ipcMain.handle(channels.GET_MODS_FOR_VERSION, async (event, fabricVersionName) => {
    try {

        const matches = fabricVersionName.match(/(\d+\.\d+(?:\.\d+)?)/g);
        const mcVersion = matches ? matches[matches.length - 1] : null;

        if (!mcVersion) {
            return [];
        }

        return modrinthClient.getModsForVersion(mcVersion);
    } catch (error) {
        console.error('Error getting mods for version:', error);
        return [];
    }
});

ipcMain.handle(channels.DOWNLOAD_MODS, async (event, fabricVersionName) => {
    try {

        const matches = fabricVersionName.match(/(\d+\.\d+(?:\.\d+)?)/g);
        const mcVersion = matches ? matches[matches.length - 1] : null;

        if (!mcVersion) {
            return { success: false, message: 'Invalid version format' };
        }

        const versionModsDir = await fileManager.getVersionModsDirectory(fabricVersionName);

        const onLog = (message) => {
            console.log(`[Mods] ${message}`);

        };

        const onProgress = (message, current, total) => {

        };

        onLog(`Starting mod download for Minecraft ${mcVersion}...`);
        const result = await modrinthClient.downloadModsForVersion(mcVersion, versionModsDir, onLog, onProgress);

        if (result.success) {
            onLog(`Mod download complete! Downloaded: ${result.downloaded}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
        }

        return result;
    } catch (error) {
        console.error('Error downloading mods:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle(channels.SCAN_MODS, async (event, fabricVersionName) => {
    try {

        const matches = fabricVersionName.match(/(\d+\.\d+(?:\.\d+)?)/g);
        const mcVersion = matches ? matches[matches.length - 1] : null;

        if (!mcVersion) {
            return { success: false, message: 'Invalid version format' };
        }

        const versionModsDir = await fileManager.getVersionModsDirectory(fabricVersionName);

        const modConfigs = modrinthClient.getModsForVersion(mcVersion);

        const onLog = (message) => {
            console.log(`[Scan] ${message}`);
        };

        const { installedMods, missingMods } = await modrinthClient.scanInstalledMods(versionModsDir, modConfigs, onLog);

        return {
            success: true,
            installed: installedMods.length,
            missing: missingMods.length,
            total: modConfigs.length,
            installedMods: installedMods.map(m => m.name),
            missingMods: missingMods.map(m => m.name)
        };
    } catch (error) {
        console.error('Error scanning mods:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle(channels.GET_CURSEFORGE_MODS_FOR_VERSION, async (event, fabricVersionName) => {
    try {

        const matches = fabricVersionName.match(/(\d+\.\d+(?:\.\d+)?)/g);
        const mcVersion = matches ? matches[matches.length - 1] : null;

        if (!mcVersion) {
            return [];
        }

        return curseforgeClient.getModsForVersion(mcVersion);
    } catch (error) {
        console.error('Error getting CurseForge mods for version:', error);
        return [];
    }
});

ipcMain.handle(channels.DOWNLOAD_CURSEFORGE_MODS, async (event, fabricVersionName) => {
    try {

        const matches = fabricVersionName.match(/(\d+\.\d+(?:\.\d+)?)/g);
        const mcVersion = matches ? matches[matches.length - 1] : null;

        if (!mcVersion) {
            return { success: false, message: 'Invalid version format' };
        }

        const versionModsDir = await fileManager.getVersionModsDirectory(fabricVersionName);

        const onLog = (message) => {
            console.log(`[CurseForge Mods] ${message}`);

        };

        const onProgress = (message, current, total) => {

        };

        onLog(`Starting CurseForge mod download for Minecraft ${mcVersion}...`);
        const result = await curseforgeClient.downloadModsForVersion(mcVersion, versionModsDir, onLog, onProgress);

        if (result.success) {
            onLog(`CurseForge mod download complete! Downloaded: ${result.downloaded}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
        }

        return result;
    } catch (error) {
        console.error('Error downloading CurseForge mods:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle(channels.SCAN_CURSEFORGE_MODS, async (event, fabricVersionName) => {
    try {

        const matches = fabricVersionName.match(/(\d+\.\d+(?:\.\d+)?)/g);
        const mcVersion = matches ? matches[matches.length - 1] : null;

        if (!mcVersion) {
            return { success: false, message: 'Invalid version format' };
        }

        const versionModsDir = await fileManager.getVersionModsDirectory(fabricVersionName);

        const modConfigs = curseforgeClient.getModsForVersion(mcVersion);

        const onLog = (message) => {
            console.log(`[CurseForge Scan] ${message}`);
        };

        const { installedMods, missingMods } = await curseforgeClient.scanInstalledMods(versionModsDir, modConfigs, onLog);

        return {
            success: true,
            installed: installedMods.length,
            missing: missingMods.length,
            total: modConfigs.length,
            installedMods: installedMods.map(m => m.name),
            missingMods: missingMods.map(m => m.name)
        };
    } catch (error) {
        console.error('Error scanning CurseForge mods:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle(channels.GET_GITHUB_MODS_FOR_VERSION, async (event, fabricVersionName) => {
    try {

        const matches = fabricVersionName.match(/(\d+\.\d+(?:\.\d+)?)/g);
        const mcVersion = matches ? matches[matches.length - 1] : null;

        if (!mcVersion) {
            return [];
        }

        return githubClient.getModsForVersion(mcVersion);
    } catch (error) {
        console.error('Error getting GitHub mods for version:', error);
        return [];
    }
});

ipcMain.handle(channels.DOWNLOAD_GITHUB_MODS, async (event, fabricVersionName) => {
    try {

        const matches = fabricVersionName.match(/(\d+\.\d+(?:\.\d+)?)/g);
        const mcVersion = matches ? matches[matches.length - 1] : null;

        if (!mcVersion) {
            return { success: false, message: 'Invalid version format' };
        }

        const versionModsDir = await fileManager.getVersionModsDirectory(fabricVersionName);

        const onLog = (message) => {
            console.log(`[GitHub Mods] ${message}`);

        };

        const onProgress = (message, current, total) => {

        };

        onLog(`Starting GitHub mod download for Minecraft ${mcVersion}...`);
        const result = await githubClient.downloadModsForVersion(mcVersion, versionModsDir, onLog, onProgress);

        if (result.success) {
            onLog(`GitHub mod download complete! Downloaded: ${result.downloaded}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
        }

        return result;
    } catch (error) {
        console.error('Error downloading GitHub mods:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle(channels.SCAN_GITHUB_MODS, async (event, fabricVersionName) => {
    try {

        const matches = fabricVersionName.match(/(\d+\.\d+(?:\.\d+)?)/g);
        const mcVersion = matches ? matches[matches.length - 1] : null;

        if (!mcVersion) {
            return { success: false, message: 'Invalid version format' };
        }

        const versionModsDir = await fileManager.getVersionModsDirectory(fabricVersionName);

        const modConfigs = githubClient.getModsForVersion(mcVersion);

        const onLog = (message) => {
            console.log(`[GitHub Scan] ${message}`);
        };

        const { installedMods, missingMods } = await githubClient.scanInstalledMods(versionModsDir, modConfigs, onLog);

        return {
            success: true,
            installed: installedMods.length,
            missing: missingMods.length,
            total: modConfigs.length,
            installedMods: installedMods.map(m => m.name),
            missingMods: missingMods.map(m => m.name)
        };
    } catch (error) {
        console.error('Error scanning GitHub mods:', error);
        return { success: false, message: error.message };
    }
});
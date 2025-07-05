const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const channels = require(path.join(__dirname, '..', 'shared', 'ipcChannels.js'));

contextBridge.exposeInMainWorld('electronAPI', {

    getVersions: () => ipcRenderer.invoke(channels.GET_VERSIONS),
    launchGame: (options) => ipcRenderer.invoke(channels.LAUNCH_GAME, options),
    launchGameLegacy: (versionName, ram) => ipcRenderer.invoke(channels.LAUNCH_GAME, versionName, ram),
    reinstallFabric: () => ipcRenderer.invoke(channels.REINSTALL_FABRIC),

    getModsForVersion: (version) => ipcRenderer.invoke(channels.GET_MODS_FOR_VERSION, version),
    downloadMods: (version) => ipcRenderer.invoke(channels.DOWNLOAD_MODS, version),
    scanMods: (version) => ipcRenderer.invoke(channels.SCAN_MODS, version),

    getCurseForgeModsForVersion: (version) => ipcRenderer.invoke(channels.GET_CURSEFORGE_MODS_FOR_VERSION, version),
    downloadCurseForgeMods: (version) => ipcRenderer.invoke(channels.DOWNLOAD_CURSEFORGE_MODS, version),
    scanCurseForgeMods: (version) => ipcRenderer.invoke(channels.SCAN_CURSEFORGE_MODS, version),

    getGitHubModsForVersion: (version) => ipcRenderer.invoke(channels.GET_GITHUB_MODS_FOR_VERSION, version),
    downloadGitHubMods: (version) => ipcRenderer.invoke(channels.DOWNLOAD_GITHUB_MODS, version),
    scanGitHubMods: (version) => ipcRenderer.invoke(channels.SCAN_GITHUB_MODS, version),

    onGameClosed: (callback) => ipcRenderer.on(channels.GAME_CLOSED, callback),
    onGameProgress: (callback) => ipcRenderer.on(channels.GAME_PROGRESS, (event, ...args) => callback(...args)),
    onGameDownloadStatus: (callback) => ipcRenderer.on(channels.GAME_DOWNLOAD_STATUS, (event, ...args) => callback(...args)),
    onFabricInstallLog: (callback) => ipcRenderer.on(channels.FABRIC_INSTALL_LOG, (event, ...args) => callback(...args)),
    onAutoFabricInstallStatus: (callback) => ipcRenderer.on(channels.AUTO_FABRIC_INSTALL_STATUS, (event, ...args) => callback(...args)),

    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    toggleMaximizeWindow: () => ipcRenderer.send('window-toggle-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),
});
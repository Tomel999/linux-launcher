const fs = require('fs-extra');
const path = require('path');
const { MINECRAFT_DIR } = require('./constants');

function getVersionFolderName(mcVersion) {
    if (mcVersion === '1.19.2') {
        return '1.19.2-optifine';
    } else {
        return `${mcVersion}-sodium`;
    }
}

function getVersionPreinstalledDirectory(mcVersion) {
    const versionFolderName = getVersionFolderName(mcVersion);
    return path.join(MODS_DIR, versionFolderName, 'preinstalled');
}

const MODS_DIR = path.join(MINECRAFT_DIR, 'mods');

async function getGameVersions(event = null) {
    const versionsPath = path.join(MINECRAFT_DIR, 'versions');
    let fabricVersions = [];

    if (!await fs.pathExists(versionsPath)) {
        console.log('Folder versions nie istnieje:', versionsPath);
        fabricVersions = [];
    } else {
        const dirents = await fs.readdir(versionsPath, { withFileTypes: true });
        fabricVersions = dirents
            .filter(dirent => dirent.isDirectory() && dirent.name.toLowerCase().includes('fabric'))
            .map(dirent => dirent.name)
            .sort()
            .reverse();
    }

    console.log('Znalezione wersje Fabric:', fabricVersions);

    if (fabricVersions.length === 0) {
        console.log('🔍 Rozpoczynam automatyczną instalację Fabric...');

        if (event && event.sender && !event.sender.isDestroyed()) {
            event.sender.send('auto-fabric-install-status', {
                status: 'started',
                message: '🔍 Nie znaleziono wersji Fabric - rozpoczynam automatyczną instalację...',
                progress: 0
            });
        }

        try {
            const { installFabric } = require('./fabricInstaller');

            const onLog = (message) => {
                console.log(`[AUTO-INSTALL] ${message}`);

                if (event && event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('fabric-install-log', message);
                    event.sender.send('auto-fabric-install-status', {
                        status: 'progress',
                        message: message
                    });
                }
            };

            const result = await installFabric(onLog);

            if (result.success) {
                console.log('✅ Automatyczna instalacja Fabric zakończona pomyślnie!');

                if (event && event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('auto-fabric-install-status', {
                        status: 'scanning',
                        message: 'Skanowanie dostępnych wersji...'
                    });
                }

                const newDirents = await fs.readdir(versionsPath, { withFileTypes: true });
                const newFabricVersions = newDirents
                    .filter(dirent => dirent.isDirectory() && dirent.name.toLowerCase().includes('fabric'))
                    .map(dirent => dirent.name)
                    .sort()
                    .reverse();

                if (newFabricVersions.length > 0) {
                    console.log(`🎉 Pomyślnie zainstalowano ${newFabricVersions.length} wersji Fabric!`);

                    if (event && event.sender && !event.sender.isDestroyed()) {
                        event.sender.send('auto-fabric-install-status', {
                            status: 'success',
                            message: `Pomyślnie zainstalowano ${newFabricVersions.length} wersji Fabric!`,
                            versions: newFabricVersions
                        });
                    }
                } else {
                    console.log('❌ Nadal nie znaleziono wersji Fabric po instalacji');

                    if (event && event.sender && !event.sender.isDestroyed()) {
                        event.sender.send('auto-fabric-install-status', {
                            status: 'warning',
                            message: 'Instalacja zakończona, ale nie znaleziono wersji Fabric'
                        });
                    }
                }

                return newFabricVersions;
            } else {
                console.log('❌ Automatyczna instalacja Fabric nie powiodła się:', result.message || 'Nieznany błąd');

                if (event && event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('auto-fabric-install-status', {
                        status: 'error',
                        message: `Instalacja nie powiodła się: ${result.message || 'Nieznany błąd'}`,
                        error: result.message
                    });
                }

                return [];
            }
        } catch (error) {
            console.log('💥 Krytyczny błąd podczas automatycznej instalacji Fabric:', error.message);

            if (event && event.sender && !event.sender.isDestroyed()) {
                event.sender.send('auto-fabric-install-status', {
                    status: 'critical-error',
                    message: `Krytyczny błąd: ${error.message}`,
                    error: error.message
                });
            }

            return [];
        }
    }

    return fabricVersions;
}

async function initializeDirectories() {
    await fs.ensureDir(path.join(MINECRAFT_DIR, 'config'));
    await fs.ensureDir(path.join(MINECRAFT_DIR, 'saves'));
    await fs.ensureDir(path.join(MINECRAFT_DIR, 'resourcepacks'));
    await fs.ensureDir(path.join(MINECRAFT_DIR, 'shaderpacks'));
    await fs.ensureDir(MODS_DIR);

    console.log('Inicjalizacja folderów modów...');

    const versionsPath = path.join(MINECRAFT_DIR, 'versions');
    const createdVersions = new Set();

    if (await fs.pathExists(versionsPath)) {
        const dirents = await fs.readdir(versionsPath, { withFileTypes: true });
        const fabricVersions = dirents
            .filter(dirent => dirent.isDirectory() && dirent.name.toLowerCase().includes('fabric'))
            .map(dirent => dirent.name);

        for (const fabricVersion of fabricVersions) {
            const matches = fabricVersion.match(/(\d+\.\d+(?:\.\d+)?)/g);
            if (matches && matches.length > 0) {
                const mcVersion = matches[matches.length - 1];
                const versionFolderName = getVersionFolderName(mcVersion);
                const versionModsDir = path.join(MODS_DIR, versionFolderName);
                const preinstalledDir = path.join(versionModsDir, 'preinstalled');
                await fs.ensureDir(versionModsDir);
                await fs.ensureDir(preinstalledDir);
                createdVersions.add(mcVersion);
                console.log(`Utworzono folder modów dla wersji: ${mcVersion} (${versionFolderName})`);
                console.log(`  - Utworzono podfolder preinstalled`);
            }
        }
    }

    const commonVersions = ['1.19.2', '1.20.1', '1.20.6', '1.21.1', '1.21.3', '1.21.4', '1.21.5', '1.21.6', '1.21.7'];
    for (const version of commonVersions) {
        if (!createdVersions.has(version)) {
            const versionFolderName = getVersionFolderName(version);
            const versionModsDir = path.join(MODS_DIR, versionFolderName);
            const preinstalledDir = path.join(versionModsDir, 'preinstalled');
            await fs.ensureDir(versionModsDir);
            await fs.ensureDir(preinstalledDir);
            console.log(`Utworzono folder modów dla popularnej wersji: ${version} (${versionFolderName})`);
            console.log(`  - Utworzono podfolder preinstalled`);
        }
    }

    console.log('Inicjalizacja folderów modów zakończona.');
}

async function getVersionModsDirectory(fabricVersionName) {

    const matches = fabricVersionName.match(/(\d+\.\d+(?:\.\d+)?)/g);
    if (!matches || matches.length === 0) {
        throw new Error(`Nie można wyodrębnić wersji z: ${fabricVersionName}`);
    }

    const mcVersion = matches[matches.length - 1];
    const versionFolderName = getVersionFolderName(mcVersion);
    const versionModsDir = path.resolve(path.join(MODS_DIR, versionFolderName));
    const preinstalledDir = path.resolve(path.join(versionModsDir, 'preinstalled'));

    console.log(`\n--- KONFIGURACJA MODÓW DLA WERSJI ${mcVersion} (${versionFolderName}) ---`);

    await fs.ensureDir(MODS_DIR);

    await fs.ensureDir(versionModsDir);

    await fs.ensureDir(preinstalledDir);
    console.log(`Folder modów dla wersji ${mcVersion}: ${versionModsDir}`);
    console.log(`Folder preinstalled: ${preinstalledDir}`);

    let jarFiles = [];
    try {

        if (await fs.pathExists(preinstalledDir)) {
            const preinstalledFiles = await fs.readdir(preinstalledDir);
            jarFiles = preinstalledFiles.filter(file => file.endsWith('.jar'));

            console.log(`Zawartość folderu preinstalled:`);
            if (preinstalledFiles.length === 0) {
                console.log(`  - Folder jest pusty`);
            } else {
                preinstalledFiles.forEach(file => {
                    const isJar = file.endsWith('.jar');
                    console.log(`  - ${file} ${isJar ? '(MOD)' : '(INNY PLIK)'}`);
                });
            }
        } else {
            console.warn(`Folder preinstalled ${preinstalledDir} nie istnieje!`);
        }
    } catch (error) {
        console.error(`Błąd podczas odczytu folderu preinstalled: ${error.message}`);

        try {
            await fs.ensureDir(preinstalledDir);
            console.log(`Ponownie utworzono folder preinstalled: ${preinstalledDir}`);
        } catch (retryError) {
            console.error(`Nie można utworzyć folderu preinstalled: ${retryError.message}`);
        }
    }

    console.log(`Znaleziono ${jarFiles.length} modów preinstalled dla wersji ${mcVersion}`);
    if (jarFiles.length > 0) {
        console.log(`Mody preinstalled: ${jarFiles.join(', ')}`);
    } else {
        console.log(`Brak modów preinstalled w folderze wersji ${mcVersion}`);
    }

    return preinstalledDir;
}

async function ensureVersionFolders() {
    console.log('Sprawdzanie i tworzenie folderów wersji...');

    await fs.ensureDir(MODS_DIR);

    const versionsPath = path.join(MINECRAFT_DIR, 'versions');
    const versionsToCreate = new Set();

    if (await fs.pathExists(versionsPath)) {
        const dirents = await fs.readdir(versionsPath, { withFileTypes: true });
        const fabricVersions = dirents
            .filter(dirent => dirent.isDirectory() && dirent.name.toLowerCase().includes('fabric'))
            .map(dirent => dirent.name);

        for (const fabricVersion of fabricVersions) {
            const matches = fabricVersion.match(/(\d+\.\d+(?:\.\d+)?)/g);
            if (matches && matches.length > 0) {
                const mcVersion = matches[matches.length - 1];
                versionsToCreate.add(mcVersion);
            }
        }
    }

    const commonVersions = ['1.19.2', '1.20.1', '1.20.6', '1.21.1', '1.21.3', '1.21.4', '1.21.5', '1.21.6', '1.21.7'];
    commonVersions.forEach(version => versionsToCreate.add(version));

    for (const version of versionsToCreate) {
        const versionFolderName = getVersionFolderName(version);
        const versionModsDir = path.join(MODS_DIR, versionFolderName);
        const preinstalledDir = path.join(versionModsDir, 'preinstalled');
        await fs.ensureDir(versionModsDir);
        await fs.ensureDir(preinstalledDir);

        try {
            const files = await fs.readdir(preinstalledDir);
            const jarFiles = files.filter(file => file.endsWith('.jar'));
            console.log(`Folder ${versionFolderName}/preinstalled: ${jarFiles.length} modów`);
        } catch (error) {
            console.warn(`Błąd podczas sprawdzania folderu ${versionFolderName}/preinstalled: ${error.message}`);
        }
    }

    console.log(`Utworzono/sprawdzono ${versionsToCreate.size} folderów wersji.`);
}

async function migrateLegacyModFolders() {
    console.log('Sprawdzanie czy potrzebna jest migracja folderów modów...');

    const commonVersions = ['1.19.2', '1.20.1', '1.20.6', '1.21.1', '1.21.3', '1.21.4', '1.21.5', '1.21.6', '1.21.7'];
    let migratedCount = 0;

    for (const version of commonVersions) {
        const oldFolderPath = path.join(MODS_DIR, version);
        const newFolderName = getVersionFolderName(version);
        const newFolderPath = path.join(MODS_DIR, newFolderName);
        const newPreinstalledPath = path.join(newFolderPath, 'preinstalled');

        if (await fs.pathExists(oldFolderPath)) {
            try {
                const oldFiles = await fs.readdir(oldFolderPath);
                const oldJarFiles = oldFiles.filter(file => file.endsWith('.jar'));

                if (oldJarFiles.length > 0) {
                    console.log(`Znaleziono ${oldJarFiles.length} modów w starym folderze: ${version}`);

                    let newFiles = [];
                    if (await fs.pathExists(newPreinstalledPath)) {
                        newFiles = await fs.readdir(newPreinstalledPath);
                    }
                    const newJarFiles = newFiles.filter(file => file.endsWith('.jar'));

                    if (newJarFiles.length === 0) {

                        await fs.ensureDir(newFolderPath);
                        await fs.ensureDir(newPreinstalledPath);

                        console.log(`Migracja modów z ${version} do ${newFolderName}/preinstalled...`);
                        for (const jarFile of oldJarFiles) {
                            const oldFilePath = path.join(oldFolderPath, jarFile);
                            const newFilePath = path.join(newPreinstalledPath, jarFile);

                            try {
                                await fs.move(oldFilePath, newFilePath);
                                console.log(`  Przeniesiono: ${jarFile}`);
                            } catch (moveError) {
                                console.warn(`  Błąd podczas przenoszenia ${jarFile}: ${moveError.message}`);

                                try {
                                    await fs.copy(oldFilePath, newFilePath);
                                    await fs.remove(oldFilePath);
                                    console.log(`  Skopiowano i usunięto: ${jarFile}`);
                                } catch (copyError) {
                                    console.error(`  Nie można przenieść ${jarFile}: ${copyError.message}`);
                                }
                            }
                        }

                        try {
                            const remainingFiles = await fs.readdir(oldFolderPath);
                            if (remainingFiles.length === 0) {
                                await fs.remove(oldFolderPath);
                                console.log(`Usunięto pusty stary folder: ${version}`);
                            }
                        } catch (cleanupError) {
                            console.warn(`Nie można usunąć starego folderu ${version}: ${cleanupError.message}`);
                        }

                        migratedCount++;
                    } else {
                        console.log(`Nowy folder ${newFolderName}/preinstalled już zawiera ${newJarFiles.length} modów, pomijam migrację`);
                    }
                }
            } catch (error) {
                console.error(`Błąd podczas migracji folderu ${version}: ${error.message}`);
            }
        }
    }

    if (migratedCount > 0) {
        console.log(`Migracja zakończona. Przeniesiono mody z ${migratedCount} folderów.`);
    } else {
        console.log('Nie znaleziono folderów wymagających migracji.');
    }
}

module.exports = {
    getGameVersions,
    initializeDirectories,
    getVersionModsDirectory,
    ensureVersionFolders,
    getVersionFolderName,
    getVersionPreinstalledDirectory,
    migrateLegacyModFolders,
};
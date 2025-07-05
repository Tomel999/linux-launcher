const https = require('https');
const fs = require('fs-extra');
const path = require('path');

const CURSEFORGE_API_BASE = 'https://api.curseforge.com/v1';

const CURSEFORGE_API_KEY = '$2a$10$MU49RzBR3olbl2.pcGCfUeJS0St.5hl1WBbxlLsnH/5mXfotHp.wm';

const MINECRAFT_GAME_ID = 432;

const FABRIC_MOD_LOADER_ID = 4;

const MOD_CONFIGS = {
};

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`Making CurseForge request to: ${url}`);

        const hasValidApiKey = CURSEFORGE_API_KEY &&
            !CURSEFORGE_API_KEY.startsWith('$2a$10$bL4bIL5p') &&
            CURSEFORGE_API_KEY.length > 20;
        console.log('API Key check:', {
            hasKey: !!CURSEFORGE_API_KEY,
            keyStart: CURSEFORGE_API_KEY ? CURSEFORGE_API_KEY.substring(0, 10) : 'none',
            isValid: hasValidApiKey
        });

        const requestOptions = {
            headers: {
                'User-Agent': 'Ogulniega-Launcher/1.0.0 (contact@example.com)',
                'Accept': 'application/json',
                ...options.headers
            },
            timeout: 10000
        };

        if (hasValidApiKey) {
            requestOptions.headers['X-API-Key'] = CURSEFORGE_API_KEY;
            console.log('Using CurseForge API key:', CURSEFORGE_API_KEY.substring(0, 10) + '...');
        } else {
            console.warn('CurseForge API key not configured. Some features may not work.');
        }

        const request = https.get(url, requestOptions, (response) => {
            console.log(`CurseForge response status: ${response.statusCode} for ${url}`);

            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                console.log(`Redirecting to: ${response.headers.location}`);
                return makeRequest(response.headers.location, options).then(resolve).catch(reject);
            }

            if (response.statusCode !== 200) {
                let errorData = '';
                response.on('data', (chunk) => {
                    errorData += chunk;
                });
                response.on('end', () => {
                    console.error(`CurseForge API Error ${response.statusCode}:`, errorData);
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage} - ${errorData}`));
                });
                return;
            }

            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log(`Successfully parsed CurseForge JSON response from ${url}`);
                    resolve(jsonData);
                } catch (error) {
                    console.error(`Failed to parse CurseForge JSON from ${url}: ${error.message}`);
                    console.error(`Response data: ${data.substring(0, 500)}...`);
                    reject(new Error(`Failed to parse JSON: ${error.message}`));
                }
            });

            response.on('error', (error) => {
                console.error(`CurseForge response error for ${url}: ${error.message}`);
                reject(error);
            });
        });

        request.on('error', (error) => {
            console.error(`CurseForge request error for ${url}: ${error.message}`);
            reject(error);
        });

        request.on('timeout', () => {
            console.error(`CurseForge request timeout for ${url}`);
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function getProject(projectId) {
    const url = `${CURSEFORGE_API_BASE}/mods/${projectId}`;
    try {
        const response = await makeRequest(url);
        return response.data;
    } catch (error) {
        console.error(`Failed to get project ${projectId}:`, error.message);
        throw error;
    }
}

async function getProjectFiles(projectId, minecraftVersion) {

    const url = `${CURSEFORGE_API_BASE}/mods/${projectId}/files`;
    const response = await makeRequest(url);

    const files = response.data || [];
    return files.filter(file => {

        const hasMinecraftVersion = file.gameVersions && file.gameVersions.includes(minecraftVersion);

        const hasFabric = file.gameVersions && file.gameVersions.includes('Fabric');

        return hasMinecraftVersion && hasFabric;
    });
}

async function getProjectFilesWithFallback(projectId, minecraftVersion, onLog) {

    try {
        onLog(`Trying exact version: ${minecraftVersion}`);
        const files = await getProjectFiles(projectId, minecraftVersion);
        if (files.length > 0) {
            onLog(`Found ${files.length} files for ${minecraftVersion}`);
            return { files, usedVersion: minecraftVersion };
        }
    } catch (error) {
        onLog(`Error fetching files for ${minecraftVersion}: ${error.message}`);
    }

    const fallbackVersions = getCompatibleVersions(minecraftVersion);
    onLog(`No files found for ${minecraftVersion}, trying fallback versions: ${fallbackVersions.join(', ')}`);

    for (const fallbackVersion of fallbackVersions) {
        try {
            onLog(`Trying fallback version: ${fallbackVersion}`);
            const files = await getProjectFiles(projectId, fallbackVersion);
            if (files.length > 0) {
                onLog(`Found ${files.length} files for fallback ${fallbackVersion}`);
                return { files, usedVersion: fallbackVersion };
            }
        } catch (error) {
            onLog(`Error fetching files for fallback ${fallbackVersion}: ${error.message}`);
        }
    }

    onLog(`No compatible files found for any fallback versions`);
    return { files: [], usedVersion: null };
}

function getCompatibleVersions(targetVersion) {

    const versionCompatibility = {
        '1.19.2': ['1.19.1', '1.19'],
        '1.19.1': ['1.19'],
        '1.20.1': ['1.20'],
        '1.20.2': ['1.20.1', '1.20'],
        '1.20.3': ['1.20.2', '1.20.1', '1.20'],
        '1.20.4': ['1.20.3', '1.20.2', '1.20.1', '1.20'],
        '1.20.5': ['1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20'],
        '1.20.6': ['1.20.5', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20'],
        '1.21.1': ['1.21'],
        '1.21.2': ['1.21.1', '1.21'],
        '1.21.3': ['1.21.2', '1.21.1', '1.21'],
        '1.21.4': ['1.21.3', '1.21.2', '1.21.1', '1.21'],
        '1.21.5': ['1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21'],
        '1.21.6': ['1.21.5', '1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21'],
        '1.21.7': ['1.21.6', '1.21.5', '1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21']
    };

    return versionCompatibility[targetVersion] || [];
}

function downloadFile(url, filePath, onProgress) {
    return new Promise((resolve, reject) => {

        const dir = path.dirname(filePath);
        fs.ensureDir(dir).then(() => {
            const file = fs.createWriteStream(filePath);

            file.on('error', (error) => {
                console.error(`File stream error: ${error.message}`);
                fs.unlink(filePath, () => {});
                reject(error);
            });

            const options = {
                headers: {
                    'User-Agent': 'Ogulniega-Launcher/1.0.0 (contact@example.com)'
                },

                timeout: 30000
            };

            const request = https.get(url, options, (response) => {

                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    file.close();
                    fs.unlink(filePath, () => {});
                    return downloadFile(response.headers.location, filePath, onProgress)
                        .then(resolve)
                        .catch(reject);
                }

                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(filePath, () => {});
                    return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                }

                const totalSize = parseInt(response.headers['content-length'], 10);
                let downloadedSize = 0;

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    if (onProgress && totalSize) {
                        const progress = Math.round((downloadedSize / totalSize) * 100);
                        onProgress(progress, downloadedSize, totalSize);
                    }
                });

                response.on('error', (error) => {
                    console.error(`Response error: ${error.message}`);
                    file.close();
                    fs.unlink(filePath, () => {});
                    reject(error);
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close((err) => {
                        if (err) {
                            console.error(`File close error: ${err.message}`);
                            fs.unlink(filePath, () => {});
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });

            request.on('error', (error) => {
                console.error(`Request error: ${error.message}`);
                file.close();
                fs.unlink(filePath, () => {});
                reject(error);
            });

            request.on('timeout', () => {
                console.error('Request timeout');
                request.destroy();
                file.close();
                fs.unlink(filePath, () => {});
                reject(new Error('Request timeout'));
            });
        }).catch(reject);
    });
}

async function isModAlreadyInstalled(modConfig, versionModsDir) {
    try {
        if (!await fs.pathExists(versionModsDir)) {
            return false;
        }

        const files = await fs.readdir(versionModsDir);
        const jarFiles = files.filter(file => file.endsWith('.jar'));

        if (jarFiles.length === 0) {
            return false;
        }

        const modName = modConfig.name.toLowerCase();

        const nameVariants = getModNameVariants(modConfig);

        return jarFiles.some(file => {
            const fileName = file.toLowerCase();

            return nameVariants.some(variant =>
                fileName.includes(variant.toLowerCase())
            );
        });
    } catch (error) {
        console.error(`Error checking if mod is installed: ${error.message}`);
        return false;
    }
}

function getModNameVariants(modConfig) {
    const variants = [modConfig.name];

    switch (modConfig.projectId) {
        case 419699:
            variants.push('fabric-api', 'fabricapi');
            break;
        case 394468:
            variants.push('sodium');
            break;
        case 360438:
            variants.push('lithium');
            break;
        case 372124:
            variants.push('phosphor');
            break;
        case 455508:
            variants.push('iris', 'iris-shaders');
            break;
        case 308702:
            variants.push('modmenu', 'mod-menu');
            break;
        case 310111:
            variants.push('rei', 'roughlyenoughitems');
            break;
        case 459496:
            variants.push('indium');
            break;
        case 325471:
            variants.push('jei', 'justenoughitems');
            break;
        case 238222:
            variants.push('journeymap');
            break;
    }

    variants.forEach(variant => {
        if (variant.includes(' ')) {
            variants.push(variant.replace(/ /g, '-'));
            variants.push(variant.replace(/ /g, '_'));
            variants.push(variant.replace(/ /g, ''));
        }
    });

    return [...new Set(variants)];
}

async function downloadMod(modConfig, minecraftVersion, versionModsDir, onLog, onProgress) {
    try {
        onLog(`Checking ${modConfig.name} (ID: ${modConfig.projectId})...`);

        if (await isModAlreadyInstalled(modConfig, versionModsDir)) {
            onLog(`${modConfig.name} already installed, skipping.`);
            return { success: true, skipped: true };
        }

        const hasValidApiKey = CURSEFORGE_API_KEY && !CURSEFORGE_API_KEY.startsWith('$2a$10$bL4bIL5p');
        if (!hasValidApiKey) {
            onLog(`Skipping ${modConfig.name} - CurseForge API key required`);
            return { success: false, reason: 'API key required' };
        }

        onLog(`Fetching project info for ${modConfig.name}...`);

        const project = await getProject(modConfig.projectId);
        onLog(`Project info retrieved: ${project.name || modConfig.name}`);

        onLog(`Fetching files for MC ${minecraftVersion}...`);

        const { files, usedVersion } = await getProjectFilesWithFallback(modConfig.projectId, minecraftVersion, onLog);

        if (files.length === 0) {
            onLog(`No compatible file found for ${modConfig.name} (MC ${minecraftVersion} or fallback versions)`);
            return { success: false, reason: 'No compatible file' };
        }

        const latestFile = files.sort((a, b) => new Date(b.fileDate) - new Date(a.fileDate))[0];
        if (usedVersion !== minecraftVersion) {
            onLog(`Selected file: ${latestFile.fileName} (${latestFile.displayName || 'unnamed'}) - using fallback MC ${usedVersion}`);
        } else {
            onLog(`Selected file: ${latestFile.fileName} (${latestFile.displayName || 'unnamed'})`);
        }

        if (!latestFile.downloadUrl) {
            onLog(`No download URL found for ${modConfig.name}`);
            return { success: false, reason: 'No download URL' };
        }

        onLog(`Download file: ${latestFile.fileName} (${Math.round(latestFile.fileLength / 1024 / 1024 * 100) / 100}MB)`);
        onLog(`Download URL: ${latestFile.downloadUrl}`);

        const fileName = latestFile.fileName;

        const filePath = path.resolve(path.join(versionModsDir, fileName));

        onLog(`Downloading ${modConfig.name} (${fileName})...`);
        onLog(`Target path: ${filePath}`);

        try {
            await fs.ensureDir(versionModsDir);

            const testFile = path.join(versionModsDir, '.write_test');
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
        } catch (permError) {
            onLog(`Directory permission error: ${permError.message}`);
            return { success: false, reason: `Directory not writable: ${permError.message}` };
        }

        await downloadFile(latestFile.downloadUrl, filePath, (progress, downloaded, total) => {
            if (onProgress) {
                onProgress(modConfig.name, progress, downloaded, total);
            }
        });

        onLog(`Downloaded ${modConfig.name} (${fileName})`);
        return { success: true, fileName, fileId: latestFile.id };

    } catch (error) {
        onLog(`Failed to download ${modConfig.name}: ${error.message}`);
        return { success: false, reason: error.message };
    }
}

async function scanInstalledMods(versionModsDir, modConfigs, onLog) {
    try {
        if (!await fs.pathExists(versionModsDir)) {
            onLog(`Mods directory doesn't exist yet: ${versionModsDir}`);
            return { installedMods: [], missingMods: modConfigs };
        }

        const files = await fs.readdir(versionModsDir);
        const jarFiles = files.filter(file => file.endsWith('.jar'));

        onLog(`Found ${jarFiles.length} JAR files in mods directory`);
        if (jarFiles.length > 0) {
            onLog(`Existing files: ${jarFiles.join(', ')}`);
        }

        const installedMods = [];
        const missingMods = [];

        for (const modConfig of modConfigs) {
            if (await isModAlreadyInstalled(modConfig, versionModsDir)) {
                installedMods.push(modConfig);
                onLog(`Found: ${modConfig.name}`);
            } else {
                missingMods.push(modConfig);
                onLog(`Missing: ${modConfig.name}`);
            }
        }

        return { installedMods, missingMods };
    } catch (error) {
        onLog(`Error scanning mods: ${error.message}`);
        return { installedMods: [], missingMods: modConfigs };
    }
}

async function downloadModsForVersion(minecraftVersion, versionModsDir, onLog, onProgress) {
    onLog(`System info: Platform=${process.platform}, Arch=${process.arch}`);
    onLog(`Target directory: ${versionModsDir}`);

    const hasValidApiKey = CURSEFORGE_API_KEY && !CURSEFORGE_API_KEY.startsWith('$2a$10$bL4bIL5p');
    if (!hasValidApiKey) {
        onLog(`WARNING: CurseForge API key not configured. Downloads may fail.`);
        onLog(`To fix this, get an API key from https://console.curseforge.com/`);
        onLog(`and set CURSEFORGE_API_KEY environment variable.`);
    }

    const modConfigs = MOD_CONFIGS[minecraftVersion];

    if (!modConfigs || modConfigs.length === 0) {
        onLog(`No mods configured for Minecraft ${minecraftVersion}`);
        return { success: true, downloaded: 0, skipped: 0, failed: 0 };
    }

    onLog(`\nScanning mods for Minecraft ${minecraftVersion}...`);
    onLog(`Required mods: ${modConfigs.map(m => m.name).join(', ')}`);

    try {
        await fs.ensureDir(versionModsDir);
        onLog(`Directory created/verified: ${versionModsDir}`);

        const testFile = path.join(versionModsDir, '.permission_test');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        onLog(`Directory is writable`);
    } catch (dirError) {
        onLog(`Directory setup failed: ${dirError.message}`);
        return { success: false, downloaded: 0, skipped: 0, failed: 0, error: dirError.message };
    }

    const { installedMods, missingMods } = await scanInstalledMods(versionModsDir, modConfigs, onLog);

    if (installedMods.length > 0) {
        onLog(`\nAlready installed (${installedMods.length}): ${installedMods.map(m => m.name).join(', ')}`);
    }

    if (missingMods.length === 0) {
        onLog(`\nAll mods are already installed! No downloads needed.`);
        return { success: true, downloaded: 0, skipped: installedMods.length, failed: 0 };
    }

    onLog(`\nNeed to download (${missingMods.length}): ${missingMods.map(m => m.name).join(', ')}`);
    onLog(`Starting downloads...`);

    const modsToDownload = missingMods;

    let downloaded = 0;
    let skipped = installedMods.length;
    let failed = 0;

    for (let i = 0; i < modsToDownload.length; i++) {
        const modConfig = modsToDownload[i];

        if (onProgress) {
            onProgress(`Downloading mods (${i + 1}/${modsToDownload.length})`, i + 1, modsToDownload.length);
        }

        const result = await downloadMod(
            modConfig,
            minecraftVersion,
            versionModsDir,
            onLog,
            (modName, progress, downloadedBytes, totalBytes) => {
                onLog(`  ${modName}: ${progress}% (${Math.round(downloadedBytes / 1024 / 1024 * 100) / 100}MB / ${Math.round(totalBytes / 1024 / 1024 * 100) / 100}MB)`);
            }
        );

        if (result.success) {
            if (result.skipped) {

                skipped++;
            } else {
                downloaded++;
            }
        } else {
            failed++;
        }
    }

    onLog(`\nMod installation summary for MC ${minecraftVersion}:`);
    onLog(`  Downloaded: ${downloaded}`);
    onLog(`  Skipped: ${skipped}`);
    onLog(`  Failed: ${failed}`);

    return { success: true, downloaded, skipped, failed };
}

function getModsForVersion(minecraftVersion) {
    return MOD_CONFIGS[minecraftVersion] || [];
}

module.exports = {
    downloadModsForVersion,
    getModsForVersion,
    downloadMod,
    getProject,
    getProjectFiles,
    getProjectFilesWithFallback,
    getCompatibleVersions,
    scanInstalledMods,
    isModAlreadyInstalled
};
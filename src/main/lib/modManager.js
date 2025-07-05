const fs = require('fs-extra');
const path = require('path');
const https = require('https');

const modsConfig = require('./mods-config.json');

function makeRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
        console.log(`Making request to: ${url}`);

        const options = {
            headers: {
                'User-Agent': headers['User-Agent'] || 'Ogulniega-Launcher/1.0.0',
                ...headers
            },
            timeout: modsConfig.settings.download_timeout
        };

        const request = https.get(url, options, (response) => {
            console.log(`Response status: ${response.statusCode} for ${url}`);

            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                console.log(`Redirecting to: ${response.headers.location}`);
                return makeRequest(response.headers.location, headers).then(resolve).catch(reject);
            }

            if (response.statusCode !== 200) {
                return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            }

            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log(`Successfully parsed JSON response from ${url}`);
                    resolve(jsonData);
                } catch (error) {
                    console.error(`Failed to parse JSON from ${url}: ${error.message}`);
                    reject(new Error(`Failed to parse JSON: ${error.message}`));
                }
            });

            response.on('error', (error) => {
                console.error(`Response error for ${url}: ${error.message}`);
                reject(error);
            });
        });

        request.on('error', (error) => {
            console.error(`Request error for ${url}: ${error.message}`);
            reject(error);
        });

        request.on('timeout', () => {
            console.error(`Request timeout for ${url}`);
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

function downloadFile(url, filePath, onProgress, headers = {}) {
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
                    'User-Agent': headers['User-Agent'] || 'Ogulniega-Launcher/1.0.0',
                    ...headers
                },
                timeout: modsConfig.settings.download_timeout
            };

            const request = https.get(url, options, (response) => {

                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    file.close();
                    fs.unlink(filePath, () => {});
                    return downloadFile(response.headers.location, filePath, onProgress, headers)
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

async function downloadFromModrinth(modConfig, minecraftVersion, onLog) {
    const sourceConfig = modsConfig.sources.modrinth;

    onLog(`Fetching from Modrinth: ${modConfig.name} (ID: ${modConfig.id})`);

    const projectUrl = `${sourceConfig.api_base}/project/${modConfig.id}`;
    const project = await makeRequest(projectUrl, {
        'User-Agent': sourceConfig.user_agent
    });

    const versionsUrl = `${sourceConfig.api_base}/project/${modConfig.id}/version?game_versions=["${minecraftVersion}"]&loaders=["fabric"]`;
    const versions = await makeRequest(versionsUrl, {
        'User-Agent': sourceConfig.user_agent
    });

    if (versions.length === 0) {
        throw new Error(`No versions found for ${modConfig.name} on Minecraft ${minecraftVersion}`);
    }

    let selectedVersion;
    if (modConfig.version === 'latest') {
        selectedVersion = versions[0];
    } else {
        selectedVersion = versions.find(v => v.version_number === modConfig.version);
        if (!selectedVersion) {
            throw new Error(`Version ${modConfig.version} not found for ${modConfig.name}`);
        }
    }

    const file = selectedVersion.files.find(f => f.primary) || selectedVersion.files[0];
    if (!file) {
        throw new Error(`No download file found for ${modConfig.name}`);
    }

    onLog(`Selected version: ${selectedVersion.version_number} (${file.filename})`);

    return {
        downloadUrl: file.url,
        filename: file.filename,
        version: selectedVersion.version_number,
        size: file.size
    };
}

async function downloadFromCurseForge(modConfig, minecraftVersion, onLog) {
    const sourceConfig = modsConfig.sources.curseforge;

    onLog(`Fetching from CurseForge: ${modConfig.name} (ID: ${modConfig.id})`);

    const projectUrl = `${sourceConfig.api_base}/mods/${modConfig.id}`;
    const projectResponse = await makeRequest(projectUrl, {
        'x-api-key': sourceConfig.api_key
    });
    const project = projectResponse.data;

    const filesUrl = `${sourceConfig.api_base}/mods/${modConfig.id}/files?gameVersion=${minecraftVersion}&modLoaderType=${sourceConfig.mod_loader_id}`;
    const filesResponse = await makeRequest(filesUrl, {
        'x-api-key': sourceConfig.api_key
    });
    const files = filesResponse.data;

    if (files.length === 0) {
        throw new Error(`No files found for ${modConfig.name} on Minecraft ${minecraftVersion}`);
    }

    let selectedFile;
    if (modConfig.version === 'latest') {
        selectedFile = files.sort((a, b) => new Date(b.fileDate) - new Date(a.fileDate))[0];
    } else {
        selectedFile = files.find(f => f.displayName.includes(modConfig.version));
        if (!selectedFile) {
            throw new Error(`Version ${modConfig.version} not found for ${modConfig.name}`);
        }
    }

    onLog(`Selected file: ${selectedFile.displayName} (${selectedFile.fileName})`);

    return {
        downloadUrl: selectedFile.downloadUrl,
        filename: selectedFile.fileName,
        version: selectedFile.displayName,
        size: selectedFile.fileLength
    };
}

async function downloadFromGitHub(modConfig, minecraftVersion, onLog) {
    const sourceConfig = modsConfig.sources.github;

    onLog(`Fetching from GitHub: ${modConfig.name} (${modConfig.owner}/${modConfig.repo})`);

    const releasesUrl = `${sourceConfig.api_base}/repos/${modConfig.owner}/${modConfig.repo}/releases`;
    const releases = await makeRequest(releasesUrl, {
        'User-Agent': sourceConfig.user_agent
    });

    if (releases.length === 0) {
        throw new Error(`No releases found for ${modConfig.name}`);
    }

    let selectedRelease;
    if (modConfig.version === 'latest') {
        selectedRelease = releases[0];
    } else {
        selectedRelease = releases.find(r => r.tag_name === modConfig.version);
        if (!selectedRelease) {
            throw new Error(`Version ${modConfig.version} not found for ${modConfig.name}`);
        }
    }

    const asset = selectedRelease.assets.find(a => a.name === modConfig.filename);
    if (!asset) {
        throw new Error(`File ${modConfig.filename} not found in release ${selectedRelease.tag_name}`);
    }

    onLog(`Selected release: ${selectedRelease.tag_name} (${asset.name})`);

    return {
        downloadUrl: asset.browser_download_url,
        filename: asset.name,
        version: selectedRelease.tag_name,
        size: asset.size
    };
}

async function downloadFromDirect(modConfig, minecraftVersion, onLog) {
    onLog(`Fetching from direct URL: ${modConfig.name}`);

    return {
        downloadUrl: modConfig.url,
        filename: modConfig.filename,
        version: modConfig.version,
        size: null
    };
}

async function isModInstalled(modConfig, versionModsDir) {
    try {
        if (!await fs.pathExists(versionModsDir)) {
            return false;
        }

        const files = await fs.readdir(versionModsDir);
        const jarFiles = files.filter(file => file.endsWith('.jar'));

        const modName = modConfig.name.toLowerCase();
        const nameVariants = [
            modName,
            modName.replace(/\s+/g, '-'),
            modName.replace(/\s+/g, '_'),
            modName.replace(/\s+/g, '')
        ];

        return jarFiles.some(file => {
            const fileName = file.toLowerCase();

            if (modConfig.name && modConfig.name.toLowerCase() === 'sodium') {
                return nameVariants.some(variant => {
                    const variantLower = variant.toLowerCase();

                    return (fileName.startsWith(variantLower + '-') ||
                           fileName === variantLower + '.jar') &&
                           !fileName.includes('extra') &&
                           !fileName.includes('options') &&
                           !fileName.includes('reeses');
                });
            }

            return nameVariants.some(variant => fileName.includes(variant));
        });
    } catch (error) {
        console.error(`Error checking if mod is installed: ${error.message}`);
        return false;
    }
}

async function downloadMod(modConfig, minecraftVersion, versionModsDir, onLog, onProgress) {
    try {
        onLog(`Processing ${modConfig.name}...`);

        if (await isModInstalled(modConfig, versionModsDir)) {
            onLog(`${modConfig.name} already installed, skipping.`);
            return { success: true, skipped: true };
        }

        let downloadInfo;

        switch (modConfig.source) {
            case 'modrinth':
                downloadInfo = await downloadFromModrinth(modConfig, minecraftVersion, onLog);
                break;
            case 'curseforge':
                downloadInfo = await downloadFromCurseForge(modConfig, minecraftVersion, onLog);
                break;
            case 'github':
                downloadInfo = await downloadFromGitHub(modConfig, minecraftVersion, onLog);
                break;
            case 'direct':
                downloadInfo = await downloadFromDirect(modConfig, minecraftVersion, onLog);
                break;
            default:
                throw new Error(`Unknown source: ${modConfig.source}`);
        }

        const filePath = path.join(versionModsDir, downloadInfo.filename);

        onLog(`Downloading ${modConfig.name} v${downloadInfo.version} (${downloadInfo.filename})...`);
        if (downloadInfo.size) {
            onLog(`File size: ${Math.round(downloadInfo.size / 1024 / 1024 * 100) / 100}MB`);
        }

        await fs.ensureDir(versionModsDir);

        await downloadFile(downloadInfo.downloadUrl, filePath, (progress, downloaded, total) => {
            if (onProgress) {
                onProgress(modConfig.name, progress, downloaded, total);
            }
        });

        onLog(`Downloaded ${modConfig.name} v${downloadInfo.version}`);
        return {
            success: true,
            fileName: downloadInfo.filename,
            version: downloadInfo.version
        };

    } catch (error) {
        onLog(`Failed to download ${modConfig.name}: ${error.message}`);

        if (modConfig.required) {
            throw error;
        }

        return { success: false, reason: error.message };
    }
}

async function downloadModsForVersion(minecraftVersion, versionModsDir, onLog, onProgress) {
    onLog(`Starting mod download for Minecraft ${minecraftVersion}...`);
    onLog(`Target directory: ${versionModsDir}`);

    const versionConfig = modsConfig.versions[minecraftVersion];
    if (!versionConfig || !versionConfig.mods || versionConfig.mods.length === 0) {
        onLog(`No mods configured for Minecraft ${minecraftVersion}`);
        return { success: true, downloaded: 0, skipped: 0, failed: 0 };
    }

    const mods = versionConfig.mods;
    onLog(`Found ${mods.length} mods configured for this version`);

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

    const installedMods = [];
    const missingMods = [];

    for (const modConfig of mods) {
        if (await isModInstalled(modConfig, versionModsDir)) {
            installedMods.push(modConfig);
            onLog(`Already installed: ${modConfig.name}`);
        } else {
            missingMods.push(modConfig);
            onLog(`Missing: ${modConfig.name}`);
        }
    }

    if (missingMods.length === 0) {
        onLog(`All mods are already installed! No downloads needed.`);
        return { success: true, downloaded: 0, skipped: installedMods.length, failed: 0 };
    }

    onLog(`Need to download ${missingMods.length} mods`);

    let downloaded = 0;
    let skipped = installedMods.length;
    let failed = 0;

    for (let i = 0; i < missingMods.length; i++) {
        const modConfig = missingMods[i];

        if (onProgress) {
            onProgress(`Downloading mods (${i + 1}/${missingMods.length})`, i + 1, missingMods.length);
        }

        try {
            const result = await downloadMod(
                modConfig,
                minecraftVersion,
                versionModsDir,
                onLog,
                (modName, progress, downloadedBytes, totalBytes) => {
                    if (totalBytes) {
                        onLog(`  ${modName}: ${progress}% (${Math.round(downloadedBytes / 1024 / 1024 * 100) / 100}MB / ${Math.round(totalBytes / 1024 / 1024 * 100) / 100}MB)`);
                    } else {
                        onLog(`  ${modName}: ${progress}%`);
                    }
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
        } catch (error) {
            onLog(`Critical error downloading ${modConfig.name}: ${error.message}`);
            failed++;

            if (modConfig.required) {
                onLog(`Required mod ${modConfig.name} failed to download. Stopping.`);
                break;
            }
        }
    }

    onLog(`\nMod installation summary for MC ${minecraftVersion}:`);
    onLog(`  Downloaded: ${downloaded}`);
    onLog(`  Skipped: ${skipped}`);
    onLog(`  Failed: ${failed}`);

    return { success: true, downloaded, skipped, failed };
}

function getModsForVersion(minecraftVersion) {
    const versionConfig = modsConfig.versions[minecraftVersion];
    return versionConfig ? versionConfig.mods : [];
}

async function updateModsConfig(newConfig) {
    try {
        const configPath = path.join(__dirname, 'mods-config.json');
        await fs.writeJson(configPath, newConfig, { spaces: 2 });
        console.log('Mods configuration updated successfully');
        return true;
    } catch (error) {
        console.error(`Error updating mods configuration: ${error.message}`);
        return false;
    }
}

module.exports = {
    downloadModsForVersion,
    getModsForVersion,
    downloadMod,
    isModInstalled,
    updateModsConfig,
    downloadFromModrinth,
    downloadFromCurseForge,
    downloadFromGitHub,
    downloadFromDirect
};
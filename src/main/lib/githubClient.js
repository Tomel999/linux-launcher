const https = require('https');
const fs = require('fs-extra');
const path = require('path');

let config;
try {
    const configPath = path.join(__dirname, 'github-mods-config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Error loading GitHub mods config:', error.message);

    config = {
        repository: {
            owner: 'owner',
            name: 'repository',
            url: 'https://api.github.com/repos/owner/repository'
        },
        mods: {}
    };
}

const GITHUB_REPO_URL = config.repository.url;
const MOD_CONFIGS = config.mods;

async function updateModConfigFileName(modConfig, newFileName, onLog) {
    try {

        for (const version in MOD_CONFIGS) {
            const mods = MOD_CONFIGS[version];
            const modIndex = mods.findIndex(m => m.name === modConfig.name);
            if (modIndex !== -1) {
                const oldFileName = mods[modIndex].fileName;
                mods[modIndex].fileName = newFileName;
                onLog(`Updated config: ${modConfig.name} file name changed from ${oldFileName} to ${newFileName}`);

                const configPath = path.join(__dirname, 'github-mods-config.json');
                await fs.writeJson(configPath, config, { spaces: 2 });
                onLog(`Configuration file updated successfully`);
                return true;
            }
        }
        return false;
    } catch (error) {
        onLog(`Error updating mod config: ${error.message}`);
        return false;
    }
}

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        console.log(`Making GitHub request to: ${url}`);

        const options = {
            headers: {
                'User-Agent': 'Ogulniega-Launcher/1.0.0 (contact@example.com)',
                'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 10000
        };

        const request = https.get(url, options, (response) => {
            console.log(`GitHub response status: ${response.statusCode} for ${url}`);

            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                console.log(`Redirecting to: ${response.headers.location}`);
                return makeRequest(response.headers.location).then(resolve).catch(reject);
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
                    console.log(`Successfully parsed GitHub JSON response from ${url}`);
                    resolve(jsonData);
                } catch (error) {
                    console.error(`Failed to parse GitHub JSON from ${url}: ${error.message}`);
                    console.error(`Response data: ${data.substring(0, 500)}...`);
                    reject(new Error(`Failed to parse JSON: ${error.message}`));
                }
            });

            response.on('error', (error) => {
                console.error(`GitHub response error for ${url}: ${error.message}`);
                reject(error);
            });
        });

        request.on('error', (error) => {
            console.error(`GitHub request error for ${url}: ${error.message}`);
            reject(error);
        });

        request.on('timeout', () => {
            console.error(`GitHub request timeout for ${url}`);
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function getLatestRelease() {
    const url = `${GITHUB_REPO_URL}/releases/latest`;
    return await makeRequest(url);
}

async function getReleaseByTag(tag) {
    const url = `${GITHUB_REPO_URL}/releases/tags/${tag}`;
    return await makeRequest(url);
}

async function getAllReleases() {
    const url = `${GITHUB_REPO_URL}/releases`;
    return await makeRequest(url);
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

        return jarFiles.some(file => file === modConfig.fileName);
    } catch (error) {
        console.error(`Error checking if GitHub mod is installed: ${error.message}`);
        return false;
    }
}

async function compareFileWithGitHub(modConfig, versionModsDir, onLog) {
    try {

        let release;
        if (modConfig.tag) {
            onLog(`Fetching GitHub release info for tag '${modConfig.tag}'...`);
            release = await getReleaseByTag(modConfig.tag);
        } else {
            onLog(`Fetching latest GitHub release info...`);
            release = await getLatestRelease();
        }

        let asset = findAssetInRelease(release, modConfig.fileName);
        let githubFileName = modConfig.fileName;

        if (!asset) {
            onLog(`Exact file ${modConfig.fileName} not found, trying intelligent search...`);
            asset = findAssetByBaseName(release, modConfig);
            if (asset) {
                githubFileName = asset.name;
                onLog(`Found alternative file on GitHub: ${githubFileName}`);
            }
        }

        if (!asset) {
            onLog(`No matching file found for ${modConfig.name} in GitHub release ${release.tag_name}`);
            onLog(`Available files: ${release.assets.map(a => a.name).join(', ')}`);
            return {
                needsRedownload: true,
                reason: 'File not found in GitHub release',
                newFileName: null
            };
        }

        const configFilePath = path.join(versionModsDir, modConfig.fileName);
        const githubFilePath = path.join(versionModsDir, githubFileName);

        let localFilePath = null;
        let localStats = null;

        if (await fs.pathExists(configFilePath)) {
            localFilePath = configFilePath;
            localStats = await fs.stat(configFilePath);
        }

        else if (githubFileName !== modConfig.fileName && await fs.pathExists(githubFilePath)) {
            localFilePath = githubFilePath;
            localStats = await fs.stat(githubFilePath);
        }

        else {
            const oldVersions = await findOldModVersions(modConfig, versionModsDir);
            if (oldVersions.length > 0) {

                localFilePath = path.join(versionModsDir, oldVersions[0]);
                localStats = await fs.stat(localFilePath);
                onLog(`Found existing file with similar name: ${oldVersions[0]}`);
            }
        }

        if (!localFilePath || !localStats) {
            onLog(`No local file found for ${modConfig.name}`);
            return {
                needsRedownload: true,
                reason: 'File not found locally',
                newFileName: githubFileName
            };
        }

        const localSize = localStats.size;
        const githubSize = asset.size;
        const localModified = localStats.mtime;

        onLog(`Comparing ${modConfig.name}:`);
        onLog(`  Local file: ${path.basename(localFilePath)} (${localSize} bytes)`);
        onLog(`  GitHub file: ${githubFileName} (${githubSize} bytes)`);
        onLog(`  Local modified: ${localModified.toISOString()}`);
        onLog(`  GitHub updated: ${asset.updated_at || release.published_at}`);

        if (path.basename(localFilePath) !== githubFileName) {
            onLog(`File name changed! Local: ${path.basename(localFilePath)}, GitHub: ${githubFileName}`);
            return {
                needsRedownload: true,
                reason: `File name changed (local: ${path.basename(localFilePath)}, github: ${githubFileName})`,
                newFileName: githubFileName,
                asset: asset
            };
        }

        if (localSize !== githubSize) {
            onLog(`File size mismatch! Local: ${localSize}, GitHub: ${githubSize}`);
            return {
                needsRedownload: true,
                reason: `Size mismatch (local: ${localSize}, github: ${githubSize})`,
                newFileName: githubFileName,
                asset: asset
            };
        }

        onLog(`File ${githubFileName} matches GitHub version`);
        return {
            needsRedownload: false,
            reason: 'File matches GitHub version',
            newFileName: githubFileName
        };

    } catch (error) {
        onLog(`Error comparing file with GitHub: ${error.message}`);
        return {
            needsRedownload: true,
            reason: `Comparison error: ${error.message}`,
            newFileName: null
        };
    }
}

async function findOldModVersions(modConfig, versionModsDir) {
    try {
        if (!await fs.pathExists(versionModsDir)) {
            return [];
        }

        const files = await fs.readdir(versionModsDir);
        const jarFiles = files.filter(file => file.endsWith('.jar'));

        if (jarFiles.length === 0) {
            return [];
        }

        const currentFileName = modConfig.fileName.toLowerCase();
        let baseName = currentFileName.replace(/\.jar$/, '');

        baseName = baseName.replace(/[-_]?v?\d+.*$/, '');

        if (baseName.length < 3) {
            baseName = modConfig.name.toLowerCase().replace(/\.jar$/, '').replace(/[-_]?v?\d+.*$/, '');
        }

        console.log(`[DEBUG] Finding old versions for ${modConfig.fileName}, baseName: "${baseName}"`);
        console.log(`[DEBUG] Available files: ${jarFiles.join(', ')}`);

        const oldVersions = jarFiles.filter(file => {
            const fileName = file.toLowerCase();

            if (file === modConfig.fileName) {
                return false;
            }

            const fileBaseName = fileName.replace(/\.jar$/, '').replace(/[-_]?v?\d+.*$/, '');

            const isMatch = fileBaseName === baseName || fileName.startsWith(baseName + '-') || fileName.startsWith(baseName + '_');

            console.log(`[DEBUG] File: ${file}, fileBaseName: "${fileBaseName}", baseName: "${baseName}", match: ${isMatch}`);

            return isMatch;
        });

        return oldVersions;
    } catch (error) {
        console.error(`Error finding old mod versions: ${error.message}`);
        return [];
    }
}

async function removeOldModVersions(modConfig, versionModsDir, onLog) {
    try {
        const oldVersions = await findOldModVersions(modConfig, versionModsDir);

        if (oldVersions.length === 0) {
            return { removed: 0, files: [] };
        }

        onLog(`Found ${oldVersions.length} old version(s) of ${modConfig.name}: ${oldVersions.join(', ')}`);

        const removedFiles = [];
        for (const oldFile of oldVersions) {
            try {
                const oldFilePath = path.join(versionModsDir, oldFile);
                await fs.remove(oldFilePath);
                removedFiles.push(oldFile);
                onLog(`Removed old version: ${oldFile}`);
            } catch (removeError) {
                onLog(`Failed to remove old version ${oldFile}: ${removeError.message}`);
            }
        }

        return { removed: removedFiles.length, files: removedFiles };
    } catch (error) {
        onLog(`Error removing old mod versions: ${error.message}`);
        return { removed: 0, files: [] };
    }
}

async function checkModForUpdates(modConfig, versionModsDir, onLog) {
    try {

        const isCurrentInstalled = await isModAlreadyInstalled(modConfig, versionModsDir);

        const oldVersions = await findOldModVersions(modConfig, versionModsDir);

        let needsRedownload = false;
        let comparisonResult = null;

        if (isCurrentInstalled) {
            onLog(`Comparing local ${modConfig.fileName} with GitHub version...`);
            comparisonResult = await compareFileWithGitHub(modConfig, versionModsDir, onLog);
            needsRedownload = comparisonResult.needsRedownload;

            if (needsRedownload) {
                onLog(`Local file needs redownload: ${comparisonResult.reason}`);
                if (comparisonResult.newFileName && comparisonResult.newFileName !== modConfig.fileName) {
                    onLog(`GitHub has new file name: ${comparisonResult.newFileName}`);
                }
            }
        }

        if (isCurrentInstalled && !needsRedownload && oldVersions.length === 0) {

            return { needsUpdate: false, hasOldVersions: false };
        } else if (isCurrentInstalled && !needsRedownload && oldVersions.length > 0) {

            return { needsUpdate: false, hasOldVersions: true, oldVersions };
        } else if (isCurrentInstalled && needsRedownload) {

            return {
                needsUpdate: true,
                hasOldVersions: oldVersions.length > 0,
                oldVersions,
                needsRedownload: true,
                redownloadReason: comparisonResult.reason
            };
        } else if (!isCurrentInstalled && oldVersions.length > 0) {

            return { needsUpdate: true, hasOldVersions: true, oldVersions };
        } else {

            return { needsUpdate: true, hasOldVersions: false };
        }
    } catch (error) {
        onLog(`Error checking mod for updates: ${error.message}`);
        return { needsUpdate: true, hasOldVersions: false };
    }
}

function findAssetInRelease(release, fileName) {
    if (!release.assets || !Array.isArray(release.assets)) {
        return null;
    }

    return release.assets.find(asset => asset.name === fileName);
}

function findAssetByBaseName(release, modConfig) {
    if (!release.assets || !Array.isArray(release.assets)) {
        return null;
    }

    const configFileName = modConfig.fileName.toLowerCase();
    let baseName = configFileName.replace(/\.jar$/, '');
    baseName = baseName.replace(/[-_]?v?\d+.*$/, '');

    if (baseName.length < 3) {
        baseName = modConfig.name.toLowerCase().replace(/\.jar$/, '').replace(/[-_]?v?\d+.*$/, '');
    }

    console.log(`[DEBUG] Looking for asset with baseName: "${baseName}" in release ${release.tag_name}`);
    console.log(`[DEBUG] Available assets: ${release.assets.map(a => a.name).join(', ')}`);

    const matchingAssets = release.assets.filter(asset => {
        const assetName = asset.name.toLowerCase();
        if (!assetName.endsWith('.jar')) {
            return false;
        }

        const assetBaseName = assetName.replace(/\.jar$/, '').replace(/[-_]?v?\d+.*$/, '');
        const isMatch = assetBaseName === baseName || assetName.startsWith(baseName + '-') || assetName.startsWith(baseName + '_');

        console.log(`[DEBUG] Asset: ${asset.name}, assetBaseName: "${assetBaseName}", baseName: "${baseName}", match: ${isMatch}`);

        return isMatch;
    });

    if (matchingAssets.length === 0) {
        console.log(`[DEBUG] No matching assets found for baseName: "${baseName}"`);
        return null;
    }

    if (matchingAssets.length === 1) {
        console.log(`[DEBUG] Found single matching asset: ${matchingAssets[0].name}`);
        return matchingAssets[0];
    }

    const exactMatch = matchingAssets.find(asset => asset.name === modConfig.fileName);
    if (exactMatch) {
        console.log(`[DEBUG] Found exact match: ${exactMatch.name}`);
        return exactMatch;
    }

    console.log(`[DEBUG] Using first matching asset: ${matchingAssets[0].name}`);
    return matchingAssets[0];
}

async function downloadMod(modConfig, minecraftVersion, versionModsDir, onLog, onProgress) {
    try {
        onLog(`Checking GitHub mod ${modConfig.name} (${modConfig.fileName})...`);

        const updateCheck = await checkModForUpdates(modConfig, versionModsDir, onLog);

        if (updateCheck.hasOldVersions) {
            const removeResult = await removeOldModVersions(modConfig, versionModsDir, onLog);
            if (removeResult.removed > 0) {
                onLog(`Cleaned up ${removeResult.removed} old version(s) of ${modConfig.name}`);
            }
        }

        if (updateCheck.needsRedownload) {
            const currentFilePath = path.join(versionModsDir, modConfig.fileName);
            try {
                await fs.remove(currentFilePath);
                onLog(`Removed mismatched file: ${modConfig.fileName} (${updateCheck.redownloadReason})`);
            } catch (removeError) {
                onLog(`Failed to remove mismatched file: ${removeError.message}`);
            }
        }

        const finalCheck = await isModAlreadyInstalled(modConfig, versionModsDir);

        if (finalCheck && !updateCheck.needsRedownload) {
            onLog(`${modConfig.name} already up to date, skipping download.`);
            return { success: true, skipped: true };
        }

        onLog(`${modConfig.name} needs to be downloaded from GitHub.`);

        let release;
        if (modConfig.tag) {
            onLog(`Fetching release with tag '${modConfig.tag}' from GitHub...`);
            release = await getReleaseByTag(modConfig.tag);
            onLog(`Found release: ${release.tag_name} (${release.name || 'unnamed'})`);
        } else {
            onLog(`Fetching latest release from GitHub...`);
            release = await getLatestRelease();
            onLog(`Found release: ${release.tag_name} (${release.name || 'unnamed'})`);
        }

        let asset = findAssetInRelease(release, modConfig.fileName);
        let actualFileName = modConfig.fileName;

        if (!asset) {
            onLog(`Exact file ${modConfig.fileName} not found, trying intelligent search...`);
            asset = findAssetByBaseName(release, modConfig);
            if (asset) {
                actualFileName = asset.name;
                onLog(`Found alternative file on GitHub: ${actualFileName}`);
            }
        }

        if (!asset) {
            onLog(`No matching file found for ${modConfig.name} in release ${release.tag_name}`);
            onLog(`Available files: ${release.assets.map(a => a.name).join(', ')}`);
            return { success: false, reason: 'File not found in release' };
        }

        onLog(`Found file: ${asset.name} (${Math.round(asset.size / 1024 / 1024 * 100) / 100}MB)`);
        onLog(`Download URL: ${asset.browser_download_url}`);

        const fileName = actualFileName;

        const filePath = path.resolve(path.join(versionModsDir, fileName));

        onLog(`Downloading ${modConfig.name} from GitHub (${fileName})...`);
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

        await downloadFile(asset.browser_download_url, filePath, (progress, downloaded, total) => {
            if (onProgress) {
                onProgress(modConfig.name, progress, downloaded, total);
            }
        });

        onLog(`Downloaded ${modConfig.name} from GitHub`);

        if (actualFileName !== modConfig.fileName) {
            onLog(`File name changed for ${modConfig.name}, updating configuration...`);
            await updateModConfigFileName(modConfig, actualFileName, onLog);
        }

        return { success: true, fileName, version: release.tag_name };

    } catch (error) {
        onLog(`Failed to download ${modConfig.name} from GitHub: ${error.message}`);
        return { success: false, reason: error.message };
    }
}

async function scanInstalledMods(versionModsDir, modConfigs, onLog) {
    try {
        if (!await fs.pathExists(versionModsDir)) {
            onLog(`Mods directory doesn't exist yet: ${versionModsDir}`);
            return { installedMods: [], missingMods: modConfigs, outdatedMods: [] };
        }

        const files = await fs.readdir(versionModsDir);
        const jarFiles = files.filter(file => file.endsWith('.jar'));

        onLog(`Found ${jarFiles.length} JAR files in mods directory`);
        if (jarFiles.length > 0) {
            onLog(`Existing files: ${jarFiles.join(', ')}`);
        }

        const installedMods = [];
        const missingMods = [];
        const outdatedMods = [];

        for (const modConfig of modConfigs) {
            const updateCheck = await checkModForUpdates(modConfig, versionModsDir, onLog);

            if (!updateCheck.needsUpdate && !updateCheck.hasOldVersions) {

                installedMods.push(modConfig);
                onLog(`Up to date: ${modConfig.name}`);
            } else if (!updateCheck.needsUpdate && updateCheck.hasOldVersions) {

                installedMods.push(modConfig);
                outdatedMods.push({ modConfig, oldVersions: updateCheck.oldVersions });
                onLog(`Current version installed but has old versions: ${modConfig.name}`);
            } else if (updateCheck.needsRedownload) {

                missingMods.push(modConfig);
                if (updateCheck.hasOldVersions) {
                    outdatedMods.push({ modConfig, oldVersions: updateCheck.oldVersions });
                }
                onLog(`Needs redownload: ${modConfig.name} (${updateCheck.redownloadReason})`);
            } else {

                missingMods.push(modConfig);
                if (updateCheck.hasOldVersions) {
                    outdatedMods.push({ modConfig, oldVersions: updateCheck.oldVersions });
                    onLog(`Needs update: ${modConfig.name} (old versions: ${updateCheck.oldVersions.join(', ')})`);
                } else {
                    onLog(`Missing: ${modConfig.name}`);
                }
            }
        }

        return { installedMods, missingMods, outdatedMods };
    } catch (error) {
        onLog(`Error scanning GitHub mods: ${error.message}`);
        return { installedMods: [], missingMods: modConfigs, outdatedMods: [] };
    }
}

async function downloadModsForVersion(minecraftVersion, versionModsDir, onLog, onProgress) {
    onLog(`System info: Platform=${process.platform}, Arch=${process.arch}`);
    onLog(`Target directory: ${versionModsDir}`);

    const modConfigs = MOD_CONFIGS[minecraftVersion];

    if (!modConfigs || modConfigs.length === 0) {
        onLog(`No GitHub mods configured for Minecraft ${minecraftVersion}`);
        return { success: true, downloaded: 0, skipped: 0, failed: 0 };
    }

    onLog(`\nScanning GitHub mods for Minecraft ${minecraftVersion}...`);
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

    const { installedMods, missingMods, outdatedMods } = await scanInstalledMods(versionModsDir, modConfigs, onLog);

    if (installedMods.length > 0) {
        onLog(`\nUp to date (${installedMods.length}): ${installedMods.map(m => m.name).join(', ')}`);
    }

    if (outdatedMods.length > 0) {
        onLog(`\nFound ${outdatedMods.length} mod(s) with old versions that will be cleaned up`);
        for (const outdated of outdatedMods) {
            onLog(`  ${outdated.modConfig.name}: ${outdated.oldVersions.join(', ')}`);
        }
    }

    if (missingMods.length === 0) {
        onLog(`\nAll GitHub mods are up to date! No downloads needed.`);

        let totalCleaned = 0;
        for (const outdated of outdatedMods) {
            if (outdated.oldVersions && outdated.oldVersions.length > 0) {
                const removeResult = await removeOldModVersions(outdated.modConfig, versionModsDir, onLog);
                totalCleaned += removeResult.removed;
            }
        }
        return { success: true, downloaded: 0, skipped: installedMods.length, failed: 0, cleaned: totalCleaned, redownloaded: 0 };
    }

    onLog(`\nNeed to download from GitHub (${missingMods.length}): ${missingMods.map(m => m.name).join(', ')}`);
    onLog(`Starting GitHub downloads...`);

    const modsToDownload = missingMods;

    let downloaded = 0;
    let skipped = installedMods.length;
    let failed = 0;
    let redownloaded = 0;

    for (let i = 0; i < modsToDownload.length; i++) {
        const modConfig = modsToDownload[i];

        if (onProgress) {
            onProgress(`Downloading GitHub mods (${i + 1}/${modsToDownload.length})`, i + 1, modsToDownload.length);
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

                const wasRedownload = outdatedMods.some(outdated =>
                    outdated.modConfig.fileName === modConfig.fileName
                );
                if (wasRedownload) {
                    redownloaded++;
                }
            }
        } else {
            failed++;
        }
    }

    let totalCleaned = 0;
    for (const outdated of outdatedMods) {
        if (outdated.oldVersions && outdated.oldVersions.length > 0) {

            totalCleaned += outdated.oldVersions.length;
        }
    }

    onLog(`\nGitHub mod installation summary for MC ${minecraftVersion}:`);
    onLog(`  Downloaded: ${downloaded}`);
    onLog(`  Skipped: ${skipped}`);
    onLog(`  Failed: ${failed}`);
    if (totalCleaned > 0) {
        onLog(`  Old versions cleaned: ${totalCleaned}`);
    }
    if (redownloaded > 0) {
        onLog(`  Redownloaded (mismatched): ${redownloaded}`);
    }

    return { success: true, downloaded, skipped, failed, cleaned: totalCleaned, redownloaded };
}

function getModsForVersion(minecraftVersion) {
    return MOD_CONFIGS[minecraftVersion] || [];
}

module.exports = {
    downloadModsForVersion,
    getModsForVersion,
    downloadMod,
    getLatestRelease,
    getReleaseByTag,
    getAllReleases,
    scanInstalledMods,
    isModAlreadyInstalled,
    checkModForUpdates,
    findOldModVersions,
    removeOldModVersions,
    compareFileWithGitHub,
    findAssetByBaseName,
    updateModConfigFileName
};
const fs = require('fs-extra');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'mods-config.json');

async function loadConfig() {
    try {
        return await fs.readJson(CONFIG_PATH);
    } catch (error) {
        console.error(`Error loading mods config: ${error.message}`);
        return null;
    }
}

async function saveConfig(config) {
    try {
        await fs.writeJson(CONFIG_PATH, config, { spaces: 2 });
        return true;
    } catch (error) {
        console.error(`Error saving mods config: ${error.message}`);
        return false;
    }
}

async function addMod(minecraftVersion, modConfig) {
    const config = await loadConfig();
    if (!config) return false;

    if (!config.versions[minecraftVersion]) {
        config.versions[minecraftVersion] = { mods: [] };
    }

    const existingMod = config.versions[minecraftVersion].mods.find(
        mod => mod.name === modConfig.name
    );

    if (existingMod) {
        console.log(`Mod ${modConfig.name} already exists for MC ${minecraftVersion}`);
        return false;
    }

    config.versions[minecraftVersion].mods.push(modConfig);
    return await saveConfig(config);
}

async function removeMod(minecraftVersion, modName) {
    const config = await loadConfig();
    if (!config) return false;

    if (!config.versions[minecraftVersion]) {
        console.log(`No mods configured for MC ${minecraftVersion}`);
        return false;
    }

    const modIndex = config.versions[minecraftVersion].mods.findIndex(
        mod => mod.name === modName
    );

    if (modIndex === -1) {
        console.log(`Mod ${modName} not found for MC ${minecraftVersion}`);
        return false;
    }

    config.versions[minecraftVersion].mods.splice(modIndex, 1);
    return await saveConfig(config);
}

async function updateMod(minecraftVersion, modName, updates) {
    const config = await loadConfig();
    if (!config) return false;

    if (!config.versions[minecraftVersion]) {
        console.log(`No mods configured for MC ${minecraftVersion}`);
        return false;
    }

    const mod = config.versions[minecraftVersion].mods.find(
        mod => mod.name === modName
    );

    if (!mod) {
        console.log(`Mod ${modName} not found for MC ${minecraftVersion}`);
        return false;
    }

    Object.assign(mod, updates);

    return await saveConfig(config);
}

async function getModsForVersion(minecraftVersion) {
    const config = await loadConfig();
    if (!config || !config.versions[minecraftVersion]) {
        return [];
    }

    return config.versions[minecraftVersion].mods;
}

async function getMinecraftVersions() {
    const config = await loadConfig();
    if (!config) return [];

    return Object.keys(config.versions);
}

async function backupConfig() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(__dirname, `mods-config-backup-${timestamp}.json`);

        const config = await loadConfig();
        if (!config) return false;

        await fs.writeJson(backupPath, config, { spaces: 2 });
        console.log(`Backup created: ${backupPath}`);
        return backupPath;
    } catch (error) {
        console.error(`Error creating backup: ${error.message}`);
        return false;
    }
}

async function restoreConfig(backupPath) {
    try {
        const backupConfig = await fs.readJson(backupPath);
        return await saveConfig(backupConfig);
    } catch (error) {
        console.error(`Error restoring backup: ${error.message}`);
        return false;
    }
}

function validateModConfig(modConfig) {
    const required = ['name', 'source'];
    const missing = required.filter(field => !modConfig[field]);

    if (missing.length > 0) {
        return { valid: false, errors: [`Missing required fields: ${missing.join(', ')}`] };
    }

    const errors = [];

    switch (modConfig.source) {
        case 'modrinth':
        case 'curseforge':
            if (!modConfig.id) {
                errors.push(`${modConfig.source} source requires 'id' field`);
            }
            break;
        case 'github':
            if (!modConfig.owner || !modConfig.repo || !modConfig.filename) {
                errors.push('GitHub source requires owner, repo, and filename fields');
            }
            break;
        case 'direct':
            if (!modConfig.url || !modConfig.filename) {
                errors.push('Direct source requires url and filename fields');
            }
            break;
        default:
            errors.push(`Unknown source: ${modConfig.source}`);
    }

    if (!modConfig.version) {
        modConfig.version = 'latest';
    }

    if (modConfig.required === undefined) {
        modConfig.required = false;
    }

    return { valid: errors.length === 0, errors };
}

async function exportConfig(exportPath) {
    try {
        const config = await loadConfig();
        if (!config) return false;

        await fs.writeJson(exportPath, config, { spaces: 2 });
        console.log(`Configuration exported to: ${exportPath}`);
        return true;
    } catch (error) {
        console.error(`Error exporting config: ${error.message}`);
        return false;
    }
}

async function importConfig(importPath) {
    try {
        const importedConfig = await fs.readJson(importPath);

        if (!importedConfig.versions || typeof importedConfig.versions !== 'object') {
            throw new Error('Invalid config structure: missing or invalid versions object');
        }

        return await saveConfig(importedConfig);
    } catch (error) {
        console.error(`Error importing config: ${error.message}`);
        return false;
    }
}

module.exports = {
    loadConfig,
    saveConfig,
    addMod,
    removeMod,
    updateMod,
    getModsForVersion,
    getMinecraftVersions,
    backupConfig,
    restoreConfig,
    validateModConfig,
    exportConfig,
    importConfig
};
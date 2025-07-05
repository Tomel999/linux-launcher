const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const javaConfig = require('./java-config.json');

async function isExecutable(filePath) {
    try {
        await fs.access(filePath, fs.constants.F_OK | fs.constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

async function expandWildcardPaths(pathPattern) {
    if (process.platform === 'win32' || !pathPattern.includes('*')) {
        return [pathPattern];
    }

    try {

        if (pathPattern.includes('/home/*')) {
            const homePattern = pathPattern.replace('/home/*', '');
            const homeDir = '/home';

            if (await fs.pathExists(homeDir)) {
                const users = await fs.readdir(homeDir);
                const expandedPaths = [];

                for (const user of users) {
                    const userPath = path.join(homeDir, user, homePattern);
                    if (userPath.includes('*')) {

                        const parts = userPath.split('*');
                        if (parts.length === 2) {
                            const basePath = parts[0];
                            const suffix = parts[1];

                            try {
                                const baseDir = path.dirname(basePath);
                                if (await fs.pathExists(baseDir)) {
                                    const items = await fs.readdir(baseDir);
                                    const prefix = path.basename(basePath);

                                    for (const item of items) {
                                        if (item.startsWith(prefix)) {
                                            const fullPath = path.join(baseDir, item, suffix);
                                            expandedPaths.push(fullPath);
                                        }
                                    }
                                }
                            } catch (error) {

                            }
                        }
                    } else {
                        expandedPaths.push(userPath);
                    }
                }

                return expandedPaths;
            }
        }

        return [pathPattern];
    } catch (error) {
        console.warn(`Error expanding wildcard path ${pathPattern}: ${error.message}`);
        return [pathPattern];
    }
}

function checkJavaVersion(javaPath) {
    return new Promise((resolve) => {
        const process = spawn(javaPath, ['-version'], { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {

                const versionMatch = stderr.match(/version "(\d+)\.?(\d*)\.?(\d*)/);
                if (versionMatch) {
                    const majorVersion = parseInt(versionMatch[1]);
                    // Java 9+ używa nowego schematu wersjonowania
                    const version = majorVersion >= 9 ? majorVersion : parseInt(versionMatch[2]);
                    resolve({ success: true, version, fullOutput: stderr });
                } else {
                    resolve({ success: false, error: 'Nie można sparsować wersji Java' });
                }
            } else {
                resolve({ success: false, error: `Java zwróciła kod błędu: ${code}` });
            }
        });

        process.on('error', (err) => {
            resolve({ success: false, error: err.message });
        });
    });
}

/**
 * Znajduje odpowiednią wersję Java dla danej wersji Minecraft
 */
async function findJavaForVersion(mcVersion) {
    console.log(`Szukanie Java dla Minecraft ${mcVersion}...`);

    const versionConfig = javaConfig.javaVersions[mcVersion];
    if (!versionConfig) {
        console.log(`Brak konfiguracji Java dla wersji ${mcVersion}, używam domyślnej`);
        return { path: 'java', version: null };
    }

    const requiredVersion = versionConfig.version;
    console.log(`Wymagana wersja Java: ${requiredVersion}`);

    // Jeśli jest ustawiona konkretna ścieżka, użyj jej
    if (versionConfig.path) {
        if (await isExecutable(versionConfig.path)) {
            const versionCheck = await checkJavaVersion(versionConfig.path);
            if (versionCheck.success && versionCheck.version === requiredVersion) {
                console.log(`Używam skonfigurowanej ścieżki Java ${requiredVersion}: ${versionConfig.path}`);
                return { path: versionConfig.path, version: versionCheck.version };
            } else {
                console.warn(`Skonfigurowana ścieżka Java ma nieprawidłową wersję: ${versionCheck.error || `oczekiwano ${requiredVersion}, znaleziono ${versionCheck.version}`}`);
            }
        } else {
            console.warn(`Skonfigurowana ścieżka Java nie istnieje lub nie jest wykonywalna: ${versionConfig.path}`);
        }
    }

    // Sprawdź domyślne ścieżki dla danej platformy
    const platform = process.platform === 'win32' ? 'windows' :
                    process.platform === 'darwin' ? 'darwin' : 'linux';

    const defaultPaths = javaConfig.defaultJavaPaths[platform]?.[requiredVersion] || [];

    for (const pathPattern of defaultPaths) {
        console.log(`Sprawdzanie wzorca ścieżki: ${pathPattern}`);

        // Rozwiń ścieżki z wildcardami
        const expandedPaths = await expandWildcardPaths(pathPattern);

        for (const javaPath of expandedPaths) {
            console.log(`  Sprawdzanie ścieżki: ${javaPath}`);
            if (await isExecutable(javaPath)) {
                const versionCheck = await checkJavaVersion(javaPath);
                if (versionCheck.success && versionCheck.version === requiredVersion) {
                    console.log(`Znaleziono Java ${requiredVersion}: ${javaPath}`);
                    return { path: javaPath, version: versionCheck.version };
                } else {
                    console.log(`  Ścieżka ${javaPath} ma nieprawidłową wersję: ${versionCheck.error || `oczekiwano ${requiredVersion}, znaleziono ${versionCheck.version}`}`);
                }
            }
        }
    }

    // Sprawdź systemową Java
    console.log('Sprawdzanie systemowej Java...');
    const systemJavaPath = process.platform === 'win32' ? 'javaw' : 'java';
    const systemVersionCheck = await checkJavaVersion(systemJavaPath);

    if (systemVersionCheck.success) {
        if (systemVersionCheck.version === requiredVersion) {
            console.log(`Systemowa Java ma odpowiednią wersję ${requiredVersion}`);
            return { path: systemJavaPath, version: systemVersionCheck.version };
        } else {
            console.warn(`Systemowa Java ma nieprawidłową wersję: oczekiwano ${requiredVersion}, znaleziono ${systemVersionCheck.version}`);
        }
    } else {
        console.warn(`Nie można sprawdzić systemowej Java: ${systemVersionCheck.error}`);
    }

    // Jeśli nic nie znaleziono, zwróć domyślną ścieżkę z ostrzeżeniem
    console.warn(`Nie znaleziono Java ${requiredVersion} dla Minecraft ${mcVersion}. Używam domyślnej ścieżki.`);
    return {
        path: systemJavaPath,
        version: systemVersionCheck.success ? systemVersionCheck.version : null,
        warning: `Nie znaleziono Java ${requiredVersion}. Gra może nie działać poprawnie.`
    };
}

/**
 * Aktualizuje konfigurację Java dla danej wersji MC
 */
async function updateJavaConfig(mcVersion, javaPath) {
    try {
        const configPath = path.join(__dirname, 'java-config.json');
        const config = await fs.readJson(configPath);

        if (!config.javaVersions[mcVersion]) {
            config.javaVersions[mcVersion] = { version: 17, path: null };
        }

        config.javaVersions[mcVersion].path = javaPath;

        await fs.writeJson(configPath, config, { spaces: 2 });
        console.log(`Zaktualizowano konfigurację Java dla ${mcVersion}: ${javaPath}`);
        return true;
    } catch (error) {
        console.error(`Błąd podczas aktualizacji konfiguracji Java: ${error.message}`);
        return false;
    }
}

module.exports = {
    findJavaForVersion,
    checkJavaVersion,
    updateJavaConfig,
    isExecutable
};
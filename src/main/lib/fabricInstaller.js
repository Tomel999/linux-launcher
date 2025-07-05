const https = require('https');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { APP_ROOT, MINECRAFT_DIR } = require('./constants');
const javaManager = require('./javaManager');

const VERSIONS_TO_INSTALL = [
    '1.19.2',
    '1.20.1',
    '1.20.6',
    '1.21.1',
    '1.21.3',
    '1.21.4',
    '1.21.5',
    '1.21.6',
    '1.21.7'
];

const FABRIC_INSTALLER_URL = 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.0.1/fabric-installer-1.0.1.jar';
const INSTALLER_PATH = path.join(APP_ROOT, 'fabric-installer.jar');

async function installFabric(onLog) {
    try {
        onLog('Pobieranie instalatora Fabric...');
        await downloadInstaller();
        onLog('Pobrano instalator.');

        for (const version of VERSIONS_TO_INSTALL) {
            onLog(`\n--- Instalowanie Fabric dla MC ${version} ---`);

            const javaInfo = await javaManager.findJavaForVersion(version);
            onLog(`Używam Java: ${javaInfo.path} (wersja: ${javaInfo.version || 'nieznana'})`);
            if (javaInfo.warning) {
                onLog(`OSTRZEŻENIE: ${javaInfo.warning}`);
            }

            let javaCommand = javaInfo.path;
            if (process.platform === 'win32' && javaCommand.endsWith('javaw.exe')) {
                javaCommand = javaCommand.replace('javaw.exe', 'java.exe');
            } else if (javaCommand === 'javaw') {
                javaCommand = 'java';
            }

            const args = ['-jar', INSTALLER_PATH, 'client', '-dir', MINECRAFT_DIR, '-mcversion', version, '-noprofile'];

            await new Promise((resolve) => {
                const process = spawn(javaCommand, args);
                process.stdout.on('data', (data) => onLog(data.toString().trim()));
                process.stderr.on('data', (data) => onLog(`[BŁĄD] ${data.toString().trim()}`));
                process.on('close', (code) => {
                    onLog(code !== 0 ? `Proces instalacji dla ${version} zakończył się z kodem ${code}. Kontynuowanie...` : `--- Zakończono dla MC ${version} ---`);
                    resolve();
                });
                process.on('error', (err) => {
                    onLog(`[KRYTYCZNY BŁĄD] Nie można uruchomić Javy. Czy jest zainstalowana i w PATH? ${err.message}`);
                    resolve();
                });
            });
        }
        onLog('\nProces instalacji Fabric zakończony pomyślnie.');
        return { success: true };
    } catch (error) {
        const errorMessage = `Wystąpił krytyczny błąd: ${error.message}`;
        onLog(errorMessage);
        console.error(errorMessage, error);
        return { success: false, message: errorMessage };
    }
}

function downloadInstaller() {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(INSTALLER_PATH);
        https.get(FABRIC_INSTALLER_URL, (response) => {
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', (err) => {
            fs.unlink(INSTALLER_PATH, () => reject(err));
        });
    });
}

module.exports = { installFabric };
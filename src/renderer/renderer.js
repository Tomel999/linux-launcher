document.addEventListener('DOMContentLoaded', () => {
    const state = {
        versions: [],
        ram: 4,
        isLoading: false,
        selectedResolution: '1920x1080',
    };

    const versionDropdown = document.getElementById('version-dropdown');
    const selectedVersionSpan = document.getElementById('selected-version');
    const versionList = document.getElementById('version-list');

    const resolutionDropdown = document.getElementById('resolution-dropdown');
    const selectedResolutionSpan = document.getElementById('selected-resolution');
    const resolutionList = document.getElementById('resolution-list');

    const ramSlider = document.getElementById('ram-slider');
    const sliderValue = document.getElementById('slider-value');
    const sliderContainer = ramSlider.parentElement;
    const launchBtn = document.getElementById('launch-btn');
    const reinstallFabricBtn = document.getElementById('reinstall-fabric-btn');
    const downloadModsBtn = document.getElementById('download-mods-btn');
    const statusDiv = document.getElementById('status');
    const spinner = document.getElementById('spinner');

    const ui = {
        setLoading: (isLoading, message = '') => {
            state.isLoading = isLoading;

            [launchBtn, reinstallFabricBtn, downloadModsBtn, ramSlider].forEach(btn => btn.disabled = isLoading);
            [versionDropdown, resolutionDropdown].forEach(dropdown => {
                dropdown.style.pointerEvents = isLoading ? 'none' : 'auto';
                dropdown.style.opacity = isLoading ? '0.6' : '1';
            });

            spinner.classList.toggle('hidden', !isLoading);
            if (message) ui.updateStatus(message);

            if (isLoading) {
                closeAllDropdowns();
            }
        },
        updateStatus: (message) => {
            statusDiv.textContent = message;
        },
        showLog: (show) => {

        },
        appendToLog: (text) => {

        },
        scheduleLogHide: () => {

        },
        renderVersions: () => {
            versionList.innerHTML = '';
            if (state.versions.length === 0) {
                selectedVersionSpan.textContent = 'No versions available';
                return;
            }

            if (state.currentVersionIndex >= 0 && state.currentVersionIndex < state.versions.length) {
                const selectedVersion = state.versions[state.currentVersionIndex];
                const versionParts = selectedVersion.split('-');
                const displayVersion = versionParts.length > 1 ? versionParts[versionParts.length - 1] : selectedVersion;
                selectedVersionSpan.textContent = displayVersion;
                selectedVersionSpan.title = displayVersion;
            }

            state.versions.forEach((version, index) => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.setAttribute('role', 'option');
                item.setAttribute('tabindex', '0');

                const versionParts = version.split('-');
                const displayVersion = versionParts.length > 1 ? versionParts[versionParts.length - 1] : version;
                item.textContent = displayVersion;
                item.title = displayVersion;
                item.dataset.index = index;

                if (index === state.currentVersionIndex) {
                    item.classList.add('selected');
                    item.setAttribute('aria-selected', 'true');
                } else {
                    item.setAttribute('aria-selected', 'false');
                }

                item.addEventListener('click', () => {
                    selectVersion(index);
                    closeAllDropdowns();
                });

                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectVersion(index);
                        closeAllDropdowns();
                    }
                });

                versionList.appendChild(item);
            });
        }
    };

    function selectVersion(index) {
        state.currentVersionIndex = index;
        ui.renderVersions();
    }

    function handleRamChange(event) {
        state.ram = parseInt(event.target.value);
        const progress = ((state.ram - 2) / (16 - 2)) * 100;
        ramSlider.style.setProperty('--slider-progress', `${progress}%`);
        sliderValue.style.setProperty('--slider-progress', `${progress}%`);
        sliderValue.textContent = `${state.ram}GB`;
    }

    async function populateVersions() {
        try {
            ui.setLoading(true, 'Loading versions...');
            const versions = await window.electronAPI.getVersions();
            state.versions = versions;
            state.currentVersionIndex = versions.length > 0 ? 0 : -1;
            ui.renderVersions();
            ui.updateStatus('Ready to launch');
        } catch (error) {
            console.error('Error loading versions:', error);
            ui.updateStatus('Error loading versions');
        } finally {
            ui.setLoading(false);
        }
    }

    function toggleDropdown(type) {
        if (state.isLoading) return;

        const dropdowns = {
            version: { button: versionDropdown, list: versionList },
            resolution: { button: resolutionDropdown, list: resolutionList }
        };

        const currentDropdown = dropdowns[type];
        const isCurrentOpen = currentDropdown.list.classList.contains('open');
        const currentCard = currentDropdown.button.closest('.setting-card');

        closeAllDropdowns();

        if (!isCurrentOpen) {
            currentDropdown.button.classList.add('open');
            currentDropdown.button.setAttribute('aria-expanded', 'true');
            currentDropdown.list.classList.add('open');
            currentCard.classList.add('dropdown-active');
        }
    }

    function closeAllDropdowns() {
        document.querySelectorAll('.setting-card.dropdown-active').forEach(card => {
            card.classList.remove('dropdown-active');
        });

        document.querySelectorAll('.dropdown-button.open').forEach(button => {
            button.classList.remove('open');
            button.setAttribute('aria-expanded', 'false');
        });

        document.querySelectorAll('.dropdown-list.open').forEach(list => {
            list.classList.remove('open');
        });
    }

    async function handleLaunch() {
        if (state.currentVersionIndex < 0 || state.currentVersionIndex >= state.versions.length) {
            alert('Please select a version first.');
            return;
        }

        const selectedVersion = state.versions[state.currentVersionIndex];
        const launchOptions = {
            version: selectedVersion,
            ram: state.ram,
            playerName: `Player${Math.floor(Math.random() * 1000)}`,
            window: state.selectedResolution === 'fullscreen' ?
                { fullscreen: true } :
                parseResolution(state.selectedResolution)
        };

        ui.setLoading(true, `Launching ${selectedVersion}...`);
        ui.showLog(true);
        ui.appendToLog(`Starting ${selectedVersion}...\\n`);

        try {
            const result = await window.electronAPI.launchGame(launchOptions);
            if (result.success) {
                ui.appendToLog(`\nGame launched successfully!\n`);
                ui.updateStatus(`Launched ${result.version} successfully`);
                ui.scheduleLogHide();
            } else {
                ui.appendToLog(`\nLaunch failed: ${result.message}\n`);
                ui.updateStatus(`Launch Error: ${result.message}`);
                ui.scheduleLogHide();
            }
        } catch (error) {
            ui.appendToLog(`\nLaunch error: ${error.message}\n`);
            ui.updateStatus(`Launch Error: ${error.message}`);
            ui.scheduleLogHide();
        } finally {
            ui.setLoading(false);
        }
    }

    function parseResolution(resolution) {
        if (resolution === 'fullscreen') {
            return { fullscreen: true };
        }
        const [width, height] = resolution.split('x').map(Number);
        return { width, height };
    }

    async function handleReinstallFabric() {
        if (!confirm('This will reinstall standard Fabric versions. Continue?')) return;
        ui.setLoading(true, 'Reinstalling Fabric...');
        ui.showLog(true);
        const result = await window.electronAPI.reinstallFabric();
        if (result.success) {
            ui.appendToLog('\n\nSuccess! Refreshing version list...');
            await populateVersions();
        } else {
            ui.appendToLog(`\n\nError: ${result.message}`);
        }
        ui.setLoading(false);
        ui.scheduleLogHide();
    }

    async function handleDownloadMods() {
        if (state.currentVersionIndex < 0 || state.currentVersionIndex >= state.versions.length) {
            alert('Please select a version first.');
            return;
        }

        const selectedVersion = state.versions[state.currentVersionIndex];
        ui.setLoading(true, `Downloading mods for ${selectedVersion}...`);
        ui.showLog(true);

        try {

            ui.appendToLog(`Trying to download mods from Modrinth for ${selectedVersion}...\\n`);
            const modrinthResult = await window.electronAPI.downloadMods(selectedVersion);

            let totalDownloaded = modrinthResult.downloaded || 0;
            let totalSkipped = modrinthResult.skipped || 0;
            let totalFailed = modrinthResult.failed || 0;

            if (modrinthResult.success) {
                ui.appendToLog(`Modrinth: Downloaded ${modrinthResult.downloaded}, Skipped ${modrinthResult.skipped}, Failed ${modrinthResult.failed}\\n`);
            } else {
                ui.appendToLog(`Modrinth failed: ${modrinthResult.message}\\n`);
            }

            ui.appendToLog(`\\nTrying to download mods from CurseForge for ${selectedVersion}...\\n`);
            const curseforgeResult = await window.electronAPI.downloadCurseForgeMods(selectedVersion);

            totalDownloaded += curseforgeResult.downloaded || 0;
            totalSkipped += curseforgeResult.skipped || 0;
            totalFailed += curseforgeResult.failed || 0;

            if (curseforgeResult.success) {
                ui.appendToLog(`CurseForge: Downloaded ${curseforgeResult.downloaded}, Skipped ${curseforgeResult.skipped}, Failed ${curseforgeResult.failed}\\n`);
            } else {
                ui.appendToLog(`CurseForge failed: ${curseforgeResult.message}\\n`);
            }

            ui.appendToLog(`\\nTrying to download mods from GitHub for ${selectedVersion}...\\n`);
            const githubResult = await window.electronAPI.downloadGitHubMods(selectedVersion);

            totalDownloaded += githubResult.downloaded || 0;
            totalSkipped += githubResult.skipped || 0;
            totalFailed += githubResult.failed || 0;

            if (githubResult.success) {
                ui.appendToLog(`GitHub: Downloaded ${githubResult.downloaded}, Skipped ${githubResult.skipped}, Failed ${githubResult.failed}\\n`);
            } else {
                ui.appendToLog(`GitHub failed: ${githubResult.message}\\n`);
            }

            ui.appendToLog(`\nTotal: Downloaded ${totalDownloaded}, Skipped ${totalSkipped}, Failed ${totalFailed}\n`);
            ui.updateStatus(`Mods downloaded for ${selectedVersion} - Total: ${totalDownloaded + totalSkipped}, New: ${totalDownloaded}`);

        } catch (error) {
            ui.appendToLog(`\nMod download error: ${error.message}\n`);
            ui.updateStatus(`Mod download error: ${error.message}`);
        } finally {
            ui.setLoading(false);
            ui.scheduleLogHide();
        }
    }

    const initialProgress = ((state.ram - 2) / (16 - 2)) * 100;
    ramSlider.style.setProperty('--slider-progress', `${initialProgress}%`);
    sliderValue.style.setProperty('--slider-progress', `${initialProgress}%`);
    sliderValue.textContent = `${state.ram}GB`;

    versionDropdown.addEventListener('click', () => toggleDropdown('version'));
    resolutionDropdown.addEventListener('click', () => toggleDropdown('resolution'));

    [versionDropdown, resolutionDropdown].forEach((dropdown, index) => {
        const types = ['version', 'resolution'];
        dropdown.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDropdown(types[index]);
            } else if (e.key === 'Escape') {
                closeAllDropdowns();
            }
        });
    });

    resolutionList.addEventListener('click', (event) => {
        if (event.target.classList.contains('dropdown-item')) {
            const resolution = event.target.dataset.resolution;
            state.selectedResolution = resolution;
            selectedResolutionSpan.textContent = event.target.textContent;
            closeAllDropdowns();
        }
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.dropdown-container')) {
            closeAllDropdowns();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAllDropdowns();
        }
    });

    ramSlider.addEventListener('input', handleRamChange);

    ['mousedown', 'touchstart', 'focus'].forEach(evt => {
        ramSlider.addEventListener(evt, () => sliderContainer.classList.add('interacting'), { passive: true });
    });
    ['mouseup', 'touchend', 'blur'].forEach(evt => {
        ramSlider.addEventListener(evt, () => sliderContainer.classList.remove('interacting'));
    });

    launchBtn.addEventListener('click', handleLaunch);
    reinstallFabricBtn.addEventListener('click', handleReinstallFabric);
    downloadModsBtn.addEventListener('click', handleDownloadMods);

    document.getElementById('minimize-btn').addEventListener('click', () => window.electronAPI.minimizeWindow());
    document.getElementById('maximize-btn').addEventListener('click', () => window.electronAPI.toggleMaximizeWindow());
    document.getElementById('close-btn').addEventListener('click', () => window.electronAPI.closeWindow());

    window.electronAPI.onGameClosed(() => {
        ui.updateStatus('Game closed.');
        ui.setLoading(false);
    });

    window.electronAPI.onGameProgress((data) => ui.updateStatus(`Download: ${data.type} (${data.task}/${data.total})`));
    window.electronAPI.onGameDownloadStatus((data) => ui.updateStatus(`Files: ${data.type} (${data.current}/${data.total})`));
    window.electronAPI.onFabricInstallLog((log) => ui.appendToLog(log + '\\n'));

    window.electronAPI.onAutoFabricInstallStatus((status) => {
        switch (status.status) {
            case 'started':
                ui.setLoading(true, 'Auto-installing Fabric...');
                selectedVersionSpan.textContent = 'Auto-installing Fabric...';
                break;

            case 'progress':
                ui.setLoading(true, 'Installing Fabric...');
                break;

            case 'scanning':
                ui.setLoading(true, 'Scanning installed versions...');
                break;

            case 'success':
                ui.updateStatus(`Auto-installed ${status.versions ? status.versions.length : 0} Fabric versions!`);

                setTimeout(() => {
                    populateVersions();
                    ui.setLoading(false);
                }, 1000);
                break;

            case 'warning':
                ui.setLoading(false);
                ui.updateStatus('Installation completed with warnings');
                break;

            case 'error':
                ui.setLoading(false);
                ui.updateStatus(`Installation error: ${status.error || 'Unknown error'}`);
                selectedVersionSpan.textContent = 'Installation failed';
                break;

            case 'critical-error':
                ui.setLoading(false);
                ui.updateStatus(`Critical error: ${status.error || 'Unknown error'}`);
                selectedVersionSpan.textContent = 'Critical error';
                break;

            default:
                break;
        }
    });

    populateVersions();
});
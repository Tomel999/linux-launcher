#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        print_error "Nieobsługiwany system operacyjny: $OSTYPE"
        exit 1
    fi
    print_info "Wykryto system: $OS"
}

find_launcher_path() {
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    LAUNCHER_PATH="$SCRIPT_DIR"

    if [[ ! -f "$LAUNCHER_PATH/package.json" ]] || [[ ! -d "$LAUNCHER_PATH/src" ]]; then
        print_error "Nie znaleziono plików launchera w: $LAUNCHER_PATH"
        print_error "Upewnij się, że uruchamiasz skrypt z głównego folderu launchera"
        exit 1
    fi

    print_info "Ścieżka launchera: $LAUNCHER_PATH"
}

check_dependencies() {
    print_info "Sprawdzanie zależności..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js nie jest zainstalowany"
        print_info "Zainstaluj Node.js z: https://nodejs.org/"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm nie jest zainstalowany"
        exit 1
    fi

    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_success "Node.js: $NODE_VERSION"
    print_success "npm: $NPM_VERSION"
}

create_launcher_script() {
    print_info "Tworzenie skryptu wykonywalnego..."

    if [[ "$OS" == "windows" ]]; then

        SCRIPT_PATH="$LAUNCHER_PATH/ogulniega.bat"
        cat > "$SCRIPT_PATH" << 'EOF'
@echo off
setlocal

REM Ogulniega Launcher CLI Script
REM Automatycznie wygenerowany przez install-cli.sh

set "LAUNCHER_DIR=%~dp0"
cd /d "%LAUNCHER_DIR%"

REM Sprawdź czy Node.js jest dostępny
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js nie jest zainstalowany lub nie jest w PATH
    echo Zainstaluj Node.js z: https://nodejs.org/
    pause
    exit /b 1
)

REM Sprawdź czy Electron jest zainstalowany
if not exist "node_modules" (
    echo [INFO] Instalowanie zależności...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Błąd podczas instalacji zależności
        pause
        exit /b 1
    )
)

REM Uruchom launcher
echo [INFO] Uruchamianie Ogulniega Launcher...
npm start
EOF
        chmod +x "$SCRIPT_PATH" 2>/dev/null || true
        print_success "Utworzono: $SCRIPT_PATH"
    else

        SCRIPT_PATH="$LAUNCHER_PATH/ogulniega"
        cat > "$SCRIPT_PATH" << 'EOF'
#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCHER_DIR="$SCRIPT_DIR"

cd "$LAUNCHER_DIR"

if ! command -v node &> /dev/null; then
    print_error "Node.js nie jest zainstalowany lub nie jest w PATH"
    print_info "Zainstaluj Node.js z: https://nodejs.org/"
    exit 1
fi

if [[ ! -d "node_modules" ]]; then
    print_info "Instalowanie zależności..."
    npm install
    if [[ $? -ne 0 ]]; then
        print_error "Błąd podczas instalacji zależności"
        exit 1
    fi
fi

print_info "Uruchamianie Ogulniega Launcher..."
npm start
EOF
        chmod +x "$SCRIPT_PATH"
        print_success "Utworzono: $SCRIPT_PATH"
    fi
}

install_to_path_unix() {
    print_info "Dodawanie do PATH..."

    SHELL_CONFIGS=()
    [[ -f "$HOME/.bashrc" ]] && SHELL_CONFIGS+=("$HOME/.bashrc")
    [[ -f "$HOME/.zshrc" ]] && SHELL_CONFIGS+=("$HOME/.zshrc")
    [[ -f "$HOME/.profile" ]] && SHELL_CONFIGS+=("$HOME/.profile")

    if [[ ${
        print_warning "Nie znaleziono plików konfiguracyjnych shell'a"
        print_info "Ręcznie dodaj do PATH: export PATH=\"$LAUNCHER_PATH:\$PATH\""
        return
    fi

    for config in "${SHELL_CONFIGS[@]}"; do

        if grep -q "
            print_info "Ścieżka już istnieje w: $config"
            continue
        fi

        print_info "Dodawanie do: $config"
        echo "" >> "$config"
        echo "
        echo "export PATH=\"$LAUNCHER_PATH:\$PATH\"" >> "$config"
        print_success "Dodano do: $config"
    done

    LOCAL_BIN="/usr/local/bin"
    if [[ -w "$LOCAL_BIN" ]] || sudo -n true 2>/dev/null; then
        print_info "Tworzenie symlinku w $LOCAL_BIN..."
        if [[ -w "$LOCAL_BIN" ]]; then
            ln -sf "$LAUNCHER_PATH/ogulniega" "$LOCAL_BIN/ogulniega"
        else
            sudo ln -sf "$LAUNCHER_PATH/ogulniega" "$LOCAL_BIN/ogulniega"
        fi
        print_success "Utworzono symlink: $LOCAL_BIN/ogulniega"
    else
        print_warning "Brak uprawnień do $LOCAL_BIN"
        print_info "Uruchom ponownie z sudo dla globalnej instalacji"
    fi
}

install_to_path_windows() {
    print_info "Dodawanie do PATH (Windows)..."

    if echo "$PATH" | grep -q "$LAUNCHER_PATH"; then
        print_info "Ścieżka już jest w PATH"
        return
    fi

    print_warning "Na Windows musisz ręcznie dodać do PATH:"
    print_info "1. Otwórz 'Zmienne środowiskowe' (Environment Variables)"
    print_info "2. Dodaj do PATH: $LAUNCHER_PATH"
    print_info "3. Uruchom ponownie terminal"
    print_info ""
    print_info "Alternatywnie możesz uruchomić launcher przez:"
    print_info "  $LAUNCHER_PATH/ogulniega.bat"
}

test_installation() {
    print_info "Testowanie instalacji..."

    if [[ "$OS" == "windows" ]]; then
        SCRIPT_FILE="$LAUNCHER_PATH/ogulniega.bat"
    else
        SCRIPT_FILE="$LAUNCHER_PATH/ogulniega"
    fi

    if [[ ! -f "$SCRIPT_FILE" ]]; then
        print_error "Skrypt nie został utworzony: $SCRIPT_FILE"
        return 1
    fi

    if [[ "$OS" != "windows" ]] && [[ ! -x "$SCRIPT_FILE" ]]; then
        print_error "Skrypt nie jest wykonywalny: $SCRIPT_FILE"
        return 1
    fi

    print_success "Skrypt został utworzony poprawnie"

    if command -v ogulniega &> /dev/null; then
        print_success "Komenda 'ogulniega' jest dostępna w PATH"
    else
        print_warning "Komenda 'ogulniega' nie jest jeszcze dostępna w PATH"
        print_info "Uruchom ponownie terminal lub wykonaj: source ~/.bashrc"
    fi
}

main() {
    echo "============================================"
    echo "  Ogulniega Launcher CLI Installer"
    echo "============================================"
    echo ""

    detect_os
    find_launcher_path
    check_dependencies

    echo ""
    print_info "Rozpoczynanie instalacji..."

    create_launcher_script

    if [[ "$OS" == "windows" ]]; then
        install_to_path_windows
    else
        install_to_path_unix
    fi

    echo ""
    test_installation

    echo ""
    echo "============================================"
    print_success "Instalacja zakończona!"
    echo "============================================"
    echo ""
    print_info "Użycie:"
    if [[ "$OS" == "windows" ]]; then
        print_info "  ogulniega.bat
    else
        print_info "  ogulniega
    fi
    echo ""

    if [[ "$OS" != "windows" ]] && ! command -v ogulniega &> /dev/null; then
        print_warning "Jeśli komenda nie działa, uruchom:"
        print_info "  source ~/.bashrc"
        print_info "
    fi
}

main "$@"
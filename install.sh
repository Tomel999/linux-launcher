echo "Ogulniega Minecraft Launcher - Instalator"
echo "================================"

echo "Instaluję Node.js i npm"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Instaluję Java..."
if ! command -v java &> /dev/null; then
    sudo apt update
    sudo apt install -y openjdk-17-jre
    sudo apt install openjdk-21-jdk
fi

echo "Instaluję pakiety npm..."
npm install

echo "Instalacja zakończona!"
echo "Uruchom aplikację: npm start"

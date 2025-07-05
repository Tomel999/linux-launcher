const { app } = require('electron');
const path = require('path');

const APP_ROOT = path.resolve(path.join(__dirname, '..', '..', '..'));

const MINECRAFT_DIR = path.resolve(path.join(APP_ROOT, 'minecraft'));

console.log(`APP_ROOT: ${APP_ROOT}`);
console.log(`MINECRAFT_DIR: ${MINECRAFT_DIR}`);

module.exports = {
    APP_ROOT,
    MINECRAFT_DIR,
};
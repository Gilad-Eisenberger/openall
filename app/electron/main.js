import { app, BrowserWindow, Menu, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";

import { bootstrap } from '../../core/dist/in-proc.js';
import { ChatGateway } from '../../core/dist/chat/chat.gateway.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Menu.setApplicationMenu(null);

let mainWindow = null;

function createWindow() {
    const win = new BrowserWindow({
        title: 'open/all',
        width: 1000,
        height: 700,
        // icon: path.join(__dirname, '../frontend/dist/favicon.svg'),
        webPreferences: {
            preload: path.join(__dirname, "preload.mjs"),
        },
    });

    mainWindow = win;

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        win.loadFile("../frontend/dist/index.html");
    }
}

let client = {
    send: (s) => { console.log(s); mainWindow.webContents.send('ws:event', s); },
};

async function init() {
    const app2 = await bootstrap();

    const chatGateway = await app2.resolve(ChatGateway);

    ipcMain.handle('chat-service:chat', async (_event, payload) => {
        return await chatGateway.handleEvent(payload);
    });

    ipcMain.handle('chat-service:config', async (_event, payload) => {
        return await chatGateway.handleConfig(payload, client);
    });

    ipcMain.handle('chat-service:connect', async (_event, payload) => {
        console.log(chatGateway);
        return await chatGateway.handleConnection(client);
    });

    ipcMain.handle('chat-service:doAction', async (_event, payload) => {
        return await chatGateway.handleAction(payload);
    });

    app.whenReady().then(createWindow);
}

init();


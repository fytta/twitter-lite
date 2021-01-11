const { app, BrowserWindow } = require('electron');
let win = null;
app.on('ready', function () {
    win = new BrowserWindow({
        width: 1920, height: 1080,
        webPreferences: { nodeIntegration: true, enableRemoteModule: true }
    });
    win.loadURL(`file://${__dirname}/www/index.html`);
});

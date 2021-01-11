const { app, BrowserWindow } = require('electron');
let win = null;
app.on('ready', function () {
    win = new BrowserWindow({
        width: 1024, height: 800,
        webPreferences: { nodeIntegration: true, enableRemoteModule: true }
    });
    win.loadURL(`file://${__dirname}/www/index.html`);
});

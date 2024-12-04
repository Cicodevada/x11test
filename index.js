const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const { homedir } = require('os');
const { stdout } = require('process');
const { createCanvas } = require('canvas');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 300,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

function listOpenWindows() {
  return new Promise((resolve, reject) => {
    exec('wmctrl -lx', (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      const windows = stdout.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split(/\s+/);
          const windowId = parts[0];
          const className = parts[2]; // e.g., "xfce4-terminal.Xfce4-terminal"
          const name = parts.slice(4).join(' '); // Window name
          const iconPath = findIcon(windowId);
          console.log(iconPath);

          return { windowId, className, name, iconPath };
        });

      resolve(windows);
    });
  });
}

function findIcon(windowId) {
  return new Promise((resolve, reject) => {
    exec(`xprop -id ${windowId}`, (error, stdout) => {
      if (error) {
        console.error(`Erro ao executar xprop: ${error.message}`);
        resolve('default.png'); // Ícone padrão em caso de erro
        return;
      }

      // Procurar pela propriedade _NET_WM_ICON
      const iconLine = stdout.split('\n').find(line => line.includes('_NET_WM_ICON'));
      if (!iconLine) {
        console.warn(`Nenhum ícone encontrado para a janela ${windowId}`);
        resolve('default.png');
        return;
      }

      const match = iconLine.match(/_NET_WM_ICON\(CARDINAL\) = (.+)/);
      if (!match || !match[1]) {
        console.warn(`Dados de ícone inválidos para a janela ${windowId}`);
        resolve('default.png');
        return;
      }

      const iconData = match[1].split(',').map(value => parseInt(value.trim(), 10));

      if (iconData.length === 0) {
        console.warn(`Nenhum dado de ícone processável para a janela ${windowId}`);
        resolve('default.png');
        return;
      }

      // Converter os dados do ícone para uma imagem base64
      const base64Icon = createIconImage(iconData);
      resolve(base64Icon || 'default.png'); // Retorna Base64 ou ícone padrão
    });
  });
}

function createIconImage(iconData) {
  try {
    const [width, height, ...pixels] = iconData;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i];
      const r = (pixel >> 16) & 0xff;
      const g = (pixel >> 8) & 0xff;
      const b = pixel & 0xff;
      const a = (pixel >> 24) & 0xff;

      const index = i * 4;
      imageData.data[index] = r;
      imageData.data[index + 1] = g;
      imageData.data[index + 2] = b;
      imageData.data[index + 3] = a;
    }

    ctx.putImageData(imageData, 0, 0);

    // Retornar a imagem como base64
    return canvas.toDataURL();
  } catch (error) {
    console.error(`Erro ao processar dados de ícone: ${error.message}`);
    return null; // Retorna nulo se falhar
  }
}

function focusWindow(windowId) {
  exec(`wmctrl -i -a ${windowId}`);
}

app.whenReady().then(createWindow);

ipcMain.handle('get-windows', async () => {
  return await listOpenWindows();
});

ipcMain.on('focus-window', (event, windowId) => {
  focusWindow(windowId);
});

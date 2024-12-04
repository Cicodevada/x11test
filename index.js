// main.js
const { app, BrowserWindow, ipcMain } = require('electron')
const { spawn } = require('child_process')
const path = require('path')

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true  // Importante para habilitar WebView
    }
  })

  mainWindow.loadFile('index.html')
}

// Método 1: WebView Integration
ipcMain.on('launch-webview-thunar', (event) => {
  const thunar = spawn('thunar', ['--browser'])
  thunar.stdout.on('data', (data) => {
    event.reply('thunar-output', data.toString())
  })
})

// Método 2: X11 Bridging (pseudo-código, requer biblioteca específica)
ipcMain.on('launch-x11-bridge', async (event) => {
  try {
    // Exemplo conceitual de como poderia ser um bridge de X11
    const x11Bridge = await import('electron-x11-bridge')
    const window = x11Bridge.embedX11App('thunar')
    event.reply('x11-bridge-ready', window.id)
  } catch (error) {
    event.reply('x11-bridge-error', error.message)
  }
})

// Método 3: iframe com xpra
ipcMain.on('launch-xpra-iframe', (event) => {
  // Comando para iniciar sessão Xpra
  const xpraProcess = spawn('xpra', [
    'start', 
    '--bind-tcp=0.0.0.0:10000', 
    '--start-child=thunar'
  ])

  xpraProcess.stdout.on('data', (data) => {
    event.reply('xpra-status', data.toString())
  })
})

app.whenReady().then(createMainWindow)
const { app, BrowserWindow, ipcMain } = require('electron')
const { exec } = require('child_process')
const x11 = require('x11')

class WindowManager {
  constructor() {
    this.activeWindows = new Map()
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      x11.createClient((err, display) => {
        if (err) reject(err)
        this.X = display.client
        this.root = display.screen[0].root
        this.setupWindowTracking()
        resolve()
      })
    })
  }

  setupWindowTracking() {
    this.X.ListWindows(this.root, (windows) => {
      windows.forEach(window => this.trackWindow(window))
    })

    // Eventos de criação/destruição de janelas
    this.X.on('MapNotify', (ev) => this.trackWindow(ev.window))
    this.X.on('UnmapNotify', (ev) => this.removeWindow(ev.window))
  }

  trackWindow(windowId) {
    this.X.GetWindowAttributes(windowId, (attrs) => {
      this.X.GetWindowName(windowId, (name) => {
        this.activeWindows.set(windowId, {
          id: windowId,
          name: name || 'Unnamed Window',
          class: attrs.class || 'Unknown'
        })
      })
    })
  }

  removeWindow(windowId) {
    this.activeWindows.delete(windowId)
  }

  getActiveWindows() {
    return Array.from(this.activeWindows.values())
  }
}

function createMainWindow(windowManager) {
  const mainWindow = new BrowserWindow({
    width: 300,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')

  // Atualizar lista de janelas periodicamente
  setInterval(() => {
    const windows = windowManager.getActiveWindows()
    mainWindow.webContents.send('update-windows', windows)
  }, 2000)
}

app.whenReady().then(async () => {
  const windowManager = new WindowManager()
  await windowManager.initialize()
  createMainWindow(windowManager)
})
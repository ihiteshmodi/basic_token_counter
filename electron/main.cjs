const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')

const DEFAULT_TOTAL = 39000

function getDataPath() {
  return path.join(app.getPath('userData'), 'token-counter-data.json')
}

function readFallbackInitialTotal() {
  try {
    const p = path.join(__dirname, '..', 'public', 'initialTotal.json')
    const raw = fs.readFileSync(p, 'utf8')
    const parsed = JSON.parse(raw)
    const n = Number(parsed?.initialTotal)
    return Number.isFinite(n) ? n : DEFAULT_TOTAL
  } catch {
    return DEFAULT_TOTAL
  }
}

function readData() {
  const dataPath = getDataPath()
  try {
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf8')
      const parsed = JSON.parse(raw)
      const total = Number(parsed?.total)
      const history = Array.isArray(parsed?.history) ? parsed.history : []
      return {
        total: Number.isFinite(total) ? total : readFallbackInitialTotal(),
        history,
      }
    }
  } catch {
    // ignore and fall back
  }

  return {
    total: readFallbackInitialTotal(),
    history: [],
  }
}

function writeData(next) {
  const dataPath = getDataPath()
  const total = Number(next?.total)
  const history = Array.isArray(next?.history) ? next.history : []
  const safe = {
    total: Number.isFinite(total) ? total : DEFAULT_TOTAL,
    history,
  }
  fs.mkdirSync(path.dirname(dataPath), { recursive: true })
  fs.writeFileSync(dataPath, JSON.stringify(safe, null, 2), 'utf8')
  return safe
}

function createWindow() {
  const win = new BrowserWindow({
    width: 520,
    height: 540,
    minWidth: 420,
    minHeight: 360,
    frame: false,
    transparent: true,
    hasShadow: true,
    alwaysOnTop: true,
    fullscreenable: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  let shown = false
  const showWindow = () => {
    if (shown || win.isDestroyed()) return
    shown = true
    win.center()
    win.show()
    win.focus()
  }

  win.once('ready-to-show', () => {
    showWindow()
  })

  // Some macOS transparent-window combinations may skip ready-to-show.
  // Ensure the window still appears once content has loaded.
  win.webContents.once('did-finish-load', () => {
    showWindow()
  })

  // Final fallback so the app never stays hidden in the dock.
  setTimeout(() => {
    showWindow()
  }, 1200)

  win.webContents.on('did-fail-load', (_event, code, desc, url) => {
    // eslint-disable-next-line no-console
    console.error('Window failed to load:', code, desc, url)
    showWindow()
    win.webContents.openDevTools({ mode: 'detach' })
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

ipcMain.handle('token:get-data', () => {
  return readData()
})

ipcMain.handle('token:set-data', (_, next) => {
  return writeData(next)
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

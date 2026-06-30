const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron')
const fs = require('fs')
const path = require('path')

const DEFAULT_TOTAL = 39000
const WINDOW_WIDTH = 300
const COLLAPSED_HEIGHT = 180
const MOVE_STEP = 60
const SCREEN_MARGIN = 16

let mainWindow = null

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
  const { workArea } = screen.getPrimaryDisplay()
  const startX = workArea.x + workArea.width - WINDOW_WIDTH - SCREEN_MARGIN
  const startY = workArea.y + SCREEN_MARGIN

  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: COLLAPSED_HEIGHT,
    x: startX,
    y: startY,
    useContentSize: true,
    frame: false,
    transparent: true,
    hasShadow: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow = win
  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  let shown = false
  const showWindow = () => {
    if (shown || win.isDestroyed()) return
    shown = true
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

ipcMain.handle('window:set-size', (_, size) => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const width = Math.max(240, Math.round(Number(size?.width) || WINDOW_WIDTH))
  const height = Math.max(120, Math.round(Number(size?.height) || COLLAPSED_HEIGHT))
  mainWindow.setContentSize(width, height, false)
})

function nudgeWindow(dx, dy) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const b = mainWindow.getBounds()
  const { workArea } = screen.getPrimaryDisplay()
  const x = Math.min(
    Math.max(workArea.x, b.x + dx),
    workArea.x + workArea.width - b.width,
  )
  const y = Math.min(
    Math.max(workArea.y, b.y + dy),
    workArea.y + workArea.height - b.height,
  )
  mainWindow.setBounds({ ...b, x, y })
}

function toggleVisibility() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

function registerShortcuts() {
  // Move the floating window with Cmd/Ctrl + Alt + Arrow keys.
  globalShortcut.register('CommandOrControl+Alt+Up', () => nudgeWindow(0, -MOVE_STEP))
  globalShortcut.register('CommandOrControl+Alt+Down', () => nudgeWindow(0, MOVE_STEP))
  globalShortcut.register('CommandOrControl+Alt+Left', () => nudgeWindow(-MOVE_STEP, 0))
  globalShortcut.register('CommandOrControl+Alt+Right', () => nudgeWindow(MOVE_STEP, 0))
  // Hide / show the window.
  globalShortcut.register('CommandOrControl+Alt+H', () => toggleVisibility())
}

app.whenReady().then(() => {
  createWindow()
  registerShortcuts()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

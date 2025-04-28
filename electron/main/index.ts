import { app, BrowserWindow, shell, ipcMain, clipboard } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { TargetLanguageCode } from 'deepl-node';
import * as deepl from 'deepl-node';
import {findLocalesPaths} from './findLocalesDirs';
import {createAppMenu} from './createAppMenu';

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

const args = process.argv;


let localesDir = '';



export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      nodeIntegration: false,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })
  createAppMenu(win)

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

findLocalesPaths()

ipcMain.handle("read-dir", async (_event, targetPath: string) => {
  // Show a dialog to let the user pick a directory

  const selectedDir = targetPath

  try {
    localesDir = selectedDir
    const files = await readdir(selectedDir);
    console.log("\nSelected directory filenames:", files);

    const result = {};
    for (const file of files) {
      const filePath = path.join(selectedDir, file);
      try {
        const buffer = await readFile(filePath, { encoding: "utf8" });
        result[file.split(".")[0]] = JSON.parse(buffer.trim());
      } catch (error) {
        console.error(`Error reading file: ${filePath}`, error);
      }
    }
    return result;
  } catch (error) {
    console.error("Error reading directory:", error);
    return { error: "Failed to read directory" };
  }
});







ipcMain.handle('save-changes', async (_event, json: string) => {
  const data = JSON.parse(json)

  for(const key in Object.keys(data)) {
    const lang = Object.keys(data)[key]
    await writeFile(localesDir+'/'+lang + '.json', JSON.stringify(data[lang], null, 2))
  }
  return true

})

const translator = new deepl.Translator('1bb88612-f544-4fd8-b2b6-f728b33c1282:fx');

ipcMain.handle('translate', async (_event, json: string) => {
  const { text, target } = JSON.parse(json)
  const res = await translator.translateText(text, 'en', target as TargetLanguageCode)
  return res

})

ipcMain.handle('clipboard', (_event, text) => {
  clipboard.writeText(text)
})


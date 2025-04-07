import { Menu, app, BrowserWindow } from 'electron'

export function createAppMenu(win: BrowserWindow) {
  const isMac = process.platform === 'darwin'

  const template: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[] = [
    // App Menu for macOS
    ...(isMac
      ? [{
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'quit' },
        ]
      }]
      : []),

    // {
    //   label: 'File',
    //   submenu: [
    //     {
    //       label: 'Load Locales',
    //       click: async () => {
    //         const { filePaths, canceled } = await dialog.showOpenDialog(win, {
    //           properties: ['openDirectory']
    //         })
    //         if (!canceled && filePaths.length > 0) {
    //           const selectedDir = filePaths[0]
    //           console.log('User selected:', selectedDir)
    //           // You can send the path to renderer if needed:
    //           win.webContents.send('locales-dir-selected', selectedDir)
    //         }
    //       }
    //     },
    //     isMac ? { role: 'close' } : { role: 'quit' }
    //   ]
    // },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

'use strict'

import {
  app,
  protocol,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  MenuItem,
  dialog,
  session,
} from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import path from 'path'
const isDevelopment = process.env.NODE_ENV !== 'production'
const URLSCHEME = 'app' // 用户自定义 URL SCHEME

// 主窗口
let win = null

// 托盘
let tray = null

// 是否关闭
let isQuit = false

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } },
])

// 设置调用协议
// remove so we can register each time as we run the app.
app.removeAsDefaultProtocolClient(URLSCHEME)

// If we are running a non-packaged version of the app && on windows
if (process.env.NODE_ENV === 'development' && process.platform === 'win32') {
  // Set the path of electron.exe and your app.
  // These two additional parameters are only available on windows.
  app.setAsDefaultProtocolClient(URLSCHEME, process.execPath, [
    path.resolve(process.argv[1]),
  ])
} else {
  app.setAsDefaultProtocolClient(URLSCHEME)
}

/**
 * 创建主窗口
 */
function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1024,
    height: 600,
    focusable: true, // 聚焦
    frame: false, // 无外框架
    transparent: true, // 透明
    backgroundColor: '#00ffffff', // 防止开发者工具关闭会出现白边
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // 跨域
    },
    // eslint-disable-next-line no-undef
    icon: path.resolve(__static, 'wdlogo.ico'),
  })
  // win.setAlwaysOnTop(true)
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
    // 新实例, 判断是否是通过URL SCHEME打开, 如果是则获取数据
    const argv = process.argv
    const string = argv[argv.length - 1]
    if (string.indexOf(URLSCHEME + '://') > -1) {
      handleUrlFromWeb(string)
    }
  }

  // 窗口关闭触发
  // 若isQuit为false, 则不退出, 只是缩小到托盘
  win.on('close', (e) => {
    isQuit = true
    app.exit()
    e.preventDefault()
    // if (isQuit) {
    //   win = null
    // } else {
    //   e.preventDefault()
    //   win.hide()
    // }
  })
}

/**
 * 创建预览弹窗
 */
let reviewPageWin = null
async function createReviewPageWindow(arg) {
  if (reviewPageWin) {
    await reviewPageWin.loadURL(arg)
    return
  }
  reviewPageWin = new BrowserWindow({
    title: '请点击进行选择, 选择好后请自行关闭窗口',
    parent: win,
    width: 1024,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // 跨域
      preload: path.join(__dirname, 'preload.js'),
    },
    // eslint-disable-next-line no-undef
    icon: path.resolve(__static, 'wdlogo.ico'),
  })
  reviewPageWin.on('close', () => {
    reviewPageWin = null
  })

  reviewPageWin.loadURL(arg)
  // reviewPageWin.webContents.openDevTools()
}

/**
 * 创建托盘
 */
function createTray() {
  // eslint-disable-next-line no-undef
  tray = new Tray(path.resolve(__static, 'wdlogo.ico'))
  const contextMenu = Menu.buildFromTemplate([
    new MenuItem({
      label: '显示主程序',
      click: () => {
        if (win.isVisible()) {
          win.focus()
        } else {
          win.show()
        }
      },
    }),
    new MenuItem({
      label: '前置窗口',
      type: 'checkbox',
      checked: false,
      click: (v) => {
        win.setAlwaysOnTop(v.checked)
      },
    }),
    new MenuItem({
      label: '退出程序',
      click: () => {
        isQuit = true
        app.exit()
      },
    }),
  ])
  tray.setToolTip('SpiderTool')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (win.isVisible()) {
      win.focus()
    } else {
      win.show()
    }
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  // 加载vue开发者插件
  if (isDevelopment) {
    await session.defaultSession.loadExtension(path.resolve('vueDevtool'))
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // 处理透明背景后, 出现黑边问题, 加个延时
  // https://github.com/electron/electron/issues/15947#issuecomment-571136404
  setTimeout(() => {
    createWindow()
    createTray()
  }, 400)
})

// 只允许单个实例
// https://www.electronjs.org/docs/api/app#apprequestsingleinstancelock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, argv) => {
    if (process.platform === 'win32') {
      console.log('window 准备执行网页端调起客户端逻辑')
      if (win) {
        if (win.isMinimized()) {
          win.restore()
        }
        if (win.isVisible()) {
          win.focus()
        } else {
          win.show()
        }
      }
      handleArgvFromWeb(argv)
    }
  })
}

// window 系统中执行网页调起应用时，处理协议传入的参数
const handleArgvFromWeb = (argv) => {
  console.log(argv)
  const url = argv.find((v) => v.indexOf(`${URLSCHEME}://`) !== -1)
  console.log(url)
  if (url) handleUrlFromWeb(url)
}

// 进行处理网页传来 url 参数，参数自定义，以下为示例
// 示例调起应用的 url 为 testapp://?token=205bdf49hc97ch4146h8124h8281a81fdcdb
const handleUrlFromWeb = (urlStr) => {
  console.log(urlStr)
  const urlObj = new URL(urlStr)
  const { searchParams } = urlObj
  const token = searchParams.get('token')
  win.webContents.send('token', token)
  console.log(token)
}

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

// 打开预览弹框
ipcMain.on('openReviewPage', (event, args) => {
  createReviewPageWindow(args)
})

// 接受css选择器结果, 并发送到主页面
ipcMain.on('domSelectorData', (event, args) => {
  win.webContents.send('domSelectorData', args)
})

// 关闭窗口
ipcMain.on('close', () => {
  app.quit()
})

// 最小化
ipcMain.on('min', () => {
  win.minimize()
})

// 最大化
ipcMain.on('max', () => {
  win.maximize()
})

// 获取userData路径
ipcMain.on('getUserDataPath', (event) => {
  event.returnValue = app.getPath('userData')
})

// 打开保存zpk弹框
ipcMain.on('showSaveDialog', async (event) => {
  const path = dialog.showSaveDialogSync({
    title: '选择保存路径',
    filters: [
      {
        name: 'zpk文件',
        extensions: ['zpk'],
      },
    ],
    properties: ['openFile'],
  })
  event.returnValue = path
})

// 打开保存json弹框
ipcMain.on('showSaveJsonDialog', (event) => {
  const path = dialog.showSaveDialog({
    title: '选择保存路径',
    filters: [
      {
        name: 'JSON文件',
        extensions: ['json'],
      },
    ],
    properties: {
      openFile: true,
      openDirectory: false,
      multiSelections: false,
    },
  })
  event.returnValue = path
})

// 选择文件弹框
ipcMain.on('importAppDialog', (event) => {
  const path = dialog.showOpenDialogSync({
    title: '选择zpk文件',
    filters: [
      {
        name: 'zpk文件',
        extensions: ['zpk'],
      },
    ],
  })
  event.returnValue = path
})

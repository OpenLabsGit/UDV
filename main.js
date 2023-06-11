const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");

  const menuTemplate = [
    {
      label: "File",
      submenu: [
        {
          label: "Dev Tools",
          click: () => mainWindow.webContents.openDevTools(),
        },
      ],
    },
    {
    label: "Application",
    submenu: [
        { label: "About Application", selector: "orderFrontStandardAboutPanel:" },
        { type: "separator" },
        { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
    ]}, {
    label: "Edit",
    submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]}
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  ipcMain.on("download-progress", (event, progress) => {
    mainWindow.webContents.send("download-progress", progress);
  });

  ipcMain.on("download", async (event, { url, audioOnly }) => {
    if (!url) {
      mainWindow.webContents.send("download-error", "No URL provided!");
      return;
    }

    const isValid = ytdl.validateURL(url);
    if (!isValid) {
      mainWindow.webContents.send("download-error", "Invalid YouTube URL.");
      return;
    }

    try {
      mainWindow.webContents.send("download-started");

      const fileLocation = await download(url, audioOnly, mainWindow);

      mainWindow.webContents.send("download-complete", fileLocation);
    } catch (error) {
      mainWindow.webContents.send("download-error", error.message);
    }
  });
}

async function download(url, audioOnly, mainWindow) {
  try {
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;
    const videoTitle = videoDetails.title.trim();
    const duration = parseInt(videoDetails.lengthSeconds, 10);
    const fileExtension = audioOnly ? "mp3" : "mkv";
    const downloadDirectory = path.join(app.getAppPath(), "downloads");
    const fileLocation = path.join(downloadDirectory, `${videoTitle}.${fileExtension}`);

    if (!fs.existsSync(downloadDirectory)) {
      fs.mkdirSync(downloadDirectory);
    }

    const formats = ytdl.filterFormats(info.formats, "audioandvideo");
    const format = formats.reduce((prev, curr) => {
      const prevQuality = prev.quality || Infinity;
      const currQuality = curr.quality || Infinity;
      return prevQuality < currQuality ? prev : curr;
    });

    if (!format) {
      throw new Error("No available video formats.");
    }

    const totalBytes = parseInt(format.contentLength, 10);

    const startTime = new Date().getTime();
    let downloadedBytes = 0;

    const writeStream = fs.createWriteStream(fileLocation);
    const videoStream = ytdl(url, { quality: format.itag });

    videoStream.on("data", (chunk) => {
      downloadedBytes += chunk.length;

      const remainingBytes = totalBytes - downloadedBytes;
      const remainingTime = calculateRemainingTime(duration, downloadedBytes, totalBytes);
      const progress = {
        downloaded: downloadedBytes,
        total: totalBytes,
        speed: calculateSpeed(startTime, downloadedBytes),
        duration: duration,
        remainingBytes: remainingBytes,
        remainingTime: remainingTime,
      };

      mainWindow.webContents.send("download-progress", progress);
    });

    videoStream.pipe(writeStream);

    return new Promise((resolve, reject) => {
      writeStream.on("finish", () => {
        const endTime = new Date().getTime();
        const downloadDuration = Math.round((endTime - startTime) / 1000);
        console.log("Download duration:", downloadDuration, "seconds");
        resolve(fileLocation);
      });

      writeStream.on("error", (error) => {
        reject(error);
      });
    });
  } catch (error) {
    throw new Error("Download failed. Please check the YouTube URL.");
  }
}

app.whenReady().then(createWindow); 

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(app)
    }
  });
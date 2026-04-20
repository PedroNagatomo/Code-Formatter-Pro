const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

// Substituir electron-is-dev por API nativa
const isDev = !app.isPackaged;

let mainWindow;
let backendProcess = null;
let backendReady = false;

// Função para iniciar o backend
function startBackend() {
  return new Promise((resolve, reject) => {
    let backendPath;

    if (isDev) {
      backendPath = path.join(__dirname, "../../backend/src/server.js");
    } else {
      // Em produção, o backend está em resources/backend
      backendPath = path.join(process.resourcesPath, "backend/src/server.js");
    }

    console.log("📂 Backend path:", backendPath);

    // Verificar se o arquivo existe
    if (!fs.existsSync(backendPath)) {
      console.error("❌ Backend não encontrado em:", backendPath);

      // Tentar caminho alternativo
      const altPath = path.join(
        process.resourcesPath,
        "app.asar.unpacked",
        "backend/src/server.js",
      );
      console.log("📂 Tentando caminho alternativo:", altPath);

      if (fs.existsSync(altPath)) {
        backendPath = altPath;
      } else {
        reject(new Error("Backend não encontrado"));
        return;
      }
    }

    console.log("🚀 Iniciando backend em:", backendPath);

    // O resto do código permanece igual...
    backendProcess = spawn("node", [backendPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PORT: 3001,
        NODE_ENV: isDev ? "development" : "production",
      },
      windowsHide: true,
    });

    backendProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      console.log(`[Backend] ${output}`);
      if (output.includes("rodando") || output.includes("listening")) {
        backendReady = true;
        resolve();
      }
    });

    backendProcess.stderr.on("data", (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    backendProcess.on("error", (error) => {
      console.error("[Backend] Erro:", error);
      reject(error);
    });

    backendProcess.on("close", (code) => {
      console.log(`[Backend] Processo encerrado: ${code}`);
      backendProcess = null;
      backendReady = false;
    });

    // Timeout
    setTimeout(() => {
      if (!backendReady) {
        console.log("[Backend] Continuando sem confirmação...");
        resolve();
      }
    }, 3000);
  });
}

// Função para criar janela
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, "../../public/icon.png"),
    title: "Code Formatter Pro",
    show: false,
    backgroundColor: "#1a1a2e",
  });

  // CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            isDev
              ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https://* data: blob:"
              : "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* data: blob:",
          ],
        },
      });
    },
  );

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  const startURL = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../build/index.html")}`;

  mainWindow.loadURL(startURL).catch((err) => {
    console.error("Failed to load URL:", err);
  });

  // Menu
  const template = [
    {
      label: "Arquivo",
      submenu: [
        {
          label: "Novo",
          accelerator: "CmdOrCtrl+N",
          click: () => mainWindow.webContents.send("new-file"),
        },
        { type: "separator" },
        { role: "reload", label: "Recarregar" },
        { role: "close", label: "Fechar Janela" },
        { type: "separator" },
        {
          label: "Sair",
          accelerator: "CmdOrCtrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "Editar",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "delete" },
        { type: "separator" },
        { role: "selectAll" },
      ],
    },
    {
      label: "Visualizar",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Ajuda",
      submenu: [
        {
          label: "Sobre",
          click: () => {
            const { dialog } = require("electron");
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Code Formatter Pro",
              message: "Code Formatter Pro v1.0.0",
              detail:
                "Formatador de código universal\n\nSuporte: Docker, Kubernetes, JS, Python, SQL, etc.",
              buttons: ["OK"],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Inicialização
app.whenReady().then(async () => {
  console.log("🟢 Electron pronto");
  console.log("isDev:", isDev);
  console.log("isPackaged:", app.isPackaged);

  try {
    await startBackend();
    console.log("✅ Backend iniciado");
  } catch (error) {
    console.error("❌ Erro ao iniciar backend:", error);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Cleanup
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (backendProcess) {
    console.log("🛑 Encerrando backend...");
    if (process.platform === "win32") {
      require("child_process").exec(
        `taskkill /pid ${backendProcess.pid} /T /F`,
        () => {},
      );
    } else {
      backendProcess.kill();
    }
  }
});

// IPC
ipcMain.on("app:quit", () => app.quit());
ipcMain.on("app:minimize", () => mainWindow?.minimize());
ipcMain.on("app:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

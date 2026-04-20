// Script para iniciar o app em desenvolvimento
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando Code Formatter Pro...\n');

// Iniciar React
const reactProcess = spawn('npm', ['start'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  shell: true
});

// Aguardar React iniciar
setTimeout(() => {
  // Iniciar Electron
  const electronProcess = spawn('npm', ['run', 'electron'], {
    cwd: path.join(__dirname),
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ELECTRON_START_URL: 'http://localhost:3000'
    }
  });
  
  electronProcess.on('close', () => {
    reactProcess.kill();
    process.exit();
  });
}, 5000);

// Cleanup
process.on('SIGINT', () => {
  reactProcess.kill();
  process.exit();
});
# 🚀 Code Formatter Pro

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/Electron-27.0.0-47848F.svg)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg)

Um formatador de código universal com suporte para múltiplas linguagens e ferramentas, incluindo Docker e Kubernetes.

## ✨ Funcionalidades

- 🎨 **Formatação Multi-linguagem**: JavaScript, TypeScript, Python, SQL, HTML, CSS, JSON
- 🐳 **Suporte a Docker**: Formatação especializada para Dockerfiles
- ☸️ **Suporte a Kubernetes**: Formatação inteligente para YAML do Kubernetes
- 🔍 **Análise de Código**: Detecta problemas e más práticas
- 🖥️ **App Desktop**: Funciona offline, sem necessidade de internet
- 🌙 **Tema Escuro**: Interface moderna e agradável
- ⌨️ **Atalhos de Teclado**: Produtividade máxima

## 📸 Screenshots

![App Screenshot](screenshots/app.png)

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Interface do usuário
- **Electron 27** - Aplicativo desktop
- **CodeMirror 6** - Editor de código
- **Axios** - Requisições HTTP

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Servidor HTTP
- **Prettier** - Formatação de código
- **js-yaml** - Processamento YAML

### DevOps
- **Docker** - Containerização
- **Electron Builder** - Empacotamento do app

## 📦 Instalação


### Build Local

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/code-formatter.git
cd code-formatter

# Instale as dependências
cd backend && npm install
cd ../frontend && npm install

# Execute em desenvolvimento
npm run dev

# Build do executável
npm run dist:win
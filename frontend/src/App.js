import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import CodeEditor from "./components/CodeEditor";
import "./App.css";

// Detectar se está rodando no Electron
const isElectron = window && window.process && window.process.type;

const API_URL = isElectron
  ? process.env.REACT_APP_API_URL || "http://localhost:3001"
  : "http://localhost:3001";

function App() {
  const [code, setCode] = useState("");
  const [formattedCode, setFormattedCode] = useState("");
  const [language, setLanguage] = useState("auto");
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [detectedLang, setDetectedLang] = useState("javascript");
  const [analysis, setAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(true);

  const languages = [
    { value: "auto", label: "🤖 Auto Detectar" },
    { value: "javascript", label: "📜 JavaScript" },
    { value: "typescript", label: "📘 TypeScript" },
    { value: "json", label: "📦 JSON" },
    { value: "yaml", label: "🔷 YAML (Kubernetes)" },
    { value: "dockerfile", label: "🐳 Dockerfile" },
    { value: "python", label: "🐍 Python" },
    { value: "html", label: "🌐 HTML" },
    { value: "css", label: "🎨 CSS" },
    { value: "sql", label: "🗄️ SQL" },
  ];

  // Configurar listeners do Electron
  useEffect(() => {
    if (isElectron) {
      const { ipcRenderer } = window.require("electron");

      ipcRenderer.on("new-file", () => {
        setCode("");
        setFormattedCode("");
        setErrors([]);
        setAnalysis(null);
        toast.success("Novo arquivo");
      });

      return () => {
        ipcRenderer.removeAllListeners("new-file");
      };
    }
  }, []);

  useEffect(() => {
  const handleKeyDown = (e) => {
    // Ctrl/Cmd + Enter: Formatar
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleFormat();
    }
    
    // Ctrl/Cmd + Shift + V: Colar
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
      e.preventDefault();
      handlePaste();
    }
    
    // Ctrl/Cmd + Shift + C: Copiar resultado
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      handleCopy();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [code, formattedCode]);

  // Auto-detectar linguagem baseado no nome do arquivo
  useEffect(() => {
    if (fileName) {
      const ext = fileName.split(".").pop()?.toLowerCase();
      const name = fileName.toLowerCase();

      if (name.includes("dockerfile")) {
        setLanguage("dockerfile");
      } else if (
        name.includes("deployment") ||
        name.includes("service") ||
        name.includes("ingress")
      ) {
        setLanguage("yaml");
      } else {
        const extMap = {
          js: "javascript",
          jsx: "javascript",
          ts: "typescript",
          tsx: "typescript",
          json: "json",
          yaml: "yaml",
          yml: "yaml",
          py: "python",
          html: "html",
          htm: "html",
          css: "css",
          sql: "sql",
        };
        if (extMap[ext]) {
          setLanguage(extMap[ext]);
        }
      }
    }
  }, [fileName]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter para formatar
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleFormat();
      }
      // Ctrl/Cmd + Shift + V para colar
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "V") {
        e.preventDefault();
        handlePaste();
      }
      // Ctrl/Cmd + Shift + C para copiar resultado
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        handleCopy();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, formattedCode]);

  const getEditorLanguage = () => {
    if (language === "auto") return detectedLang;
    return language;
  };

  const handleFormat = async () => {
    if (!code.trim()) {
      toast.error("Cole algum código para formatar!");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Analisando e formatando código...");

    try {
      const response = await axios.post(`${API_URL}/api/format`, {
        code,
        fileName,
        language: language === "auto" ? null : language,
      });

      if (response.data.success) {
        setFormattedCode(response.data.formatted);
        setErrors(response.data.errors || []);
        setDetectedLang(response.data.language);
        setAnalysis(response.data.analysis);

        // Mostrar resumo da análise
        if (response.data.analysis?.hasIssues) {
          const critical = response.data.analysis.criticalCount;
          const total = response.data.analysis.issues.length;

          if (critical > 0) {
            toast.error(
              `⚠️ ${critical} problema(s) crítico(s) e ${total - critical} aviso(s) encontrado(s)!`,
              {
                id: loadingToast,
                duration: 5000,
              },
            );
          } else {
            toast.success(
              `✅ Código formatado com ${total} sugestões de melhoria`,
              {
                id: loadingToast,
                duration: 4000,
              },
            );
          }
        } else {
          toast.success("✨ Código perfeito! Nenhum problema encontrado.", {
            id: loadingToast,
            duration: 3000,
          });
        }

        toast(`🔍 Linguagem detectada: ${response.data.language}`, {
          icon: "🔍",
          duration: 3000,
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao formatar código", {
        id: loadingToast,
        duration: 5000,
      });
      console.error("Erro:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeOnly = async () => {
    if (!code.trim()) {
      toast.error("Cole algum código para analisar!");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Analisando código...");

    try {
      const response = await axios.post(`${API_URL}/api/analyze`, {
        code,
        fileName,
        language: language === "auto" ? null : language,
      });

      if (response.data.success) {
        setDetectedLang(response.data.language);
        setAnalysis({
          issues: response.data.issues,
          hasIssues: response.data.issues.length > 0,
          criticalCount: response.data.summary.errors,
        });

        if (response.data.issues.length > 0) {
          toast.error(`Encontrados ${response.data.summary.total} problemas`, {
            id: loadingToast,
          });
        } else {
          toast.success("Nenhum problema encontrado!", {
            id: loadingToast,
          });
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao analisar código", {
        id: loadingToast,
      });
      console.error("Erro:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (formattedCode) {
      navigator.clipboard.writeText(formattedCode);
      toast.success("Código copiado!", {
        icon: "📋",
        duration: 2000,
      });
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCode(text);
      toast.success("Código colado!", {
        icon: "📌",
        duration: 2000,
      });
    } catch (error) {
      toast.error("Erro ao colar código. Use Ctrl+V no editor.");
    }
  };

  const handleClear = () => {
    setCode("");
    setFormattedCode("");
    setErrors([]);
    setAnalysis(null);
    toast.success("Limpo!", {
      icon: "🧹",
      duration: 2000,
    });
  };

  const handleSwap = () => {
    setCode(formattedCode);
    setFormattedCode("");
    setAnalysis(null);
    toast.success("Código movido para o editor!", {
      icon: "🔄",
      duration: 2000,
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#3b82f6";
      default:
        return "#888";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "high":
        return "🔴";
      case "medium":
        return "🟡";
      case "low":
        return "🔵";
      default:
        return "⚪";
    }
  };

  return (
    <div className="App">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#4ade80",
              secondary: "#fff",
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      <header className="app-header">
        <h1>🚀 Code Formatter Pro</h1>
        <p>Suporte para Docker, Kubernetes, JavaScript, Python, SQL e mais!</p>
      </header>

      <div className="controls">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="language-select"
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Nome do arquivo (opcional) - Ex: Dockerfile, deployment.yaml"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="filename-input"
        />

        <div className="button-group">
          <button
            onClick={handlePaste}
            className="btn-secondary"
            title="Colar do clipboard (Ctrl+Shift+V)"
          >
            📋 Colar
          </button>
          <button
            onClick={handleAnalyzeOnly}
            disabled={isLoading}
            className="btn-info"
            title="Apenas analisar código"
          >
            🔍 Analisar
          </button>
          <button
            onClick={handleFormat}
            disabled={isLoading}
            className="btn-primary"
            title="Formatar código (Ctrl+Enter)"
          >
            {isLoading ? "⏳ Processando..." : "✨ Formatar"}
          </button>
          <button
            onClick={handleCopy}
            className="btn-secondary"
            disabled={!formattedCode}
            title="Copiar resultado (Ctrl+Shift+C)"
          >
            📑 Copiar
          </button>
          <button
            onClick={handleSwap}
            className="btn-secondary"
            disabled={!formattedCode}
            title="Mover resultado para o editor"
          >
            🔄 Trocar
          </button>
          <button
            onClick={handleClear}
            className="btn-danger"
            title="Limpar tudo"
          >
            🗑️ Limpar
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="errors-panel">
          <h3>⚠️ Erros de Sintaxe:</h3>
          {errors.map((error, index) => (
            <div key={index} className="error-item">
              Linha {error.line}, Coluna {error.column}: {error.message}
            </div>
          ))}
        </div>
      )}

      {analysis && analysis.hasIssues && (
        <div className="analysis-panel">
          <div
            className="analysis-header"
            onClick={() => setShowAnalysis(!showAnalysis)}
          >
            <h3>
              🔍 Análise de Código
              <span className="issue-count">
                {analysis.issues.length} problemas encontrados
                {analysis.criticalCount > 0 && (
                  <span className="critical-badge">
                    {analysis.criticalCount} críticos
                  </span>
                )}
              </span>
            </h3>
            <button className="toggle-analysis">
              {showAnalysis ? "▼" : "▶"}
            </button>
          </div>

          {showAnalysis && (
            <div className="analysis-content">
              {analysis.issues.map((issue, index) => (
                <div
                  key={index}
                  className={`issue-item issue-${issue.severity}`}
                >
                  <div className="issue-header">
                    <span
                      className={`severity-badge severity-${issue.severity}`}
                    >
                      {getSeverityIcon(issue.severity)}{" "}
                      {issue.severity === "high"
                        ? "ERRO"
                        : issue.severity === "medium"
                          ? "AVISO"
                          : "INFO"}
                    </span>
                    {issue.line && (
                      <span className="issue-line">📍 Linha {issue.line}</span>
                    )}
                  </div>
                  <div className="issue-message">{issue.message}</div>
                  {issue.solution && (
                    <div className="issue-solution">
                      <strong>💡 Solução:</strong> {issue.solution}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="editors-container">
        <div className="editor-panel">
          <h3>📝 Código Original</h3>
          <CodeEditor
            value={code}
            onChange={setCode}
            language={getEditorLanguage()}
            height="100%"
            readOnly={false}
            placeholder="Cole ou digite seu código aqui..."
          />
        </div>

        <div className="editor-panel">
          <h3>✅ Código Formatado</h3>
          <CodeEditor
            value={formattedCode}
            language={getEditorLanguage()}
            height="100%"
            readOnly={true}
            placeholder="Código formatado aparecerá aqui..."
          />
        </div>
      </div>

      <footer className="app-footer">
        <div className="shortcuts">
          <span>Ctrl+Enter: Formatar</span>
          <span>Ctrl+Shift+V: Colar</span>
          <span>Ctrl+Shift+C: Copiar</span>
        </div>
        <div className="status-bar">
          <span>Linguagem: {detectedLang}</span>
          {analysis && <span>Problemas: {analysis.issues?.length || 0}</span>}
        </div>
      </footer>
    </div>
  );
}

export default App;

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const prettier = require("prettier");
const yaml = require("js-yaml");
const CodeAnalyzer = require("./analyzers/codeAnalyzer");

const app = express();
const PORT = process.env.PORT || 3001;
const analyzer = new CodeAnalyzer();

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// ============= DETECTOR DE LINGUAGEM =============
function detectLanguage(code, fileName = "") {
  // Dockerfile
  if (
    fileName.toLowerCase().includes("dockerfile") ||
    (code.match(/^FROM\s+/m) &&
      (code.match(/^RUN\s+/m) || code.match(/^CMD\s+/m)))
  ) {
    return "dockerfile";
  }

  // Kubernetes YAML
  if (
    (code.includes("apiVersion:") && code.includes("kind:")) ||
    (code.match(/^apiVersion:/m) && code.match(/^kind:/m))
  ) {
    return "yaml";
  }

  // YAML genérico
  if (code.match(/^[\w-]+:\s/m) && !code.includes("{")) {
    return "yaml";
  }

  // JSON
  try {
    JSON.parse(code);
    return "json";
  } catch (e) {}

  // SQL
  const sqlPatterns = [
    /\bSELECT\s+.+\s+FROM\s+/i,
    /\bINSERT\s+INTO\s+/i,
    /\bUPDATE\s+.+\s+SET\s+/i,
    /\bDELETE\s+FROM\s+/i,
    /\bCREATE\s+TABLE\s+/i,
  ];
  if (sqlPatterns.some((pattern) => pattern.test(code))) {
    return "sql";
  }

  // Python
  if (
    (code.includes("def ") || code.includes("class ")) &&
    code.includes(":")
  ) {
    return "python";
  }

  // TypeScript
  if (
    code.includes(":") &&
    (code.includes("interface") ||
      code.includes("type ") ||
      code.includes("export "))
  ) {
    return "typescript";
  }

  // JavaScript
  if (
    code.includes("function") ||
    code.includes("const ") ||
    code.includes("let ") ||
    code.includes("var ")
  ) {
    return "javascript";
  }

  // HTML
  if (
    code.includes("<html") ||
    code.includes("<div") ||
    code.includes("<!DOCTYPE")
  ) {
    return "html";
  }

  // CSS
  if (
    code.includes("{") &&
    code.includes("}") &&
    (code.includes("margin:") ||
      code.includes("padding:") ||
      code.includes("color:"))
  ) {
    return "css";
  }

  return "text";
}

// ============= FORMATADOR DOCKERFILE =============
function formatDockerfile(code) {
  const lines = code.split("\n");
  const formatted = [];
  let inMultiline = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    // Linha vazia
    if (trimmed === "") {
      formatted.push("");
      continue;
    }

    // Comentário
    if (trimmed.startsWith("#")) {
      formatted.push(trimmed);
      continue;
    }

    // Identifica a instrução
    const parts = trimmed.split(/\s+/);
    const instruction = parts[0].toUpperCase();

    // Formata instruções
    switch (instruction) {
      case "FROM":
      case "LABEL":
      case "ENV":
      case "ARG":
      case "WORKDIR":
      case "USER":
      case "EXPOSE":
      case "VOLUME":
      case "STOPSIGNAL":
      case "SHELL":
        formatted.push(trimmed);
        break;

      case "RUN":
      case "CMD":
      case "ENTRYPOINT":
        // Formata comandos longos com quebra de linha
        if (trimmed.includes("&&") && trimmed.length > 60) {
          const cmdParts = trimmed.split("&&");
          let formattedCmd = cmdParts[0].trim();
          for (let j = 1; j < cmdParts.length; j++) {
            formattedCmd += " \\\n    && " + cmdParts[j].trim();
          }
          formatted.push(formattedCmd);
        } else {
          formatted.push(trimmed);
        }
        break;

      case "COPY":
      case "ADD":
        // Garante que COPY/ADD tenha --chown formatado corretamente
        if (trimmed.includes("--chown")) {
          formatted.push(trimmed);
        } else {
          formatted.push(trimmed);
        }
        break;

      case "HEALTHCHECK":
        // Formata HEALTHCHECK
        if (trimmed.includes("--")) {
          const healthParts = trimmed.split("CMD");
          if (healthParts.length > 1) {
            formatted.push(
              healthParts[0].trim() + " \\\n    CMD " + healthParts[1].trim(),
            );
          } else {
            formatted.push(trimmed);
          }
        } else {
          formatted.push(trimmed);
        }
        break;

      default:
        formatted.push(trimmed);
    }
  }

  return formatted.join("\n");
}

// ============= FORMATADOR SQL =============
function formatSQL(code) {
  // Lista de palavras-chave SQL
  const mainKeywords = [
    "SELECT",
    "FROM",
    "WHERE",
    "JOIN",
    "INNER JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "FULL JOIN",
    "CROSS JOIN",
    "ON",
    "USING",
    "GROUP BY",
    "ORDER BY",
    "HAVING",
    "LIMIT",
    "OFFSET",
    "FETCH",
    "UNION",
    "UNION ALL",
    "INTERSECT",
    "EXCEPT",
  ];

  const secondaryKeywords = [
    "AND",
    "OR",
    "NOT",
    "IN",
    "EXISTS",
    "BETWEEN",
    "LIKE",
    "IS NULL",
    "IS NOT NULL",
  ];

  const dmlKeywords = ["INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM"];
  const ddlKeywords = [
    "CREATE TABLE",
    "ALTER TABLE",
    "DROP TABLE",
    "TRUNCATE",
    "CREATE INDEX",
    "DROP INDEX",
  ];

  let formatted = code;

  // Coloca palavras-chave em maiúsculas
  [
    ...mainKeywords,
    ...secondaryKeywords,
    ...dmlKeywords,
    ...ddlKeywords,
  ].forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "gi");
    formatted = formatted.replace(regex, keyword.toUpperCase());
  });

  // Adiciona quebras de linha e indentação
  formatted = formatted
    // Quebra antes de SELECT
    .replace(/\bSELECT\b/gi, "\nSELECT")
    // Quebra antes de FROM
    .replace(/\bFROM\b/gi, "\nFROM")
    // Quebra antes de WHERE
    .replace(/\bWHERE\b/gi, "\nWHERE")
    // Quebra antes de JOINs
    .replace(
      /\b(INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|JOIN)\b/gi,
      "\n$1",
    )
    // Quebra antes de GROUP BY
    .replace(/\bGROUP\s+BY\b/gi, "\nGROUP BY")
    // Quebra antes de ORDER BY
    .replace(/\bORDER\s+BY\b/gi, "\nORDER BY")
    // Quebra antes de HAVING
    .replace(/\bHAVING\b/gi, "\nHAVING")
    // Indenta AND/OR
    .replace(/\bAND\b/gi, "\n    AND")
    .replace(/\bOR\b/gi, "\n    OR")
    // Quebra depois de vírgulas em SELECT
    .replace(/,(?![^\(]*\))/g, ",\n    ");

  // Remove linhas vazias extras e trim
  formatted = formatted
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return formatted;
}

// ============= FORMATADOR PYTHON =============
function formatPython(code) {
  const lines = code.split("\n");
  const formatted = [];
  let indentLevel = 0;

  for (let line of lines) {
    const trimmed = line.trim();

    // Linha vazia
    if (trimmed === "") {
      formatted.push("");
      continue;
    }

    // Reduz indentação para certas palavras-chave
    if (
      trimmed.startsWith("else:") ||
      trimmed.startsWith("elif ") ||
      trimmed.startsWith("except") ||
      trimmed.startsWith("finally:") ||
      (trimmed.startsWith("class ") && indentLevel > 0)
    ) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Adiciona indentação (4 espaços por nível)
    const indentedLine = "    ".repeat(indentLevel) + trimmed;
    formatted.push(indentedLine);

    // Aumenta indentação após dois pontos
    if (
      trimmed.endsWith(":") &&
      !trimmed.startsWith("else:") &&
      !trimmed.startsWith("finally:")
    ) {
      indentLevel++;
    }

    // Reduz indentação após certas declarações
    if (
      trimmed.startsWith("return") ||
      trimmed.startsWith("pass") ||
      trimmed.startsWith("break") ||
      trimmed.startsWith("continue") ||
      trimmed.startsWith("raise")
    ) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
  }

  // Corrige indentação extra no final
  return formatted.join("\n").trim();
}

// ============= FORMATADOR YAML =============
function formatYAML(code) {
  try {
    // Divide por documentos (---)
    const documents = code.split(/^---/m);
    const formattedDocs = [];

    for (let doc of documents) {
      if (!doc.trim()) continue;

      try {
        const parsed = yaml.load(doc);
        const formatted = yaml.dump(parsed, {
          indent: 2,
          lineWidth: 100,
          noRefs: true,
          sortKeys: false,
          quotingType: '"',
          forceQuotes: false,
        });
        formattedDocs.push(formatted);
      } catch (e) {
        // Se falhar o parse, mantém o original
        formattedDocs.push(doc);
      }
    }

    // Junta com separador
    return formattedDocs.join("---\n");
  } catch (error) {
    // Fallback: indentação básica
    const lines = code.split("\n");
    const formatted = [];
    let indentLevel = 0;

    for (let line of lines) {
      const trimmed = line.trim();

      if (trimmed === "") {
        formatted.push("");
      } else if (trimmed === "---") {
        formatted.push("---");
        indentLevel = 0;
      } else if (trimmed.endsWith(":")) {
        formatted.push("  ".repeat(indentLevel) + trimmed);
        indentLevel++;
      } else if (trimmed.startsWith("-")) {
        formatted.push("  ".repeat(indentLevel) + trimmed);
      } else {
        formatted.push("  ".repeat(indentLevel) + trimmed);
      }
    }

    return formatted.join("\n");
  }
}

// ============= FORMATADOR PRETTIER =============
async function formatWithPrettier(code, language) {
  const options = {
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: true,
    trailingComma: "es5",
    bracketSpacing: true,
    arrowParens: "avoid",
    printWidth: 100,
  };

  // Configura parser baseado na linguagem
  switch (language) {
    case "javascript":
      options.parser = "babel";
      break;
    case "typescript":
      options.parser = "typescript";
      break;
    case "json":
      options.parser = "json";
      break;
    case "html":
      options.parser = "html";
      break;
    case "css":
      options.parser = "css";
      break;
    default:
      throw new Error(`Prettier não suporta ${language}`);
  }

  try {
    return await prettier.format(code, options);
  } catch (error) {
    throw error;
  }
}

// ============= VALIDAÇÃO =============
function validateCode(code, language) {
  const errors = [];

  try {
    if (language === "json") {
      JSON.parse(code);
    } else if (language === "yaml") {
      const docs = code.split(/^---/m).filter((doc) => doc.trim());
      docs.forEach((doc) => yaml.load(doc));
    }
  } catch (error) {
    errors.push({
      line: error.mark?.line || 0,
      column: error.mark?.column || 0,
      message: error.message,
    });
  }

  return errors;
}

// ============= ROTAS =============

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    formatters: [
      "dockerfile",
      "sql",
      "python",
      "yaml",
      "javascript",
      "typescript",
      "json",
      "html",
      "css",
    ],
  });
});

// Análise de código
app.post("/api/analyze", async (req, res) => {
  try {
    const { code, fileName, language: suggestedLanguage } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Código não fornecido" });
    }

    const detectedLanguage =
      suggestedLanguage || detectLanguage(code, fileName);
    const issues = analyzer.analyzeCode(code, detectedLanguage);

    const errors = issues.filter((i) => i.severity === "high");
    const warnings = issues.filter((i) => i.severity === "medium");
    const infos = issues.filter((i) => i.severity === "low");

    res.json({
      success: true,
      language: detectedLanguage,
      issues: issues,
      summary: {
        total: issues.length,
        errors: errors.length,
        warnings: warnings.length,
        infos: infos.length,
      },
      message:
        issues.length > 0
          ? `Encontrados ${issues.length} problemas`
          : "Nenhum problema encontrado!",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Formatação de código
app.post("/api/format", async (req, res) => {
  try {
    const { code, fileName, language: suggestedLanguage } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Código não fornecido" });
    }

    const detectedLanguage =
      suggestedLanguage || detectLanguage(code, fileName);
    let formattedCode;
    const errors = [];

    // Validação
    const validationErrors = validateCode(code, detectedLanguage);
    errors.push(...validationErrors);

    // Análise de código
    const analysisIssues = analyzer.analyzeCode(code, detectedLanguage);

    // Formatação
    try {
      switch (detectedLanguage) {
        case "dockerfile":
          formattedCode = formatDockerfile(code);
          break;
        case "sql":
          formattedCode = formatSQL(code);
          break;
        case "python":
          formattedCode = formatPython(code);
          break;
        case "yaml":
          formattedCode = formatYAML(code);
          break;
        case "javascript":
        case "typescript":
        case "json":
        case "html":
        case "css":
          formattedCode = await formatWithPrettier(code, detectedLanguage);
          break;
        default:
          // Para linguagens não suportadas, retorna o original
          formattedCode = code;
      }
    } catch (formatError) {
      console.error("Erro na formatação:", formatError.message);
      formattedCode = code;
      errors.push({
        line: 0,
        column: 0,
        message: `Erro na formatação: ${formatError.message}`,
      });
    }

    res.json({
      success: true,
      formatted: formattedCode,
      language: detectedLanguage,
      errors: errors,
      analysis: {
        issues: analysisIssues,
        hasIssues: analysisIssues.length > 0,
        criticalCount: analysisIssues.filter((i) => i.severity === "high")
          .length,
      },
      message:
        errors.length > 0 ? "Formatado com avisos" : "Formatado com sucesso",
    });
  } catch (error) {
    console.error("Erro no servidor:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Code Formatter Backend rodando na porta ${PORT}`);
  console.log("\n📝 Formatadores disponíveis:");
  console.log("  ✅ Dockerfile  - Formatador personalizado");
  console.log("  ✅ SQL         - Formatador personalizado");
  console.log("  ✅ Python      - Formatador personalizado");
  console.log(
    "  ✅ YAML        - Formatador personalizado (suporte multi-doc)",
  );
  console.log("  ✅ JavaScript  - Prettier");
  console.log("  ✅ TypeScript  - Prettier");
  console.log("  ✅ JSON        - Prettier");
  console.log("  ✅ HTML        - Prettier");
  console.log("  ✅ CSS         - Prettier");
  console.log("\n✨ Pronto para receber requisições!\n");
});

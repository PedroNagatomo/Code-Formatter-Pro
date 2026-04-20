class CodeAnalyzer {
  analyzeCode(code, language) {
    const issues = [];
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        issues.push(...this.analyzeJavaScript(code));
        break;
      case 'python':
        issues.push(...this.analyzePython(code));
        break;
      case 'dockerfile':
        issues.push(...this.analyzeDockerfile(code));
        break;
      case 'yaml':
        issues.push(...this.analyzeYAML(code));
        break;
      case 'json':
        issues.push(...this.analyzeJSON(code));
        break;
      case 'sql':
        issues.push(...this.analyzeSQL(code));
        break;
      case 'html':
        issues.push(...this.analyzeHTML(code));
        break;
    }
    
    return issues;
  }

  analyzeJavaScript(code) {
    const issues = [];
    const lines = code.split('\n');
    
    // Verificar chaves não fechadas
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push({
        type: 'error',
        message: `Chaves não balanceadas: ${openBraces} abertas, ${closeBraces} fechadas`,
        solution: openBraces > closeBraces ? 
          'Adicione ' + (openBraces - closeBraces) + ' chave(s) de fechamento }' :
          'Remova ' + (closeBraces - openBraces) + ' chave(s) extras',
        line: this.findLineWithIssue(code, '{'),
        severity: 'high'
      });
    }

    // Verificar parênteses não fechados
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push({
        type: 'error',
        message: `Parênteses não balanceados: ${openParens} abertos, ${closeParens} fechados`,
        solution: openParens > closeParens ? 
          'Adicione ' + (openParens - closeParens) + ' parêntese(s) de fechamento )' :
          'Remova ' + (closeParens - openParens) + ' parêntese(s) extras',
        severity: 'high'
      });
    }

    // Verificar colchetes não fechados
    const openBrackets = (code.match(/\[/g) || []).length;
    const closeBrackets = (code.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      issues.push({
        type: 'error',
        message: `Colchetes não balanceados: ${openBrackets} abertos, ${closeBrackets} fechados`,
        solution: openBrackets > closeBrackets ? 
          'Adicione ' + (openBrackets - closeBrackets) + ' colchete(s) de fechamento ]' :
          'Remova ' + (closeBrackets - openBrackets) + ' colchete(s) extras',
        severity: 'high'
      });
    }

    // Verificar vírgulas faltando em objetos
    const objectPattern = /\{\s*(\w+:\s*[^,}\n]+)(\s+\w+:\s*[^,}\n]+)\s*\}/g;
    let match;
    while ((match = objectPattern.exec(code)) !== null) {
      issues.push({
        type: 'warning',
        message: 'Possível vírgula faltando entre propriedades do objeto',
        solution: 'Adicione vírgula entre as propriedades: ' + match[0],
        line: this.getLineNumber(code, match.index),
        severity: 'medium'
      });
    }

    // Verificar return sem valor em função que deveria retornar
    lines.forEach((line, index) => {
      if (line.includes('function') && line.includes('{')) {
        const functionBody = this.extractFunctionBody(code, index);
        if (functionBody.includes('return') && !functionBody.match(/return\s+\S+/)) {
          issues.push({
            type: 'warning',
            message: 'Função tem return vazio',
            solution: 'Especifique um valor para retornar ou remova o return',
            line: index + 1,
            severity: 'medium'
          });
        }
      }
    });

    // Verificar variáveis declaradas mas não usadas (simplificado)
    const declaredVars = code.match(/(?:let|const|var)\s+(\w+)/g) || [];
    declaredVars.forEach(varDecl => {
      const varName = varDecl.split(/\s+/)[1];
      const varUsage = new RegExp(`\\b${varName}\\b`, 'g');
      const usageCount = (code.match(varUsage) || []).length;
      if (usageCount <= 1) {
        issues.push({
          type: 'info',
          message: `Variável '${varName}' é declarada mas não é usada`,
          solution: `Remova a declaração ou use a variável ${varName}`,
          severity: 'low'
        });
      }
    });

    // Verificar async sem await
    if (code.includes('async') && !code.includes('await')) {
      lines.forEach((line, index) => {
        if (line.includes('async') && line.includes('function')) {
          issues.push({
            type: 'warning',
            message: 'Função marcada como async mas não usa await',
            solution: 'Remova a palavra-chave async ou adicione await',
            line: index + 1,
            severity: 'medium'
          });
        }
      });
    }

    // Verificar console.log em produção
    if (code.includes('console.log')) {
      issues.push({
        type: 'warning',
        message: 'console.log encontrado no código',
        solution: 'Remova console.log em produção ou use uma biblioteca de logging',
        severity: 'low'
      });
    }

    return issues;
  }

  analyzePython(code) {
    const issues = [];
    const lines = code.split('\n');
    
    // Verificar indentação inconsistente
    let indentationLevels = [];
    lines.forEach((line, index) => {
      if (line.trim().length > 0 && !line.trim().startsWith('#')) {
        const indent = line.match(/^\s*/)[0].length;
        indentationLevels.push({ line: index + 1, indent });
      }
    });

    for (let i = 1; i < indentationLevels.length; i++) {
      const diff = indentationLevels[i].indent - indentationLevels[i-1].indent;
      if (diff > 0 && diff % 4 !== 0) {
        issues.push({
          type: 'warning',
          message: `Indentação inconsistente na linha ${indentationLevels[i].line}`,
          solution: 'Use múltiplos de 4 espaços para indentação',
          line: indentationLevels[i].line,
          severity: 'medium'
        });
      }
    }

    // Verificar dois pontos faltando
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if ((trimmed.startsWith('if ') || trimmed.startsWith('else') || 
           trimmed.startsWith('for ') || trimmed.startsWith('while ') ||
           trimmed.startsWith('def ') || trimmed.startsWith('class ') ||
           trimmed.startsWith('elif ') || trimmed.startsWith('try') ||
           trimmed.startsWith('except ') || trimmed.startsWith('finally')) &&
          !trimmed.endsWith(':')) {
        issues.push({
          type: 'error',
          message: `Faltando dois pontos (:) na linha ${index + 1}`,
          solution: `Adicione ':' ao final: ${trimmed}:`,
          line: index + 1,
          severity: 'high'
        });
      }
    });

    // Verificar self faltando em métodos
    lines.forEach((line, index) => {
      if (line.includes('def ') && line.includes('(self') === false && 
          !line.includes('@staticmethod') && !line.includes('@classmethod')) {
        // Verificar se é um método dentro de classe
        const beforeLines = lines.slice(0, index);
        const isInClass = beforeLines.some(l => l.trim().startsWith('class '));
        if (isInClass) {
          issues.push({
            type: 'error',
            message: 'Método de classe sem parâmetro self',
            solution: `Adicione 'self' como primeiro parâmetro: def ${line.match(/def\s+(\w+)/)[1]}(self, ...):`,
            line: index + 1,
            severity: 'high'
          });
        }
      }
    });

    // Verificar imports não usados
    const imports = code.match(/^import\s+(\w+)|^from\s+(\w+)\s+import/gm) || [];
    imports.forEach(imp => {
      const moduleName = imp.split(/\s+/)[1];
      const used = new RegExp(`\\b${moduleName}\\.`).test(code);
      if (!used) {
        issues.push({
          type: 'info',
          message: `Import '${moduleName}' não utilizado`,
          solution: `Remova o import desnecessário: ${imp}`,
          severity: 'low'
        });
      }
    });

    return issues;
  }

  analyzeDockerfile(code) {
    const issues = [];
    const lines = code.split('\n');
    
    // Verificar FROM no início
    const firstNonCommentLine = lines.find(l => !l.trim().startsWith('#') && l.trim().length > 0);
    if (firstNonCommentLine && !firstNonCommentLine.trim().startsWith('FROM')) {
      issues.push({
        type: 'error',
        message: 'Dockerfile deve começar com FROM',
        solution: 'Adicione FROM <imagem> como primeira instrução',
        severity: 'high'
      });
    }

    // Verificar EXPOSE sem porta
    lines.forEach((line, index) => {
      if (line.trim().startsWith('EXPOSE') && !line.match(/\d+/)) {
        issues.push({
          type: 'error',
          message: 'EXPOSE sem porta especificada',
          solution: 'Especifique a porta: EXPOSE 3000',
          line: index + 1,
          severity: 'high'
        });
      }
    });

    // Verificar COPY sem destino
    lines.forEach((line, index) => {
      if (line.trim().startsWith('COPY') || line.trim().startsWith('ADD')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 3) {
          issues.push({
            type: 'error',
            message: `${parts[0]} precisa de origem e destino`,
            solution: `Exemplo: ${parts[0]} origem destino`,
            line: index + 1,
            severity: 'high'
          });
        }
      }
    });

    // Verificar RUN apt-get update sem cleanup
    if (code.includes('apt-get update') && !code.includes('apt-get clean')) {
      issues.push({
        type: 'warning',
        message: 'apt-get update sem cleanup',
        solution: 'Adicione && apt-get clean && rm -rf /var/lib/apt/lists/*',
        severity: 'medium'
      });
    }

    // Verificar múltiplos CMD/ENTRYPOINT
    const cmdCount = (code.match(/^CMD\s+/gm) || []).length;
    if (cmdCount > 1) {
      issues.push({
        type: 'warning',
        message: `Múltiplos CMD encontrados (${cmdCount})`,
        solution: 'Apenas o último CMD será executado. Considere usar apenas um.',
        severity: 'medium'
      });
    }

    return issues;
  }

  analyzeYAML(code) {
    const issues = [];
    const lines = code.split('\n');
    
    // Verificar indentação (YAML usa espaços, não tabs)
    lines.forEach((line, index) => {
      if (line.includes('\t')) {
        issues.push({
          type: 'error',
          message: `Tab encontrado na linha ${index + 1}`,
          solution: 'YAML não permite tabs. Use espaços para indentação.',
          line: index + 1,
          severity: 'high'
        });
      }
    });

    // Verificar apiVersion e kind em Kubernetes
    if (!code.includes('apiVersion:')) {
      issues.push({
        type: 'error',
        message: 'apiVersion não especificado',
        solution: 'Adicione apiVersion: <versão> (ex: apps/v1, v1)',
        severity: 'high'
      });
    }

    if (!code.includes('kind:')) {
      issues.push({
        type: 'error',
        message: 'kind não especificado',
        solution: 'Adicione kind: <tipo> (ex: Deployment, Service, Pod)',
        severity: 'high'
      });
    }

    // Verificar metadata.name
    if (code.includes('kind:') && !code.includes('name:')) {
      issues.push({
        type: 'warning',
        message: 'metadata.name não especificado',
        solution: 'Adicione metadata.name para identificar o recurso',
        severity: 'medium'
      });
    }

    // Verificar portas em Service
    if (code.includes('kind: Service') && !code.includes('port:')) {
      issues.push({
        type: 'error',
        message: 'Service sem porta especificada',
        solution: 'Adicione a configuração de portas no Service',
        severity: 'high'
      });
    }

    return issues;
  }

  analyzeJSON(code) {
    const issues = [];
    
    try {
      JSON.parse(code);
    } catch (error) {
      const match = error.message.match(/position (\d+)/);
      const position = match ? parseInt(match[1]) : 0;
      const line = this.getLineNumber(code, position);
      
      let solution = '';
      if (error.message.includes('Unexpected token')) {
        const token = error.message.match(/'([^']+)'/)[1];
        if (token === ',') {
          solution = 'Remova a vírgula extra ou adicione um elemento após a vírgula';
        } else if (token === '{' || token === '[') {
          solution = 'Verifique se há chaves/colchetes não fechados anteriormente';
        } else {
          solution = 'Verifique a sintaxe JSON: aspas duplas são obrigatórias';
        }
      } else if (error.message.includes('Unexpected end')) {
        solution = 'JSON incompleto. Adicione os elementos faltantes.';
      }
      
      issues.push({
        type: 'error',
        message: error.message,
        solution: solution,
        line: line,
        severity: 'high'
      });
    }

    // Verificar chaves duplicadas
    const duplicateKeys = this.findDuplicateJSONKeys(code);
    duplicateKeys.forEach(key => {
      issues.push({
        type: 'warning',
        message: `Chave duplicada: "${key}"`,
        solution: `Remova ou renomeie uma das chaves "${key}"`,
        severity: 'medium'
      });
    });

    return issues;
  }

  analyzeSQL(code) {
    const issues = [];
    
    // Verificar SELECT sem FROM
    if (code.toUpperCase().includes('SELECT') && 
        !code.toUpperCase().includes('FROM') && 
        !code.toUpperCase().includes('INTO')) {
      issues.push({
        type: 'error',
        message: 'SELECT sem FROM',
        solution: 'Adicione FROM <tabela> após o SELECT',
        severity: 'high'
      });
    }

    // Verificar UPDATE sem WHERE (perigoso!)
    if (code.toUpperCase().includes('UPDATE') && 
        !code.toUpperCase().includes('WHERE')) {
      issues.push({
        type: 'warning',
        message: 'UPDATE sem WHERE - isso atualizará TODOS os registros!',
        solution: 'Adicione uma cláusula WHERE para filtrar os registros',
        severity: 'high'
      });
    }

    // Verificar DELETE sem WHERE (muito perigoso!)
    if (code.toUpperCase().includes('DELETE FROM') && 
        !code.toUpperCase().includes('WHERE')) {
      issues.push({
        type: 'warning',
        message: 'DELETE sem WHERE - isso deletará TODOS os registros!',
        solution: 'Adicione uma cláusula WHERE para especificar quais registros deletar',
        severity: 'high'
      });
    }

    // Verificar GROUP BY sem agregação
    if (code.toUpperCase().includes('GROUP BY') && 
        !code.toUpperCase().match(/COUNT\(|SUM\(|AVG\(|MAX\(|MIN\(/)) {
      issues.push({
        type: 'warning',
        message: 'GROUP BY sem função de agregação',
        solution: 'Use COUNT, SUM, AVG, MAX ou MIN com GROUP BY',
        severity: 'medium'
      });
    }

    return issues;
  }

  analyzeHTML(code) {
    const issues = [];
    
    // Verificar tags não fechadas
    const openTags = [];
    const tagRegex = /<\/?([a-zA-Z0-9-]+)(?:\s[^>]*)?>/g;
    let match;
    
    while ((match = tagRegex.exec(code)) !== null) {
      const fullTag = match[0];
      const tagName = match[1];
      
      if (!fullTag.startsWith('</')) {
        // Tag de abertura
        if (!this.isSelfClosingTag(tagName)) {
          openTags.push({ name: tagName, position: match.index });
        }
      } else {
        // Tag de fechamento
        if (openTags.length > 0 && openTags[openTags.length - 1].name === tagName) {
          openTags.pop();
        }
      }
    }
    
    openTags.forEach(tag => {
      issues.push({
        type: 'error',
        message: `Tag <${tag.name}> não foi fechada`,
        solution: `Adicione </${tag.name}> para fechar a tag`,
        line: this.getLineNumber(code, tag.position),
        severity: 'high'
      });
    });

    // Verificar alt em imagens
    if (code.includes('<img') && !code.includes('alt=')) {
      issues.push({
        type: 'warning',
        message: 'Tag <img> sem atributo alt',
        solution: 'Adicione alt="descrição" para acessibilidade',
        severity: 'medium'
      });
    }

    // Verificar doctype
    if (!code.trim().toLowerCase().startsWith('<!doctype')) {
      issues.push({
        type: 'warning',
        message: 'HTML sem declaração DOCTYPE',
        solution: 'Adicione <!DOCTYPE html> no início do arquivo',
        severity: 'low'
      });
    }

    return issues;
  }

  // Funções auxiliares
  getLineNumber(code, position) {
    const beforePosition = code.substring(0, position);
    return beforePosition.split('\n').length;
  }

  findLineWithIssue(code, char) {
    const lines = code.split('\n');
    let openCount = 0;
    for (let i = 0; i < lines.length; i++) {
      openCount += (lines[i].match(new RegExp('\\' + char, 'g')) || []).length;
      if (openCount > 0) return i + 1;
    }
    return 1;
  }

  extractFunctionBody(code, startLine) {
    const lines = code.split('\n');
    let body = '';
    let braceCount = 0;
    let started = false;
    
    for (let i = startLine; i < lines.length; i++) {
      body += lines[i];
      braceCount += (lines[i].match(/\{/g) || []).length;
      braceCount -= (lines[i].match(/\}/g) || []).length;
      if (started && braceCount === 0) break;
      if (braceCount > 0) started = true;
    }
    
    return body;
  }

  isSelfClosingTag(tagName) {
    const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
    return selfClosing.includes(tagName.toLowerCase());
  }

  findDuplicateJSONKeys(jsonStr) {
    const duplicates = [];
    const keyRegex = /"([^"]+)"\s*:/g;
    const keys = {};
    let match;
    
    while ((match = keyRegex.exec(jsonStr)) !== null) {
      const key = match[1];
      if (keys[key]) {
        duplicates.push(key);
      } else {
        keys[key] = true;
      }
    }
    
    return duplicates;
  }
}

module.exports = CodeAnalyzer;
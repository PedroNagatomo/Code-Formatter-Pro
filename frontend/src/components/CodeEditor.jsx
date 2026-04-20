import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { sql } from '@codemirror/lang-sql';
import { python } from '@codemirror/lang-python';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';

const CodeEditor = ({ 
  value, 
  onChange, 
  language = 'javascript', 
  height = '500px',
  readOnly = false,
  placeholder = ''
}) => {
  
  const getLanguageExtension = (lang) => {
    switch (lang) {
      case 'javascript':
      case 'typescript':
        return javascript({ jsx: true, typescript: lang === 'typescript' });
      case 'json':
        return json();
      case 'html':
        return html();
      case 'css':
        return css();
      case 'sql':
        return sql();
      case 'python':
        return python();
      case 'yaml':
      case 'dockerfile':
        return yaml();
      default:
        return javascript();
    }
  };

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      height={height}
      theme={oneDark}
      extensions={[getLanguageExtension(language)]}
      readOnly={readOnly}
      placeholder={placeholder}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        foldGutter: true,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        syntaxHighlighting: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        defaultKeymap: true,
        searchKeymap: true,
        historyKeymap: true,
      }}
      style={{
        fontSize: '14px',
        fontFamily: '"Fira Code", "Consolas", "Courier New", monospace',
      }}
    />
  );
};

export default CodeEditor;
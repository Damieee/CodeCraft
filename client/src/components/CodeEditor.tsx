import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      // Initialize the Monaco editor
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value,
        language: getMonacoLanguage(language),
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'JetBrains Mono, monospace',
        tabSize: 2,
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        wordWrap: 'on',
      });

      // Add change event listener
      monacoEditorRef.current.onDidChangeModelContent(() => {
        const newValue = monacoEditorRef.current?.getValue() || '';
        if (newValue !== value) {
          onChange(newValue);
        }
      });

      // Cleanup
      return () => {
        monacoEditorRef.current?.dispose();
      };
    }
  }, []);

  // Update the editor language when it changes
  useEffect(() => {
    if (monacoEditorRef.current) {
      monaco.editor.setModelLanguage(
        monacoEditorRef.current.getModel() as monaco.editor.ITextModel,
        getMonacoLanguage(language)
      );
    }
  }, [language]);

  // Update the editor value when it changes externally
  useEffect(() => {
    if (monacoEditorRef.current && value !== monacoEditorRef.current.getValue()) {
      monacoEditorRef.current.setValue(value);
    }
  }, [value]);
  
  const getMonacoLanguage = (lang: string): string => {
    switch (lang.toLowerCase()) {
      case 'python': return 'python';
      case 'java': return 'java';
      case 'javascript': return 'javascript';
      case 'html': return 'html';
      case 'css': return 'css';
      default: return 'plaintext';
    }
  };

  return <div ref={editorRef} className="w-full h-full" />;
}

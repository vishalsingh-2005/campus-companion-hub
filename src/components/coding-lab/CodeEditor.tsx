import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  language: string;
  readOnly?: boolean;
  height?: string;
}

const getLanguageExtension = (lang: string) => {
  switch (lang) {
    case 'c':
    case 'cpp':
      return cpp();
    case 'java':
      return java();
    case 'python':
      return python();
    default:
      return cpp();
  }
};

export function CodeEditor({
  code,
  onChange,
  language,
  readOnly = false,
  height = '400px',
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const createUpdateListener = useCallback(() => {
    return EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current) return;

    // Destroy existing view
    if (viewRef.current) {
      viewRef.current.destroy();
    }

    const state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        getLanguageExtension(language),
        oneDark,
        keymap.of([...defaultKeymap, indentWithTab]),
        createUpdateListener(),
        EditorState.readOnly.of(readOnly),
        EditorView.theme({
          '&': { height },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: '"JetBrains Mono", "Fira Code", monospace' },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
    };
  }, [language, readOnly, height]);

  // Update code when prop changes (for resetting)
  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== code) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: code,
        },
      });
    }
  }, [code]);

  return (
    <div
      ref={editorRef}
      className="rounded-lg overflow-hidden border border-border bg-[#282c34]"
    />
  );
}

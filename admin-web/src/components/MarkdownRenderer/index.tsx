import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CheckOutlined, CopyOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { useThemeStore } from '../../store/themeStore';
import './style.css';

interface MarkdownRendererProps {
  content: string;
  compact?: boolean;
}

const FOLD_LINE_THRESHOLD = 15;

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const { theme } = useThemeStore();
  const lineCount = code.split('\n').length;
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(lineCount > FOLD_LINE_THRESHOLD);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayCode = collapsed ? code.split('\n').slice(0, 5).join('\n') : code;

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span className="md-code-lang">{language || 'text'}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {lineCount > FOLD_LINE_THRESHOLD && (
            <button className="md-code-fold" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <><RightOutlined /> 展开 {lineCount} 行</> : <><DownOutlined /> 折叠</>}
            </button>
          )}
          <button className="md-code-copy" onClick={handleCopy}>
            {copied ? <><CheckOutlined /> 已复制</> : <><CopyOutlined /> 复制</>}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        style={theme === 'dark' ? oneDark : coy}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '0 0 8px 8px',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {displayCode}
      </SyntaxHighlighter>
      {collapsed && (
        <div className="md-code-expand" onClick={() => setCollapsed(false)}>
          点击展开全部 {lineCount} 行
        </div>
      )}
    </div>
  );
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, compact = false }) => {
  return (
    <div className={`md-renderer ${compact ? 'md-compact' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeStr = String(children).replace(/\n$/, '');

            if (match || codeStr.includes('\n')) {
              const lang = match ? match[1] : '';
              return <CodeBlock language={lang} code={codeStr} />;
            }

            return (
              <code className="md-inline-code" {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="md-table-wrapper">
                <table className="md-table">{children}</table>
              </div>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="md-link">
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return <blockquote className="md-blockquote">{children}</blockquote>;
          },
          img({ src, alt }) {
            return <img src={src} alt={alt || ''} className="md-image" loading="lazy" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

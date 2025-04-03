'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { twMerge } from 'tailwind-merge';

interface AccessibleMarkdownProps {
  content: string;
  className?: string;
}

/**
 * AccessibleMarkdown component
 * Renders markdown content with accessible styling and proper semantic HTML
 */
export const AccessibleMarkdown: React.FC<AccessibleMarkdownProps> = ({
  content,
  className = '',
}) => {
  // Use tailwind classes for styling
  const baseClass = 'prose prose-sm dark:prose-invert max-w-none';
  const combinedClassName = twMerge(baseClass, className);

  return (
    <div className={combinedClassName}>
      <ReactMarkdown
        components={{
          // Customize heading levels for proper document outline
          h1: ({ children, ...props }) => <h2 className="text-2xl font-bold mt-6 mb-4" {...props}>{children}</h2>,
          h2: ({ children, ...props }) => <h3 className="text-xl font-bold mt-5 mb-3" {...props}>{children}</h3>,
          h3: ({ children, ...props }) => <h4 className="text-lg font-bold mt-4 mb-2" {...props}>{children}</h4>,
          
          // Style links for better visibility
          a: ({ children, ...props }) => (
            <a
              className="text-primary underline hover:text-primary-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          
          // Style lists
          ul: ({ children, ...props }) => <ul className="list-disc pl-5 my-3" {...props}>{children}</ul>,
          ol: ({ children, ...props }) => <ol className="list-decimal pl-5 my-3" {...props}>{children}</ol>,
          
          // Style code blocks
          code: ({ children, ...props }) => (
            <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
          ),
          
          // Style blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-4 border-muted pl-4 italic my-4" {...props}>{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default AccessibleMarkdown;

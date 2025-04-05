'use client';

import React from 'react';

interface SkipToContentProps {
  contentId: string;
}

/**
 * A component that allows keyboard users to skip to the main content
 * This is an important accessibility feature for keyboard users
 */
export const SkipToContent: React.FC<SkipToContentProps> = ({ contentId }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const content = document.getElementById(contentId);
    if (content) {
      content.tabIndex = -1;
      content.focus();
      // Reset tabIndex after a short delay to avoid issues with focus management
      setTimeout(() => {
        if (content) {content.removeAttribute('tabindex');}
      }, 100);
    }
  };

  return (
    <a 
      href={`#${contentId}`} 
      className="absolute -left-[9999px] top-auto p-3 bg-primary text-primary-foreground focus:left-3 focus:top-3 focus:z-50 focus:h-auto focus:w-auto focus:overflow-auto"
      onClick={handleClick}
    >
      Skip to main content
    </a>
  );
};

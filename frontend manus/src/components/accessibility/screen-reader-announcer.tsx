'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ScreenReaderAnnouncerProps {
  message: string;
  assertive?: boolean;
  clearAfter?: number;
}

/**
 * A component that announces messages to screen readers
 * Uses ARIA live regions to make announcements without visual changes
 */
export const ScreenReaderAnnouncer: React.FC<ScreenReaderAnnouncerProps> = ({
  message,
  assertive = false,
  clearAfter = 5000,
}) => {
  const [mounted, setMounted] = useState(false);
  const [announcement, setAnnouncement] = useState(message);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Update announcement when message changes
  useEffect(() => {
    if (!message) {return;}
    
    // Set the message
    setAnnouncement(message);
    
    // Clear the message after specified time
    const timer = setTimeout(() => {
      setAnnouncement('');
    }, clearAfter);
    
    return () => clearTimeout(timer);
  }, [message, clearAfter]);

  // Only render on client-side
  if (!mounted) {return null;}

  return createPortal(
    <div 
      aria-live={assertive ? 'assertive' : 'polite'} 
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>,
    document.body
  );
};

// Global announcer state
let announcePolite: (message: string) => void = () => {};
let announceAssertive: (message: string) => void = () => {};

/**
 * Global announcer component that can be used anywhere in the app
 */
export const GlobalAnnouncer: React.FC = () => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  // Set up global announce functions
  useEffect(() => {
    announcePolite = setPoliteMessage;
    announceAssertive = setAssertiveMessage;
    
    return () => {
      announcePolite = () => {};
      announceAssertive = () => {};
    };
  }, []);

  return (
    <>
      <ScreenReaderAnnouncer message={politeMessage} assertive={false} />
      <ScreenReaderAnnouncer message={assertiveMessage} assertive={true} />
    </>
  );
};

// Export functions to announce messages
export const announce = {
  polite: (message: string) => announcePolite(message),
  assertive: (message: string) => announceAssertive(message),
};

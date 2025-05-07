import React from 'react';

// Helper type for email provider info
export type EmailProvider = {
  name: string;
  url: string;
  icon: React.ReactNode;
};

/**
 * Detects the email provider from an email address and returns provider information
 * @param email The email address to analyze
 * @returns EmailProvider object or null if provider is not recognized
 */
export const getEmailProviderInfo = (email: string): EmailProvider | null => {
  if (!email) return null;
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  // Define common email providers
  if (domain === 'gmail.com' || domain.endsWith('.googlemail.com')) {
    return {
      name: 'Gmail',
      url: 'https://mail.google.com/mail/u/0/',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="#EA4335">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
        </svg>
      )
    };
  } else if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com' || domain === 'msn.com') {
    return {
      name: 'Outlook',
      url: 'https://outlook.live.com/mail/0/inbox',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="#0078D4">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
        </svg>
      )
    };
  } else if (domain === 'yahoo.com' || domain.endsWith('.yahoo.com')) {
    return {
      name: 'Yahoo Mail',
      url: 'https://mail.yahoo.com/',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="#5F01D1">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
        </svg>
      )
    };
  } else if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') {
    return {
      name: 'iCloud Mail',
      url: 'https://www.icloud.com/mail/',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="#3693F3">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
        </svg>
      )
    };
  } else if (domain === 'protonmail.com' || domain === 'proton.me' || domain === 'pm.me') {
    return {
      name: 'ProtonMail',
      url: 'https://mail.proton.me/inbox',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="#8A6CFF">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
        </svg>
      )
    };
  } else if (domain === 'aol.com') {
    return {
      name: 'AOL Mail',
      url: 'https://mail.aol.com/',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="#31459B">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
        </svg>
      )
    };
  } else if (domain === 'zoho.com') {
    return {
      name: 'Zoho Mail',
      url: 'https://mail.zoho.com/',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="#F40000">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
        </svg>
      )
    };
  }

  // For company domains or other providers, we don't have a specific link
  return null;
};

/**
 * Component to render a list of common email provider links
 */
export const CommonEmailLinks = ({ className = '' }: { className?: string }) => (
  <div className={`flex flex-wrap gap-2 ${className}`}>
    <a 
      href="https://mail.google.com"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
    >
      Gmail
    </a>
    <a 
      href="https://outlook.live.com/mail/0/inbox"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
    >
      Outlook
    </a>
    <a 
      href="https://mail.yahoo.com"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
    >
      Yahoo
    </a>
    <a 
      href="https://www.icloud.com/mail"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
    >
      iCloud
    </a>
  </div>
); 
import React from 'react';

export interface Review {
  id: string;
  title: string;
  content: string;
  date: string;
}

export interface Movie {
  id: string;
  title: string;
  chineseTitle?: string;
  releaseYear: string;
  director?: string;
  country?: string;
  watchedDate: string; // YYYY-MM-DD
  rating: number; // 0-10
  genres: string[];
  
  // Personal Content
  userReview: string; // Long text / Script
  videoLink?: string; // URL to user's video
  
  // External Content
  externalReview?: string; // Pasted content from others
  externalLink?: string; // Source URL
  externalReviewAnnotation?: string; // User's comment on external content
  
  // Additional Content
  extraReviews?: Review[]; // Array of additional reviews/notes
  
  coverImage?: string; // Horizontal (User custom)
  posterImage?: string; // Vertical (Auto/Standard)
  screenshots?: string[]; // Array of screenshot base64 strings
  timestamp: number;
}

export type ViewState = 'library' | 'profile' | 'add' | 'details';

export interface NavItem {
  id: ViewState;
  label: string;
  icon: React.ReactNode;
}
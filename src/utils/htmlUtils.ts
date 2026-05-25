// Utility functions for handling HTML content in tickets

export const stripHtmlAndImages = (html: string): string => {
  if (!html) return '';
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove all image elements
  const images = tempDiv.querySelectorAll('img');
  images.forEach(img => img.remove());
  
  // Return only text content
  return tempDiv.textContent || tempDiv.innerText || '';
};

export const extractFirstImage = (html: string): string | null => {
  if (!html) return null;
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const firstImage = tempDiv.querySelector('img');
  return firstImage ? firstImage.src : null;
};

export const hasImages = (html: string): boolean => {
  if (!html) return false;
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  return tempDiv.querySelectorAll('img').length > 0;
};
import type { KeyboardEvent } from 'react';

// Spread on a non-button element (Card, Box, Typography, img…) that has an onClick,
// so it can be reached with Tab and activated with Enter/Space like a real button.
export const clickable = (onClick: () => void) => ({
  role: 'button',
  tabIndex: 0,
  onClick,
  onKeyDown: (event: KeyboardEvent) => {
    // Leave keys aimed at nested controls (buttons, inputs) to those controls
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }
});

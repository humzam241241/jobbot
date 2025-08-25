'use client';

import { useEffect } from 'react';

interface Props {
  onLoad: () => void;
}

export default function GoogleApiScript({ onLoad }: Props) {
  useEffect(() => {
    // Define the callback for when the API loads
    window.onGoogleApiLoad = onLoad;

    // Create and append the script
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js?onload=onGoogleApiLoad';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    // Cleanup
    return () => {
      document.body.removeChild(script);
      delete window.onGoogleApiLoad;
    };
  }, [onLoad]);

  return null;
}

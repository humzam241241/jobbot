export function applyTheme(theme: 'legacy'|'modern' = 'legacy') {
  if (typeof document !== 'undefined') {
    if (theme === 'modern') {
      document.documentElement.setAttribute('data-theme','modern');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
}

// Initialize with legacy theme on load
if (typeof window !== 'undefined') {
  applyTheme('legacy');
}

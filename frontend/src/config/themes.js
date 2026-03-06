export const ALLOWED_THEMES = ['light', 'corporate', 'nord', 'silk'];

export function resolveTheme(theme) {
  return ALLOWED_THEMES.includes(theme) ? theme : 'light';
}

export function applyTheme(theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', resolved);
  localStorage.setItem('cpdo-theme', resolved);
  return resolved;
}

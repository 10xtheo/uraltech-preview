(() => {
  const root = document.documentElement;
  const preference = matchMedia('(prefers-color-scheme: dark)');
  const key = 'uraltech-theme';
  let stored;
  try { stored = localStorage.getItem(key); } catch {}

  function apply() {
    const dark = stored === 'dark' || (stored !== 'light' && preference.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#161715' : '#f7f6f2');
    for (const button of document.querySelectorAll('[data-theme-switch]')) {
      button.setAttribute('aria-pressed', String(dark));
      button.title = dark ? 'Включить светлую тему' : 'Включить тёмную тему';
    }
  }

  apply();
  document.addEventListener('DOMContentLoaded', apply, { once: true });
  preference.addEventListener('change', apply);
  window.addEventListener('storage', (event) => {
    if (event.key !== key) return;
    stored = event.newValue;
    apply();
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest?.('[data-theme-switch]')) return;
    stored = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(key, stored); } catch {}
    apply();
  });
})();

function applyTheme() {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        return;
    }

    if (savedTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

applyTheme();

window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', applyTheme);
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

    const finalTheme = theme === 'dark' ? 'dark' : 'light';

    const menuIcon = document.querySelector('#menu');

    if (menuIcon) {
        menuIcon.src = finalTheme === 'dark'
            ? 'svg/menu2.svg'
            : 'svg/menu.svg';
    }

    root.setAttribute('data-theme', finalTheme);
}

applyTheme();

window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', applyTheme);
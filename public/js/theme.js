function applyTheme() {
    const savedTheme = localStorage.getItem('theme');

    let finalTheme;

    if (savedTheme === 'dark') {
        finalTheme = 'dark';
    } else if (savedTheme === 'light') {
        finalTheme = 'light';
    } else {
        finalTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    if (finalTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    const menuIcon = document.getElementById('menu');

    if (menuIcon) {
        menuIcon.src =
            finalTheme === 'dark'
                ? 'svg/menu2.svg'
                : 'svg/menu.svg';
    }
}

applyTheme();

window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', applyTheme);
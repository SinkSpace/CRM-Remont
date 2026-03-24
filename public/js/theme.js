(function () {
    const root = document.documentElement;
    const storageKey = 'theme';
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function getSavedTheme() {
        const theme = localStorage.getItem(storageKey);
        return theme === 'light' || theme === 'dark' ? theme : null;
    }

    function getPreferredTheme() {
        return mediaQuery.matches ? 'dark' : 'light';
    }

    function applyTheme(theme, persist = true) {
        const finalTheme = theme === 'dark' ? 'dark' : 'light';
        root.setAttribute('data-theme', finalTheme);
        if (persist) {
            localStorage.setItem(storageKey, finalTheme);
        }
        document.querySelectorAll('[data-theme-option]').forEach(button => {
            button.classList.toggle('is-active', button.dataset.themeOption === finalTheme);
        });
        const indicator = document.querySelector('[data-theme-current]');
        if (indicator) {
            indicator.textContent = finalTheme === 'dark' ? 'Тёмная тема активна' : 'Светлая тема активна';
        }
    }

    window.applyTheme = applyTheme;
    applyTheme(getSavedTheme() || getPreferredTheme(), false);

    if (!getSavedTheme()) {
        mediaQuery.addEventListener('change', (event) => {
            if (!getSavedTheme()) {
                applyTheme(event.matches ? 'dark' : 'light', false);
            }
        });
    }

    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-theme-option]');
        if (!button) return;
        applyTheme(button.dataset.themeOption);
    });

    document.addEventListener('DOMContentLoaded', () => {
        const settingsCard = document.getElementById('themeSettingsCard');
        if (settingsCard) {
            settingsCard.innerHTML = `
                <div class="settings-theme-card">
                    <strong>Оформление интерфейса</strong>
                    <span class="helper-text" data-theme-current></span>
                    <div class="settings-theme-row">
                        <button type="button" class="theme-toggle-button" data-theme-option="light">Светлая</button>
                        <button type="button" data-theme-option="dark">Тёмная</button>
                    </div>
                    <p class="helper-text">Тема сохраняется в браузере и применяется на всех страницах.</p>
                </div>
            `;
        }

        applyTheme(getSavedTheme() || getPreferredTheme(), false);
    });
})();

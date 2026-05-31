const tabButtons = document.querySelectorAll('.settings-tab');
const tabPanels = document.querySelectorAll('.settings-panel');

function openSettingsTab(tabName) {
    tabButtons.forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.tab === tabName
        );
    });

    tabPanels.forEach(panel => {
        panel.classList.toggle(
            'active',
            panel.id === `tab-${tabName}`
        );
    });
}

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        openSettingsTab(button.dataset.tab);
    });
});

const user = JSON.parse(localStorage.getItem('user'));

if (!user || user.role !== 'admin') {
    alert('Доступ запрещён');
    window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', () => {
    openSettingsTab('stats');
    loadAdminData();
    bindAdminSettings();
});

async function loadAdminData() {
    const res = await fetch(`/api/admin/dashboard?admin_id=${user.id}`);
    const data = await res.json();

    if (!res.ok) {
        alert(data.error || 'Ошибка загрузки админ-панели');
        return;
    }

    renderStats(data.stats);
    renderCompanies(data.companies);
    renderUsers(data.users);
    renderAdminSettings(data.settings || {});
}

function renderStats(stats) {
    document.getElementById('adminStats').innerHTML = `
        <p>Компаний: ${stats.companies_count}</p>
        <p>Пользователей: ${stats.users_count}</p>
    `;
}

function renderCompanies(companies) {
    const container = document.getElementById('companiesList');
    container.innerHTML = '';

    companies.forEach(company => {
        const div = document.createElement('div');
        div.className = 'company-card';

        div.innerHTML = `
            <h3>${company.name || 'Без названия'}</h3>
            <p>ID: ${company.id}</p>
            <p>Владелец: ${company.owner_email || '—'}</p>
            <p>Пользователей: ${company.users_count}</p>
        `;

        container.appendChild(div);
    });
}

function renderUsers(users) {
    const container = document.getElementById('usersList');
    container.innerHTML = '';

    users.forEach(item => {
        const div = document.createElement('div');
        div.className = 'user-card';

        div.innerHTML = `
            <h3>${item.email}</h3>
            <p>Имя: ${item.display_name || '—'}</p>
            <p>Роль: ${item.role}</p>
            <p>Компания ID: ${item.company_id || '—'}</p>
            <p>Статус: ${item.is_active ? 'Активен' : 'Отключён'}</p>
            <button ${item.id === user.id ? 'disabled' : ''}>
                ${item.is_active ? 'Отключить' : 'Включить'}
            </button>
        `;

        div.querySelector('button').addEventListener('click', () => {
            toggleUser(item.id, !item.is_active);
        });

        container.appendChild(div);
    });
}

async function toggleUser(userId, isActive) {
    const res = await fetch(`/api/admin/users/${userId}/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            admin_id: user.id,
            is_active: isActive
        })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error || 'Ошибка изменения пользователя');
        return;
    }

    loadAdminData();
}

function renderAdminSettings(settings = {}) {
    document.getElementById('aiPromptInput').value =
        settings.ai_prompt || 'Ответьте как консультант по ремонту техники, не используя Markdown разметку.';

    document.getElementById('aiModelInput').value =
        settings.ai_model || 'GigaChat-2';

    document.getElementById('aiEnabledInput').checked =
        settings.ai_enabled !== false;

    document.getElementById('registrationEnabledInput').checked =
        settings.registration_enabled !== false;
}

function bindAdminSettings() {
    const aiButton = document.getElementById('saveAiSettingsButton');
    const systemButton = document.getElementById('saveSystemSettingsButton');

    if (aiButton) {
        aiButton.onclick = saveAdminSettings;
    }

    if (systemButton) {
        systemButton.onclick = saveAdminSettings;
    }
}

async function saveAdminSettings() {
    const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            admin_id: user.id,
            ai_prompt: document.getElementById('aiPromptInput').value.trim(),
            ai_model: document.getElementById('aiModelInput').value.trim(),
            ai_enabled: document.getElementById('aiEnabledInput').checked,
            registration_enabled: document.getElementById('registrationEnabledInput').checked
        })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error || 'Ошибка сохранения настроек');
        return;
    }

    alert('Настройки сохранены');
    loadAdminData();
}
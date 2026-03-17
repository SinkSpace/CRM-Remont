const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
    window.location.href = '/join';
}

document.addEventListener('DOMContentLoaded', () => {
    loadLogs();
});

async function loadLogs() {
    try {
        const response = await fetch(`/api/logs/${user.id}`);
        const logs = await response.json();

        if (!response.ok) {
            throw new Error(logs.error || 'Ошибка загрузки логов');
        }

        renderLogs(logs);
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        alert(error.message);
    }
}

function renderLogs(logs) {
    const container = document.getElementById('logsList');
    if (!container) return;

    container.innerHTML = '';

    if (!logs.length) {
        container.innerHTML = '<p>Логов пока нет</p>';
        return;
    }

    logs.forEach(log => {
        const card = document.createElement('div');
        card.className = 'log-card';

        const who = log.display_name || log.email || 'Система';
        const when = formatDateTime(log.created_at);

        card.innerHTML = `
            <h3>${escapeHtml(log.title)}</h3>
            <p><strong>${escapeHtml(who)}</strong></p>
            <p>${escapeHtml(when)}</p>
            <pre>${escapeHtml(JSON.stringify(log.details || {}, null, 2))}</pre>
        `;

        container.appendChild(card);
    });
}

function formatDateTime(value) {
    const date = new Date(value);
    if (isNaN(date)) return '';
    return date.toLocaleString('ru-RU');
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
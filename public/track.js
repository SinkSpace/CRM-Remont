const input = document.getElementById('search');
const button = document.getElementById('filter');
const container = document.getElementById('hm');

button.addEventListener('click', addTracking);
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTracking();
});

async function addTracking() {
    const trackingNumber = input.value.trim();

    if (!trackingNumber) {
        alert('Введите трек-код');
        return;
    }

    button.disabled = true;
    button.textContent = 'Загрузка...';

    try {
        const response = await fetch('/api/trackings/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tracking_number: trackingNumber,
                courier_code: 'auto'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при добавлении трека');
        }

        renderTrackingCard(data);
        input.value = '';
    } catch (error) {
        console.error(error);
        alert(error.message || 'Не удалось получить данные');
    } finally {
        button.disabled = false;
        button.textContent = 'Добавить';
    }
}

function renderTrackingCard(data) {
    const title = data.title || 'Посылка';
    const trackingNumber = data.tracking_number || 'Без номера';
    const status = data.status_text || 'Статус неизвестен';

    const card = document.createElement('div');
    card.innerHTML = `
        <section>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(trackingNumber)}</p>
        </section>
        <p>${escapeHtml(status)}</p>
    `;

    container.prepend(card);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
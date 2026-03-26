const user = JSON.parse(localStorage.getItem('user'));
if (!user) window.location.href = '/join';

const search = document.getElementById('search');
let archiveTasks = [];

search.addEventListener('input', renderArchiveTasks);

document.addEventListener('DOMContentLoaded', () => {
    loadArchiveTasks();
});

function loadArchiveTasks() {
    fetch(`/api/archive/${user.company_id}`)
        .then(res => res.json())
        .then(data => {
            archiveTasks = Array.isArray(data) ? data : [];
            renderArchiveTasks();
        })
        .catch(error => {
            console.error('Ошибка загрузки архива:', error);
            alert('Ошибка загрузки архива');
        });
}

function renderArchiveTasks() {
    const table = document.getElementById('archiveTable');
    const noTask = document.getElementById('noTask');
    const noSearch = document.getElementById('noSearch');

    const repSearch = (search?.value || '').trim().toLowerCase();

    if (!archiveTasks.length) {
        table.style.visibility = 'hidden';
        noTask.style.visibility = 'visible';
        noSearch.style.visibility = 'hidden';
        return;
    }

    noTask.style.visibility = 'hidden';
    table.querySelectorAll('.mainTable').forEach(row => row.remove());

    const filtered = archiveTasks.filter(task =>
        repSearch === '' ||
        String(task.model ?? '').toLowerCase().includes(repSearch) ||
        String(task.crush ?? '').toLowerCase().includes(repSearch) ||
        String(task.worker ?? '').toLowerCase().includes(repSearch) ||
        String(task.customer ?? '').toLowerCase().includes(repSearch)
    );

    if (!filtered.length) {
        table.style.visibility = 'hidden';
        noSearch.style.visibility = 'visible';
        return;
    }

    table.style.visibility = 'visible';
    noSearch.style.visibility = 'hidden';

    filtered.forEach((task, index) => {
        const tr = document.createElement('section');
        tr.classList.add('mainTable');

        tr.innerHTML = `
            <div class="tdNumber">${index + 1}</div>
            <div class="tdModel">${escapeHtml(task.model || '')}</div>
            <div class="tdStatus">${escapeHtml(task.status || '')}</div>
            <div class="tdBug">${escapeHtml(task.crush || '')}</div>
            <div class="tdPrice">${task.price ?? ''}</div>
            <div class="tdWorker">${escapeHtml(task.worker || '')}</div>
            <div class="tdBegin">${formattedDate(task.acceptDate)}</div>
            <div class="days-cell">${formattedDateTime(task.archived_at)}</div>
            <div class="tdEdit">
                <button onclick="unarchiveTask(${task.id})">↩️</button>
                <button onclick="deleteTask(${task.id})">❌</button>
            </div>
        `;

        table.appendChild(tr);
    });
}

function unarchiveTask(id) {
    if (!confirm('Восстановить заказ из архива?')) return;

    fetch(`/api/orders/${id}/unarchive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            company_id: user.company_id,
            user_id: user.id
        })
    })
    .then(async res => {
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Ошибка восстановления');
        }
        return data;
    })
    .then(() => loadArchiveTasks())
    .catch(error => {
        console.error('Ошибка восстановления:', error);
        alert(error.message);
    });
}

function formattedDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (isNaN(date)) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
}

function formattedDateTime(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
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

/* удаление задачи */
function deleteTask(id) {
if (confirm("Удалить?")) {
    fetch(`/orders/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            company_id: user.company_id
        })
    })
    .then(() => {
        loadTasks();
    })
    .catch(error => console.error('Ошибка при удалении:', error));
}
}
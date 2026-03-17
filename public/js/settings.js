const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
    window.location.href = '/join';
}

const tabButtons = document.querySelectorAll('.settings-tab');
const tabPanels = document.querySelectorAll('.settings-panel');

function openSettingsTab(tabName) {
    tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabName);
    });

    tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
}

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        openSettingsTab(button.dataset.tab);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    openSettingsTab('company');
    loadProfile();
    loadWorkers();
    bindProfileSave();
    bindWorkerCreate();
    loadDevices();
    bindDeviceCreate();
    loadStatuses();
    bindStatusCreate();
});

async function loadDevices() {
    try {
        const response = await fetch(`/api/devices/${user.id}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки устройств');
        }

        renderDevices(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error('Ошибка загрузки устройств:', error);
        alert(error.message);
    }
}

function renderDevices(devices) {
    const container = document.getElementById('devicesList');
    if (!container) return;

    container.innerHTML = '';

    if (devices.length === 0) {
        container.innerHTML = '<p>Устройств пока нет</p>';
        return;
    }

    devices.forEach(device => {
        const card = document.createElement('div');
        card.className = 'device-card';

        card.innerHTML = `
            <span class="device-name">${escapeHtml(device.name || '')}</span>
            <button class="delete-device-button">Удалить</button>
        `;

        const deleteButton = card.querySelector('.delete-device-button');
        deleteButton.addEventListener('click', () => deleteDevice(device.id));

        container.appendChild(card);
    });
}

function bindDeviceCreate() {
    const addDeviceButton = document.getElementById('addDeviceButton');
    if (!addDeviceButton) return;

    addDeviceButton.addEventListener('click', createDevice);
}

async function createDevice() {
    try {
        const nameInput = document.getElementById('deviceNameInput');
        const name = nameInput.value.trim();

        if (!name) {
            alert('Название устройства обязательно');
            return;
        }

        const response = await fetch('/api/devices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: user.id,
                name
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка добавления устройства');
        }

        nameInput.value = '';
        await loadDevices();
    } catch (error) {
        console.error('Ошибка добавления устройства:', error);
        alert(error.message);
    }
}

async function deleteDevice(id) {
    try {
        if (!confirm('Удалить устройство?')) return;

        const response = await fetch(`/api/devices/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка удаления устройства');
        }

        await loadDevices();
    } catch (error) {
        console.error('Ошибка удаления устройства:', error);
        alert(error.message);
    }
}

async function loadProfile() {
    try {
        const response = await fetch(`/api/profile/${user.id}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки профиля');
        }

        const displayNameInput = document.getElementById('displayName');
        const shopNameInput = document.getElementById('shopName');
        const phoneInput = document.getElementById('phone');

        if (displayNameInput) displayNameInput.value = data.display_name || '';
        if (shopNameInput) shopNameInput.value = data.shop_name || '';
        if (phoneInput) phoneInput.value = data.phone || '';
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        alert(error.message);
    }
}

function bindProfileSave() {
    const saveProfileButton = document.getElementById('saveProfileButton');

    if (!saveProfileButton) return;

    saveProfileButton.addEventListener('click', async () => {
        try {
            const display_name = document.getElementById('displayName').value.trim();
            const shop_name = document.getElementById('shopName').value.trim();
            const phone = document.getElementById('phone').value.trim();

            if (!display_name) {
                alert('Название обязательно');
                return;
            }

            const response = await fetch(`/api/profile/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    display_name,
                    shop_name,
                    phone
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка сохранения профиля');
            }

            const updatedUser = {
                ...user,
                display_name,
                shop_name,
                phone
            };

            localStorage.setItem('user', JSON.stringify(updatedUser));
            alert('Профиль сохранён');
        } catch (error) {
            console.error('Ошибка сохранения профиля:', error);
            alert(error.message);
        }
    });
}

/* ---------------- Сотрудники ---------------- */

async function loadWorkers() {
    try {
        const response = await fetch(`/api/workers/${user.id}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки сотрудников');
        }

        renderWorkers(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error('Ошибка загрузки сотрудников:', error);
        alert(error.message);
    }
}

function renderWorkers(workers) {
    const container = document.getElementById('workersList');
    if (!container) return;

    container.innerHTML = '';

    if (workers.length === 0) {
        container.innerHTML = '<p>Сотрудников пока нет</p>';
        return;
    }

    workers.forEach(worker => {
        const card = document.createElement('div');
        card.className = 'worker-card';
        card.dataset.id = worker.id;

        card.innerHTML = `
            <input class="worker-name" value="${escapeHtml(worker.name || '')}">
            <select class="worker-role">
                <option ${worker.role === 'Владелец' ? 'selected' : ''}>Владелец</option>
                <option ${worker.role === 'Менеджер' ? 'selected' : ''}>Менеджер</option>
                <option ${worker.role === 'Сотрудник' ? 'selected' : ''}>Сотрудник</option>
            </select>
            <input class="worker-phone" value="${escapeHtml(worker.phone || '')}" placeholder="Телефон">
            <input class="worker-email" value="${escapeHtml(worker.email || '')}" placeholder="Email">
            <label>
                <input class="worker-active" style="width: auto; height: auto" type="checkbox" ${worker.is_active ? 'checked' : ''}>
                Активен
            </label>
            <div class="worker-actions">
                <button class="save-worker-button">Сохранить</button>
                <button class="delete-worker-button">Удалить</button>
            </div>
        `;

        const saveButton = card.querySelector('.save-worker-button');
        const deleteButton = card.querySelector('.delete-worker-button');

        saveButton.addEventListener('click', () => updateWorker(worker.id, card));
        deleteButton.addEventListener('click', () => deleteWorker(worker.id));

        container.appendChild(card);
    });
}

function bindWorkerCreate() {
    const addWorkerButton = document.getElementById('addWorkerButton');
    if (!addWorkerButton) return;

    addWorkerButton.addEventListener('click', createWorker);
}

async function createWorker() {
    try {
        const nameInput = document.getElementById('workerNameInput');
        const roleInput = document.getElementById('workerRoleInput');
        const phoneInput = document.getElementById('workerPhoneInput');
        const emailInput = document.getElementById('workerEmailInput');

        const name = nameInput.value.trim();
        const role = roleInput.value;
        const phone = phoneInput.value.trim();
        const email = emailInput.value.trim();

        if (!name) {
            alert('Имя сотрудника обязательно');
            return;
        }

        const response = await fetch('/api/workers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: user.id,
                name,
                role,
                phone,
                email
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка добавления сотрудника');
        }

        nameInput.value = '';
        roleInput.value = 'Сотрудник';
        phoneInput.value = '';
        emailInput.value = '';

        await loadWorkers();
    } catch (error) {
        console.error('Ошибка добавления сотрудника:', error);
        alert(error.message);
    }
}

async function updateWorker(id, card) {
    try {
        const name = card.querySelector('.worker-name').value.trim();
        const role = card.querySelector('.worker-role').value;
        const phone = card.querySelector('.worker-phone').value.trim();
        const email = card.querySelector('.worker-email').value.trim();
        const is_active = card.querySelector('.worker-active').checked;

        if (!name) {
            alert('Имя сотрудника обязательно');
            return;
        }

        const response = await fetch(`/api/workers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                role,
                phone,
                email,
                is_active
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка обновления сотрудника');
        }

        alert('Сотрудник сохранён');
        await loadWorkers();
    } catch (error) {
        console.error('Ошибка обновления сотрудника:', error);
        alert(error.message);
    }
}

async function deleteWorker(id) {
    try {
        if (!confirm('Удалить сотрудника?')) return;

        const response = await fetch(`/api/workers/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка удаления сотрудника');
        }

        await loadWorkers();
    } catch (error) {
        console.error('Ошибка удаления сотрудника:', error);
        alert(error.message);
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
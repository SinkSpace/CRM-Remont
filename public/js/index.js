let editIndex = null; /* переключатель режима редактирования */
let sortDir = 1; /* сортировка по возрастанию или убыванию */
let oldVisual = null;
let isSyncling = false; /* синхронизация дат */
let statuses = []; /* динамический список статусов */

const user = JSON.parse(localStorage.getItem('user'));

if (!user) window.location.href = '/join';

async function loadWorkersToSelect() {
    try {
        const response = await fetch(`/api/workers/${user.company_id}`);
        const workers = await response.json();

        if (!response.ok) {
            throw new Error('Ошибка загрузки сотрудников');
        }

        const select = document.getElementById('workerInput');
        if (!select) return;

        // очищаем, но оставляем placeholder
        select.innerHTML = '<option value="">Выберите сотрудника</option>';

        workers
            .filter(w => w.is_active)
            .forEach(worker => {
                const option = document.createElement('option');
                option.value = worker.name; // пока используем имя
                option.textContent = `${worker.name} (${worker.role})`;
                select.appendChild(option);
            });

    } catch (error) {
        console.error('Ошибка загрузки сотрудников:', error);
    }
}

function getStatusOptionsHtml(selectedStatus = '') {
    const fallback = [
        'Принят',
        'В работе',
        'Ждёт запчастей',
        'На согласовании',
        'Без ремонта',
        'Сделан',
        'Отменён'
    ];

    const list = Array.isArray(statuses) && statuses.length ? statuses : fallback;

    return list
        .map(status => `
            <option value="${status.replace(/"/g, '&quot;')}" ${status === selectedStatus ? 'selected' : ''}>
                ${status}
            </option>`)
        .join('');
}

function renderStatusSelectors() {
    const statusSelect = document.getElementById('statusInput');
    const filterSelect = document.getElementById('filter');

    if (statusSelect) {
        statusSelect.innerHTML = getStatusOptionsHtml();
    }

    if (filterSelect) {
        filterSelect.innerHTML = '<option>Все статусы</option>' + getStatusOptionsHtml();
    }
}

async function loadStatuses() {
    try {
        const response = await fetch(`/api/statuses/${user.company_id}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки статусов');
        }

        statuses = Array.isArray(data) ? data.map(s => s.name) : [];
        renderStatusSelectors();
    } catch (error) {
        console.error('Ошибка загрузки статусов:', error);
        statuses = [];
        renderStatusSelectors();
    }
}

/* Модальное окно */
const closeButton = document.getElementById('closeButton'); /* взаимодействие с кнопкой закрытия */
const modal = document.getElementById('modal'); /* взаимодействие с модальным окном */
const addOrder = document.getElementById('addOrder'); /* взаимодействие с кнопкой открытия */
const complete = document.getElementById('filter');
const search = document.getElementById('search');

closeButton.onclick = () => modal.style.display = 'none';
addOrder.onclick = () => {
    clearForm();
    modal.style.display = 'flex';
};
modal.onclick = (event /* объект события */) => {if (event.target === modal) modal.style.display = 'none'};

/* Добавление в таблицу */
const phoneInput = document.getElementById('phoneInput');
const customerInput = document.getElementById('customerInput');
const workerInput = document.getElementById('workerInput');
const deviceInput = document.getElementById('deviceInput');
const modalButton = document.getElementById('modal-button');
const orderTable = document.getElementById('orderTable');
const modelInput = document.getElementById('modelInput');
const statusInput = document.getElementById('statusInput');
const SNInput = document.getElementById('SNInput');
const crushInput = document.getElementById('crushInput');
const preInput = document.getElementById('preInput');
const priceInput = document.getElementById('priceInput');
const noteInput = document.getElementById('noteInput');
const dateInput = document.getElementById('dateInput');
const deadline = document.getElementById('deadline');
const togglePriceCalc = document.getElementById('togglePriceCalc');
const priceCalcBox = document.getElementById('priceCalcBox');

deadline.addEventListener('input', function () {
    if (isSyncling) return;

    const days = parseInt(this.value);
    if (isNaN(days)) return;

    isSyncling = true;

    const today = new Date();
    today.setHours(0,0,0,0);
    today.setDate(today.getDate() + days);

    dateInput.value = today.toISOString().split('T')[0];

    isSyncling = false;
});

dateInput.addEventListener('input', function () {
    if (isSyncling) return;
    if (!this.value) return;

    isSyncling = true;

    const end = new Date(this.value);
    end.setHours(0,0,0,0);

    const today = new Date();
    today.setHours(0,0,0,0);

    deadline.value = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    isSyncling = false;
});

/* Данные и слушатели */
let tasks = [];

complete.addEventListener('change', function(event) { renderTasks() });
search.addEventListener('input', renderTasks);
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadWorkersToSelect();
    loadStatuses();
    loadDeviceHints();
    deviceInput.addEventListener('input', () => loadDeviceHints(deviceInput.value));

    if (togglePriceCalc && priceCalcBox) {
        togglePriceCalc.addEventListener('click', () => {
            const isHidden = priceCalcBox.style.display === 'none';
            priceCalcBox.style.display = isHidden ? 'flex' : 'none';
            togglePriceCalc.textContent = isHidden ? '−' : '+';
        });
    }

    getPriceParts().forEach(input => {
        input.addEventListener('input', calculatePriceFromParts);
    });
});

modalButton.onclick = () => {
    if (modelInput.value.trim() === '') {
        alert('Поле "Модель" не может быть пустым');
        return;
    }

    if (crushInput.value.trim() === '') {
        alert('Поле "Неисправность" не может быть пустым');
        return;
    }

    if (priceInput.value.trim() === '') {
        alert('Поле "Цена" не может быть пустым');
        return;
    }

    if (workerInput.value.trim() === '') {
        alert('Поле "Исполнитель" не может быть пустым');
        return;
    }

    if (editIndex !== null) {
        updateTask(editIndex);
    } else {
        addTask();
    }

    clearForm();
    modal.style.display = 'none';
};

/* сортировка */
document.getElementById('modelHead').onclick = () => sortTasks('model', document.getElementById('modelHead'));
document.getElementById('statusHead').onclick = () => sortTasks('status', document.getElementById('statusHead'));
document.getElementById('bugHead').onclick = () => sortTasks('crush', document.getElementById('bugHead'));
document.getElementById('priceHead').onclick = () => sortTasks('price', document.getElementById('priceHead'));
document.getElementById('workerHead').onclick = () => sortTasks('worker', document.getElementById('workerHead'));
document.getElementById('dateBeginHead').onclick = () => sortTasks('acceptDate', document.getElementById('dateBeginHead'));
document.getElementById('dateHead').onclick = () => sortTasks('acceptDate', document.getElementById('dateHead'));

/******** ФУНКЦИИ *********/

/* добавление задачи */
function addTask() {
    const modelSecurity = escapeHTML(modelInput.value.trim());
    const crushSecurity = escapeHTML(crushInput.value.trim());
    const workerSecurity = escapeHTML(workerInput.value.trim());
    const noteSecurity = escapeHTML(noteInput.value.trim());
    const customerSecurity = escapeHTML(customerInput.value.trim());
    const phoneSecurity = escapeHTML(phoneInput.value.trim());
    const SNSecurity = escapeHTML(SNInput.value.trim());

    const task = {
        user_id: user.id,
        company_id: user.company_id,
        phone: phoneSecurity,
        customer: customerSecurity,
        worker: workerSecurity,
        device: deviceInput.value,
        model: modelSecurity,
        SN: SNSecurity,
        status: statusInput.value,
        price: Number(priceInput.value) || 0,
        pre: Number(preInput.value) || 0,
        acceptDate: dateInput.value,
        deadline: Number(deadline.value) || 0,
        crush: crushSecurity,
        note: noteSecurity
    };

    fetch('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    })
    .then(res => res.json())
    .then(data => {
        console.log('Задача добавлена на сервер', data);
        loadTasks();
    })
    .catch(error => console.error('Ошибка при добавлении:', error));
}

/* обработка памяти */
function renderTasks() { 
    const table = document.getElementById('orderTable');
    const noTask = document.getElementById('noTask');
    const noSearch = document.getElementById('noSearch');

    const repSearch = (search?.value || '').trim().toLowerCase();
    const statusFilter = complete?.value || 'Все статусы';

    if (!Array.isArray(tasks) || tasks.length === 0) {
        table.style.visibility = "hidden";
        noTask.style.visibility = "visible";
        noSearch.style.visibility = "hidden";
        return;
    }

    noTask.style.visibility = "hidden";

    /* очистка строк */
    table.querySelectorAll('.mainTable').forEach(row => row.remove());

    const filtered = tasks.filter(task => {
    const okStatus = (statusFilter === 'Все статусы') || (task.status === statusFilter);

    const okSearch =
    repSearch === '' ||
    String(task.model ?? '').toLowerCase().includes(repSearch) ||
    String(task.crush ?? '').toLowerCase().includes(repSearch) ||
    String(task.price ?? '').toLowerCase().includes(repSearch) ||
    String(task.worker ?? '').toLowerCase().includes(repSearch);

    return okStatus && okSearch;
    });

    if (filtered.length === 0) {
        table.style.visibility = "hidden";
        noSearch.style.visibility = "visible";
        return;
    }

    table.style.visibility = "visible";
    noSearch.style.visibility = "hidden";

    filtered.forEach((task, index) => {
        const tr = document.createElement('section');
        tr.classList.add('mainTable');
        const daysLeft = Number(task.deadline) || 0;
        tr.innerHTML = /* создание ячеек */ `
        <div class="tdNumber">${index + 1}</div>
        <div class="tdModel">${returnHTML(task.model)}</div>
        <div class="tdStatus"><select class="statusInput">${getStatusOptionsHtml(task.status)}</select></div>
        <div class="tdBug">${returnHTML(task.crush)}</div>
        <div class="tdPrice">${task.price}</div>
        <div class="tdWorker">${returnHTML(task.worker)}</div>
        <div class="tdBegin">${formattedDate(task.acceptDate)}</div>
        <div class="days-cell">${daysLeft} дн.</div>
        <div class="tdEdit">
            <button onclick="editTask(${task.id})">📝</button>
            <button onclick="generateDocument(${task.id})">📄</button>
            <button onclick="archiveTask(${task.id})">✅</button>
        </div>
        `;

        const select = tr.querySelector('.statusInput');

        select.addEventListener('change', function () {
            const newStatus = this.value;

            fetch(`/orders/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...task,
                    status: newStatus,
                    company_id: user.company_id,
                    user_id: user.id
                })
            })
            .then(async res => {
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Ошибка обновления статуса');
                }
                return data;
            })
            .then(() => loadTasks())
            .catch(err => {
                console.error('Ошибка обновления статуса:', err);
                alert(err.message);
            });
        });

        if (daysLeft < 0) tr.querySelector('.days-cell').style.color = "red"; /* выбор текущего сектора */

        document.getElementById('orderTable').appendChild(tr); /* закрывающий аргумент строки таблицы */
    });
}

/* редактирование задачи */
function editTask(id) {
    const task = tasks.find(t => t.id == id);
    if (!task) return;

    phoneInput.value = returnHTML(task.phone || '');
    customerInput.value = returnHTML(task.customer || '');
    workerInput.value = returnHTML(task.worker || '');
    deviceInput.value = task.device || 'Смартфон';
    modelInput.value = returnHTML(task.model || '');
    SNInput.value = returnHTML(task.SN || '');
    statusInput.value = task.status || 'Принят';
    priceInput.value = task.price ?? '';
    preInput.value = task.pre ?? '';
    if (task.acceptDate) {
        const d = new Date(task.acceptDate);
        if (!isNaN(d)) {
            dateInput.value = d.toISOString().split('T')[0];
        }
    };
    deadline.value = Number(task.deadline) || '';
    crushInput.value = returnHTML(task.crush || '');
    noteInput.value = returnHTML(task.note || '');

    editIndex = id;
    modalButton.textContent = 'Сохранить';
    modal.style.display = 'flex';
}

/* очистка даты */
function normalize(date) {
    date.setHours(0,0,0,0);
    return date;
}

function calcDays(dateValue) {
    if (!dateValue) return '';

    const end = normalize(new Date(dateValue));
    const today = normalize(new Date());

    if (isNaN(end)) return '';

    const diffMs = end - today;

    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
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

/* HTML-инъекция */
function escapeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function returnHTML(str) {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
}

/* очистка форм */
function clearForm() {
    phoneInput.value = '';
    customerInput.value = '';
    workerInput.value = '';
    deviceInput.value = '';
    modelInput.value = '';
    SNInput.value = '';
    statusInput.value = (statuses.length ? statuses[0] : 'Принят');
    priceInput.value = '';
    preInput.value = '';
    deadline.value = '';
    dateInput.value = '';
    crushInput.value = '';
    noteInput.value = '';

    clearPriceCalculator();

    editIndex = null;
    modalButton.textContent = 'Добавить';
}

/* сортировка */
function sortTasks(field, visual) {

    if (oldVisual) {
        oldVisual.textContent = oldVisual.textContent.replace('⬇️', '');
        oldVisual.textContent = oldVisual.textContent.replace('⬆️', '');
    }

    sortDir *= -1;

    if (sortDir != 1 || visual != oldVisual) visual.textContent += '⬇️'; 
    else if (sortDir == 1) visual.textContent += '⬆️';

    tasks.sort((a,b) => {
        if (a[field] > b[field]) return 1 * sortDir; /* */
        if (a[field] < b[field]) return -1 * sortDir; /* */
    });

    if (field == 'price')
        tasks.sort((a, b) => {
            return (Number(a.price) - Number(b.price)) * sortDir; /* */
        });

    oldVisual = visual;

    renderTasks();
}

function loadTasks() {
    let url = `/orders?company_id=${user.company_id}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            tasks = data;
            renderTasks();
        });
}

/* обновление задачи */
function updateTask(id) {
    const modelSecurity = escapeHTML(modelInput.value.trim());
    const crushSecurity = escapeHTML(crushInput.value.trim());
    const workerSecurity = escapeHTML(workerInput.value.trim());
    const noteSecurity = escapeHTML(noteInput.value.trim());
    const customerSecurity = escapeHTML(customerInput.value.trim());
    const phoneSecurity = escapeHTML(phoneInput.value.trim());
    const SNSecurity = escapeHTML(SNInput.value.trim());

    const updatedTask = {
        id: id,
        user_id: user.id,
        company_id: user.company_id,
        phone: phoneSecurity,
        customer: customerSecurity,
        worker: workerSecurity,
        device: deviceInput.value,
        model: modelSecurity,
        SN: SNSecurity,
        status: statusInput.value,
        price: Number(priceInput.value) || 0,
        pre: Number(preInput.value) || 0,
        acceptDate: dateInput.value,
        deadline: Number(deadline.value) || 0,
        crush: crushSecurity,
        note: noteSecurity
    };

    fetch(`/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
    })
    .then(res => res.json())
    .then(data => {
        console.log('Задача обновлена', data);
        loadTasks();
    })
    .catch(error => console.error('Ошибка при обновлении:', error));
}

function normalizePhone(phone = '') {
    return String(phone).replace(/\D/g, '');
}

async function loadDeviceHints(query = '') {
    try {
        const response = await fetch(`/api/devices/${user.company_id}`);
        const devices = await response.json();

        if (!response.ok) {
            throw new Error(devices.error || 'Ошибка загрузки устройств');
        }

        const list = document.getElementById('deviceHints');
        if (!list) return;

        list.innerHTML = '';

        devices
            .filter(device => !query || device.name.toLowerCase().includes(query.toLowerCase()))
            .forEach(device => {
                const option = document.createElement('option');
                option.value = device.name;
                list.appendChild(option);
            });
    } catch (error) {
        console.error('Ошибка загрузки устройств:', error);
    }
}

let contactHints = [];

async function loadContactHints(query = '') {
    try {
        const response = await fetch(`/api/contacts/${user.company_id}?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки контактов');
        }

        contactHints = Array.isArray(data) ? data : [];

        const list = document.getElementById('contactHints');
        if (!list) return;

        list.innerHTML = '';

        contactHints.forEach(contact => {
            const option = document.createElement('option');
            option.value = contact.phone;
            option.label = `${contact.customer_name} — ${contact.phone}`;
            list.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки контактов:', error);
    }
}

phoneInput.addEventListener('input', async () => {
    await loadContactHints(phoneInput.value);

    const normalized = phoneInput.value.replace(/\D/g, '');
    const found = contactHints.find(c => c.phone_normalized === normalized);

    if (found) {
        customerInput.value = found.customer_name || '';
    }
});

customerInput.addEventListener('input', async () => {
    await loadContactHints(customerInput.value);

    const found = contactHints.find(c =>
        (c.customer_name || '').toLowerCase() === customerInput.value.trim().toLowerCase()
    );

    if (found && !phoneInput.value.trim()) {
        phoneInput.value = found.phone || '';
    }
});

async function generateDocument(orderId) {
    try {
        const responseTemplates = await fetch(`/api/templates/${user.company_id}`);
        const templates = await responseTemplates.json();

        if (!responseTemplates.ok) {
            throw new Error(templates.error || 'Ошибка загрузки шаблонов');
        }

        if (!templates.length) {
            alert('Сначала загрузи шаблон в настройках');
            return;
        }

        const templateId = templates[0].id;

        const response = await fetch('/api/documents/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company_id: user.company_id,
                user_id: user.id,
                order_id: orderId,
                template_id: templateId
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Ошибка генерации документа');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document-order-${orderId}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Ошибка генерации документа:', error);
        alert(error.message);
    }
}

function getPriceParts() {
    return Array.from(document.querySelectorAll('.price-part'));
}

function calculatePriceFromParts() {
    const total = getPriceParts().reduce((sum, input) => {
        return sum + (Number(input.value) || 0);
    }, 0);

    priceInput.value = total ? total : '';
}

function clearPriceCalculator() {
    getPriceParts().forEach(input => input.value = '');
    if (priceCalcBox) {
        priceCalcBox.style.display = 'none';
    }
    if (togglePriceCalc) {
        togglePriceCalc.textContent = '+';
    }
}

function archiveTask(id) {
    if (!confirm('Отправить заказ в архив?')) return;

    fetch(`/api/orders/${id}/archive`, {
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
            throw new Error(data.error || 'Ошибка архивации');
        }
        return data;
    })
    .then(() => loadTasks())
    .catch(error => {
        console.error('Ошибка архивации:', error);
        alert(error.message);
    });
}
/******** ПЕРЕМЕННЫЕ И ЭЛЕМЕНТЫ *********/

let editIndex = null; /* переключатель режима редактирования */
let sortDir = 1; /* сортировка по возрастанию или убыванию */
let oldVisual = null;
let isSyncling = false; /* синхронизация дат */
let statuses = []; /* динамический список статусов */

/* Модальное окно */
const closeButton = document.getElementById('closeButton'); /* кнопка закрытия */
const modal = document.getElementById('modal'); /* модальное окно */
const addOrder = document.getElementById('addOrder'); /* кнопка открытия */
const complete = document.getElementById('filter');
const search = document.getElementById('search');

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

/******** ОСНОВНЫЕ БЛОКИ *********/

/* 0. Получение данных о пользователе */
const user = JSON.parse(localStorage.getItem('user'));
if (!user) window.location.href = '/start'; //перенаправить на страницу входа, если пользователя не существует

/* 1. Загрузка списка */
document.addEventListener('DOMContentLoaded', () => {
    loadTasks(); // 1.1: Загрузка задач конкретного профиля
    loadWorkersToSelect(); // 1.2: Загрузка работников из списка
    loadStatuses(); // 1.3: Загрузка статусов из списка
    loadDeviceHints(); // 1.4: Загрузка списка устройств
    deviceInput.addEventListener('input', () => loadDeviceHints(deviceInput.value));

    if (togglePriceCalc && priceCalcBox) { //показ блока калькулятора
        togglePriceCalc.addEventListener('click', () => { //при нажатии
            const isHidden = priceCalcBox.style.display === 'none'; //по умолчанию кнопка не показывается
            priceCalcBox.style.display = isHidden ? 'flex' : 'none'; //показать кнопку
            togglePriceCalc.textContent = isHidden ? '−' : '+'; //показать символ кнопки
        });
    }

    getPriceParts().forEach(input => { // 1.5: Выбор всех элементов 1 класса
        input.addEventListener('input', calculatePriceFromParts); // 1.6: Сумма полей калькулятора
    });
});

/* 2. Добавление заказа */
closeButton.onclick = () => {
    modal.style.display = 'none'; //закрытие модального окна по кнопке
    document.getElementById('out').innerHTML = '';
};
addOrder.onclick = () => { //действия при нажатии на кнопку
    clearForm(); // 2.1: Очистка формы
    modal.style.display = 'flex'; //отображение формы
};
modal.onclick = (event /* объект события */) => {if (event.target === modal) {modal.style.display = 'none'; document.getElementById('out').innerHTML = '';}}; //закрытие окна при клике вне окна

/* 4. Расчёт конечной даты */
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

/* 5. Расчёт даты */
dateInput.addEventListener('input', function () {
    if (isSyncling) return;
    if (!this.value) return; //выключение, если ничего нет

    isSyncling = true;

    const end = new Date(this.value);
    end.setHours(0,0,0,0);

    const today = new Date();
    today.setHours(0,0,0,0);

    deadline.value = Math.ceil((end - today) / (1000 * 60 * 60 * 24)); // расчёт даты

    isSyncling = false;
});

/********* ДАННЫЕ И СЛУШАТЕЛИ *********/
let tasks = [];

complete.addEventListener('change', function(event) { renderTasks() });
search.addEventListener('input', renderTasks);

/* 6. Подтверждение задачи */
modalButton.onclick = () => {
    if (modelInput.value.trim() === '') {
        alert('Поле "Модель" не может быть пустым');
        return;
    }

    if (workerInput.value.trim() === '') {
        alert('Поле "Исполнитель" не может быть пустым');
        return;
    }

    if (editIndex !== null) { //редактирование или добавление
        updateTask(editIndex); //6.1: Обновление задачи
    } else {
        addTask(); //6.2: Добавление задачи
    }

    clearForm(); //2.1: Очистка формы
    modal.style.display = 'none'; //выключение модального окна
};

/* 7. Логика номера телефона */ 
phoneInput.addEventListener('input', async () => { //форма номера телефона
    await loadContactHints(phoneInput.value); // 7.1: Загрузка существующих контактов

    const normalized = phoneInput.value.replace(/\D/g, ''); //получение цифр
    const found = contactHints.find(c => c.phone_normalized === normalized); //поиск телефона по вводимым данным

    if (found) {
        customerInput.value = found.customer_name || ''; //если у номера нету ФИО клиента, оно не показывается
    }
});

/* 8. Логика имени сотрудника */
customerInput.addEventListener('input', async () => {
    await loadContactHints(customerInput.value); // 7.1: Загрузка существующих контактов

    const found = contactHints.find(c =>
        (c.customer_name || '').toLowerCase() === customerInput.value.trim().toLowerCase() //для поиска все буквы опускаются в нижний регистр
    );

    if (found && !phoneInput.value.trim()) {
        phoneInput.value = found.phone || ''; //если у ФИО клиента нету номера, он не показывается
    }
});

/* 9. Сортировка */
document.getElementById('modelHead').onclick = () => sortTasks('model', document.getElementById('modelHead'));
document.getElementById('statusHead').onclick = () => sortTasks('status', document.getElementById('statusHead'));
document.getElementById('bugHead').onclick = () => sortTasks('crush', document.getElementById('bugHead'));
document.getElementById('priceHead').onclick = () => sortTasks('price', document.getElementById('priceHead'));
document.getElementById('workerHead').onclick = () => sortTasks('worker', document.getElementById('workerHead'));
document.getElementById('dateBeginHead').onclick = () => sortTasks('acceptDate', document.getElementById('dateBeginHead'));
document.getElementById('dateHead').onclick = () => sortTasks('acceptDate', document.getElementById('dateHead'));

/* Создание списка контактов */ 
let contactHints = [];

/******** ФУНКЦИИ *********/

/* 1.1: Загрузка задач конкретного профиля */
function loadTasks() {
    let url = `/orders?company_id=${user.company_id}`; //URL

    fetch(url) //импорт информации из URL
        .then(res => res.json()) //преобразование информации в JSON-скрипт
        .then(data => { //отправка данных в функцию
            tasks = data;
            console.log(tasks);
            renderTasks(); //1.1.1: Создание таблицы
        });
}

/* 1.1.1: Создание таблицы */
function renderTasks() { 
    const table = document.getElementById('orderTable'); //таблица
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
        <div class="days-cell">${daysLeft} дн.</div>
        <div class="tdEdit">
            <button onclick="editTask(${task.id})">Редактировать</button> 
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

/* 1.1.1.1: Форматирование даты */ 
function formattedDate(dateValue) {
    if (!dateValue) return ''; //если даты нет, возврат пустого значения

    const date = new Date(dateValue);
    if (isNaN(date)) return ''; //если объявилось NaN - возврат пустого значения

    const day = String(date.getDate()).padStart(2, '0'); //получение дня
    const month = String(date.getMonth() + 1).padStart(2, '0'); //получение месяца
    const year = date.getFullYear(); //получение года

    return `${day}.${month}.${year}`; //возврат даты в нужном формате
}

/* 1.1.1.2: Обратная конвертация */
function returnHTML(str) {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
}

/* 1.1.1.3: Создание документа */ 
async function generateDocument(orderId) {
    try {
        const responseTemplates = await fetch(`/api/templates/${user.company_id}`); //URL
        const templates = await responseTemplates.json(); 

        if (!responseTemplates.ok) {
            throw new Error(templates.error || 'Ошибка загрузки шаблонов');
        }

        if (!templates.length) { //если документов нет
            alert('Сначала загрузите шаблон в настройках');
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

/* 1.1.1.4: Архивирование заказа */ 
function archiveTask(id) {
    if (!confirm('Выдать заказ?')) return;

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

    modal.style.display = 'none';
    document.getElementById('out').innerHTML = '';
}

/* 1.2: Загрузка работников из списка */
async function loadWorkersToSelect() {
    try { //проверка на ошибки
        const response = await fetch(`/api/workers/${user.company_id}`); //адрес
        const workers = await response.json(); //получение ответа (?)

        if (!response.ok) { //проверка на ошибки
            throw new Error('Ошибка загрузки сотрудников');
        }

        const select = document.getElementById('workerInput'); //использование ввода работников
        if (!select) return;

        // очищаем, но оставляем placeholder
        select.innerHTML = '<option value="">Выберите сотрудника</option>';

        workers
            .filter(w => w.is_active) //оставляем активных сотрудников
            .forEach(worker => {
                const option = document.createElement('option'); //создание элемента списка
                option.value = worker.name; // пока используем имя
                option.textContent = `${worker.name} (${worker.role})`; //стиль: имя, роль
                select.appendChild(option); //закрывающий тег
            });

    } catch (error) {
        console.error('Ошибка загрузки сотрудников:', error); //лог ошибки
    }
}

/* 1.3: загрузка статусов из списка */
async function loadStatuses() {
    try {
        const response = await fetch(`/api/statuses/${user.company_id}`); //адрес
        const data = await response.json(); //получение ответа (?)

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки статусов'); //лог ошибки
        }

        statuses = Array.isArray(data) ? data.map(s => s.name) : []; //пустой массив, если статусов не существует
        renderStatusSelectors(); //1.3.1: загрузка статусов
    } catch (error) {
        console.error('Ошибка загрузки статусов:', error);
        statuses = [];
        renderStatusSelectors(); // 1.3.1: добавление статусов на сайт
    }
}

/* 1.3.1: добавление статусов на сайт */
function renderStatusSelectors() {
    const statusSelect = document.getElementById('statusInput'); //использование поля ввода статуса
    const filterSelect = document.getElementById('filter'); //использование фильтрации на сайте

    if (statusSelect) {
        statusSelect.innerHTML = getStatusOptionsHtml(); //добавление статусов по умолчанию, если статусов нет
    }

    if (filterSelect) {
        filterSelect.innerHTML = '<option>Все статусы</option>' + getStatusOptionsHtml(); //создание списка статусов
    }
}

/* 1.3.1.1: добавление статусов по умолчанию */
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

/* 1.4: Загрузка списка устройств */
async function loadDeviceHints(query = '') {
    try { //проверка на ошибки
        const response = await fetch(`/api/devices/${user.company_id}`); //адрес
        const devices = await response.json(); //JSON

        if (!response.ok) {
            throw new Error(devices.error || 'Ошибка загрузки устройств'); 
        }

        const list = document.getElementById('deviceHints'); //использование элемента в HTML
        if (!list) return;

        list.innerHTML = ''; //пустой список, если устройств нет

        devices
            .filter(device => !query || device.name.toLowerCase().includes(query.toLowerCase()))
            .forEach(device => { //добавление устройства в список
                const option = document.createElement('option'); //создание элемента
                option.value = device.name; //присваивание имени элементу
                list.appendChild(option); //конечный тэг
            });
    } catch (error) {
        console.error('Ошибка загрузки устройств:', error);
    }
}

/* 1.5: Выбор всех элементов 1 класса */ 
function getPriceParts() {
    return Array.from(document.querySelectorAll('.price-part'));
}

/* 1.6: Сумма полей калькулятора */ 
function calculatePriceFromParts() {
    const total = getPriceParts().reduce((sum, input) => {
        return sum + (Number(input.value) || 0);
    }, 0);

    priceInput.value = total ? total : ''; //если ничего нет, возвращается пустое значение
}

/* 2.1: Очистка формы */
function clearForm() {
    phoneInput.value = ''; //очистка полей
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
    document.getElementById('out').innerHTML = '';

    clearPriceCalculator(); //2.1.1: Очистка калькулятора

    // Скрываем дополнительные кнопки для новых заказов
    if (docButton) docButton.style.display = 'none';
    if (archiveButton) archiveButton.style.display = 'none';
    if (aiButton) aiButton.style.display = 'none';

    editIndex = null; //не редактирование
    modalButton.textContent = 'Добавить';
}

/* 2.1.1: Очистка калькулятора */
function clearPriceCalculator() {
    getPriceParts().forEach(input => input.value = '');
    if (priceCalcBox) {
        priceCalcBox.style.display = 'none'; //скрытие полей калькулятора
    }
    if (togglePriceCalc) {
        togglePriceCalc.textContent = '+'; //изменение кнопки
    }
}

/* 3: Редактирование задачи */
function editTask(id) {
    const task = tasks.find(t => t.id == id); //проверка задания
    if (!task) return; //выключает функцию если задачи нет

    phoneInput.value = returnHTML(task.phone || ''); //берёт информацию из задачи
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
    }
    
    deadline.value = Number(task.deadline) || '';
    crushInput.value = returnHTML(task.crush || '');
    noteInput.value = returnHTML(task.note || '');

    // Показываем дополнительные кнопки, так как мы в режиме редактирования
    if (docButton) {
        docButton.style.display = 'inline-block';
        docButton.onclick = () => generateDocument(id);
    }
    if (archiveButton) {
        archiveButton.style.display = 'inline-block';
        archiveButton.onclick = () => archiveTask(id);
    }
    if (aiButton) {
        aiButton.style.display = 'inline-block';
        aiButton.onclick = () => questAI(id);
    }

    editIndex = id;
    modalButton.textContent = 'Сохранить';
    modal.style.display = 'flex';
}

/* 6.1: Обновление задачи */
function updateTask(id) {
    const modelSecurity = escapeHTML(modelInput.value.trim()); // 6.1.1: Защита от команд
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

/* 6.1.1: Защита от команд */
function escapeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* 6.2: Добавление задачи */
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

/* 7.1: Загрузка существующих контактов */ 
async function loadContactHints(query = '') {
    try {
        const response = await fetch(`/api/contacts/${user.company_id}?q=${encodeURIComponent(query)}`); //URL
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки контактов');
        }

        contactHints = Array.isArray(data) ? data : []; //пустой массив, если контактов нет

        const list = document.getElementById('contactHints'); //использование тега контактов на странице
        if (!list) return; //если тега нет - результат пустой

        list.innerHTML = '';

        contactHints.forEach(contact => {
            const option = document.createElement('option'); //создание пункта списка
            option.value = contact.phone; //добавление телефона
            option.label = `${contact.customer_name} — ${contact.phone}`;
            list.appendChild(option); //закрытие тега
        });
    } catch (error) {
        console.error('Ошибка загрузки контактов:', error);
    }
}

/* 9.1: Сортировка */
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

/* 10.1 Вопрос к ИИ */
function questAI(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    send(task);
}

function replaceAiTags(prompt, task) {
    return prompt
        .replaceAll('${worker}', task.worker || '')
        .replaceAll('${device}', task.device || '')
        .replaceAll('${model}', task.model || '')
        .replaceAll('${crush}', task.crush || '')
        .replaceAll('${note}', task.note || '');
}

async function send(task) {
    const out = document.getElementById("out");
    out.style.whiteSpace = "pre-wrap";
    out.textContent = "⏳ думает...";

    const settingsRes = await fetch('/api/ai/settings');
    const settingsData = await settingsRes.json();

    if (!settingsRes.ok) {
        out.textContent = settingsData.error || 'Ошибка загрузки настроек ИИ';
        return;
    }

    const prompt = settingsData.settings?.ai_prompt || '';
    const message = replaceAiTags(prompt, task);

    const res = await fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
    });

    const data = await res.json();

    out.textContent = data.text || JSON.stringify(data, null, 2);
}
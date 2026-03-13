    let editIndex = null; /* переключатель режима редактирования */
    let sortField = null; /* поле сортировки */
    let sortDir = 1; /* сортировка по возрастанию или убыванию */
    let oldVisual = null;
    let isSyncling = false; /* синхронизация дат */
    let link = document.getElementById('data-theme');

    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (isDark) themeChange();

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

    /* модальное меню */
    const menuButton = document.getElementById('menu');
    const modalMenu = document.getElementById('modal-menu');

    menuButton.onclick = () => modalMenu.style.display = 'flex';
    modalMenu.onclick = (event /* объект события */) => {if (event.target === event.currentTarget) modalMenu.style.display = 'none'}; 


    /* Добавление в таблицу */
    const modalButton = document.getElementById('modal-button');
    const modalArchive = document.getElementById('modal-archive');
    const orderTable = document.getElementById('orderTable');
    const deviceInput = document.getElementById('deviceInput')
    const modelInput = document.getElementById('modelInput');
    const statusInput = document.getElementById('statusInput');
    const crushInput = document.getElementById('crushInput');
    const priceInput = document.getElementById('priceInput');
    const noteInput = document.getElementById('noteInput');
    const workerInput = document.getElementById('workerInput');
    const dateInput = document.getElementById('dateInput');
    const deadline = document.getElementById('deadline');

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

    /* Локальная память */
    let tasks = [];

    complete.addEventListener('change', function(event) { renderTasks() });
    search.addEventListener('input', renderTasks);
    document.addEventListener('DOMContentLoaded', () => { /* загрузка страницы */
        loadTasks(); /* обработка памяти */
    });

    modalButton.onclick = () => {
        if (modelInput.value == '') alert('Поле "Модель" не может быть пустым');
        else if (crushInput.value == '') alert('Поле "Неисправность" не может быть пустым');
        else if (priceInput.value == '') alert ('Поле "Цена" не может быть пустым');
        else if (workerInput.value == '') alert ('Поле "Исполнитель" не может быть пустым');
        else if (editIndex !== null) {
            updateTask(editIndex);
        }
        else {
            addTask();
        };

        clearForm();
        /*renderTasks(); /* обработка памяти */
        modal.style.display = 'none'; /* закрытие окна */
    }

    /* сортировка */
    /*document.getElementById('numberHead').onclick = () => sortTasks('number', document.getElementById('numberHead'));*/
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
        modelSecurity = escapeHTML(modelInput.value);
        crushSecurity = escapeHTML(crushInput.value);
        workerSecurity = escapeHTML(workerInput.value);
        noteSecurity = escapeHTML(noteInput.value);

        const task = { /* характеристики добавления в память */
            device: deviceInput.value,
            model: modelSecurity,
            status: statusInput.value,
            crush: crushSecurity,
            price: priceInput.value,
            note: noteSecurity,
            worker: workerSecurity,
            acceptDate: dateInput.value,
            deadline: Number(deadline.value)
        };

        fetch('http://localhost:3000/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        })
        .then(res => res.json())
        .then(data => {
            console.log('Задача добавлена на сервер', data);
            loadTasks(); /* обновляем таблицу после добавления */
        });
    } 

    /* обработка памяти */
    function renderTasks() { 
        const isArchive = window.location.pathname === '/archive';
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
            <div class="tdModel">${task.model}</div>
            <div class="tdStatus"><select class="statusInput">
                <option ${task.status === 'Принят' ? 'selected' : ''}>Принят</option>
                <option ${task.status === 'В работе' ? 'selected' : ''}>В работе</option>
                <option ${task.status === 'Ждёт запчастей' ? 'selected' : ''}>Ждёт запчастей</option>
                <option ${task.status === 'На согласовании' ? 'selected' : ''}>На согласовании</option>
                <option ${task.status === 'Без ремонта' ? 'selected' : ''}>Без ремонта</option>
                <option ${task.status === 'Сделан' ? 'selected' : ''}>Сделан</option>
                <option ${task.status === 'Отменён' ? 'selected' : ''}>Отменён</option>
            </select></div>
            <div class="tdBug">${task.crush}</div>
            <div class="tdPrice">${task.price}</div>
            <div class="tdWorker">${task.worker}</div>
            <div class="tdBegin">${formattedDate(task.acceptDate)}</div>
            <div class="days-cell">${daysLeft} дн.</div>
            <div class="tdEdit">
                ${isArchive ? '' : `
                    <button onclick="editTask(${task.id})">📝</button>
                    <button onclick="deleteTask(${task.id})">❌</button>
                `}
            </div>
            `;

            const select = tr.querySelector('.statusInput');

            select.addEventListener('change', function () {
                const newStatus = this.value;

                fetch(`http://localhost:3000/orders/${task.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...task,
                        status: newStatus
                    })
                })
                .then(res => res.json())
                .then(() => loadTasks())
                .catch(err => console.error('Ошибка обновления статуса:', err));
            });

            if (daysLeft < 0) tr.querySelector('.days-cell').style.color = "red"; /* выбор текущего сектора */

            document.getElementById('orderTable').appendChild(tr); /* закрывающий аргумент строки таблицы */
        });
    }

    /* редактирование задачи */
    function editTask(id) {
        /* импорт из массива в редактирование */
        const task = tasks.find(t => t.id == id);
        if (!task) return;

        modalArchive.onclick = () => {
            fetch('http://localhost:3000/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            })
            .then(res => res.json())
            .then(data => {
                console.log('Задача добавлена на сервер', data);
                loadTasks(); /* обновляем таблицу после добавления */
            });
            deleteTask(id);
            modal.style.display = 'none';
        }

        modelSecurity = returnHTML(task.model);
        crushSecurity = returnHTML(task.crush);
        workerSecurity = returnHTML(task.worker);
        noteSecurity = returnHTML(task.note);

        deviceInput.value = task.device;
        modelInput.value = modelSecurity;
        statusInput.value = task.status;
        crushInput.value = crushSecurity;
        priceInput.value = task.price;
        noteInput.value = noteSecurity;
        workerInput.value = workerSecurity;
        dateInput.value = task.acceptDate;
        deadline.value = Number(task.deadline) || '';

        editIndex = id;  /* сохранение ID для редактирования */;
        modalButton.textContent = "Сохранить"; /* изменение текста кнопки */;
        modalArchive.style.visibility = "visible";
        modal.style.display = 'flex';
    }

    /* удаление задачи */
    function deleteTask(id) {
    if (confirm("Удалить?")) {
        fetch(`http://localhost:3000/orders/${id}`, {
            method: 'DELETE'
        })
        .then(() => {
            loadTasks();
        })
        .catch(error => console.error('Ошибка при удалении:', error));
    }
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
        deviceInput.value = '';
        modelInput.value = '';
        statusInput.value = '';
        crushInput.value = '';
        priceInput.value = '';
        noteInput.value = '';
        workerInput.value = '';
        deadline.value = '';
        dateInput.value = '';

        editIndex = null;
        modalButton.textContent = 'Добавить';
    }

    /* сортировка */
    function sortTasks(field, visual) {
        if (field == 'number') {
            sortField = null;
        }

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

    /* переключение темы */
    function themeChange() {
        let lightTheme = "light.css";
        let darkTheme = "dark.css";

        let currTheme = link.getAttribute("href");
        
        if (currTheme == lightTheme) {
            link.setAttribute("href", darkTheme);
        } else {
            link.setAttribute("href", lightTheme);
        }
    }

    function loadTasks() {
        let url = 'http://localhost:3000/orders';

        if (window.location.pathname === '/archive') url = 'http://localhost:3000/archive-data';

        fetch(url)
            .then(res => res.json())
            .then(data => {
                tasks = data;
                renderTasks();
            });
    }

    /* обновление задачи */
    function updateTask(id) {
        modelSecurity = escapeHTML(modelInput.value);
        crushSecurity = escapeHTML(crushInput.value);
        workerSecurity = escapeHTML(workerInput.value);
        noteSecurity = escapeHTML(noteInput.value);

        const updatedTask = {
            id: id,
            device: deviceInput.value,
            model: modelSecurity,
            status: statusInput.value,
            crush: crushSecurity,
            price: priceInput.value,
            note: noteSecurity,
            worker: workerSecurity,
            acceptDate: dateInput.value,
            deadline: Number(deadline.value)
        };

        fetch(`http://localhost:3000/orders/${id}`, {
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
    let editIndex = null; /* переключатель режима редактирования */
    let sortField = null; /* поле сортировки */
    let sortDir = 1; /* сортировка по возрастанию или убыванию */
    let oldVisual = null;
    let isSyncling = false; /* синхронизация дат */

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
    const modalButton = document.getElementById('modal-button');
    const orderTable = document.getElementById('orderTable');
    const deviceInput = document.getElementById('deviceInput')
    const modelInput = document.getElementById('modelInput');
    const statusSelect = document.getElementById('statusSelect');
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
    let tasks = JSON.parse(localStorage.getItem("tasks")) || []; /* берёт данные браузера, если нет - создаёт новые */

    complete.addEventListener('change', function(event) { renderTasks() });
    search.addEventListener('change', function(event) {renderTasks()});
    document.addEventListener('DOMContentLoaded', () => { /* загрузка страницы */
        renderTasks(); /* обработка памяти */
    });

    modalButton.onclick = () => {
        if (modelInput.value == '') alert('Поле "Модель" не может быть пустым');
        else if (crushInput.value == '') alert('Поле "Неисправность" не может быть пустым');
        else if (priceInput.value == '') alert ('Поле "Цена" не может быть пустым');
        else if (workerInput.value == '') alert ('Поле "Исполнитель" не может быть пустым');
        /*else if (dateInput.value == '') alert ('Поле "Дата выдачи" не может быть пустым');*/
        else if (modelInput.value.length > 25) alert ('Поле "Модель" не может содержать больше 25 символов');
        else if (crushInput.value.length > 50) alert ('Поле "Неисправность" не может содержать больше 50 символов');
        /*else if (priceInput.value > 9) alert ('Ремонт не может стоить дороже 99999999 рублей');*/
        else if (workerInput.value > 20) alert ('Поле "Исполнитель" не может содержать больше 20 символов');
        else addTask(); /* сохранение в локал */

        clearForm();
        renderTasks(); /* обработка памяти */
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
            deadline: dateInput.value
        };

        if (editIndex == null) {
            tasks.push(task); /* добавление МАСССИВА в память */
        } else {
            tasks[editIndex] = task; 
            editIndex = null; /* переключение на режим добавления */
            modalButton.textContent = "Добавить"; /* изменение текста кнопки */
        }

        localStorage.setItem("tasks", JSON.stringify(tasks)); /* сохранение */
    } 

    /* обработка памяти */
    function renderTasks() { 
        if (tasks.length === 0) {
            orderTable.style.visibility = "hidden";
            document.getElementById('noTask').style.visibility = "visible";
            return;
        }

        orderTable.style.visibility = "visible";
        document.getElementById('noTask').style.visibility = "hidden";

        const table = document.getElementById('orderTable');

        /* удаляем все строки кроме заголовка */
        table.querySelectorAll('.mainTable').forEach(row => row.remove());

        tasks.forEach((task, index) => {
            check = true;
            checkSearch = false;
            repSearch = escapeHTML(search.value);
            if (complete.value == 'Принят' && task.status != 'Принят' ||
                complete.value == 'В работе' && task.status != 'В работе' ||
                complete.value == 'Ждёт запчастей' && task.status != 'Ждёт запчастей' ||
                complete.value == 'На согласовании' && task.status != 'На согласовании' ||
                complete.value == 'Без ремонта' && task.status != 'Без ремонта' ||
                complete.value == 'Сделан' && task.status != 'Сделан' ||
                complete.value == 'Отменён' && task.status != 'Отменён') check = false;
            if (search.value == '') checkSearch = true;
            else if (task.model.includes(repSearch) || task.crush.includes(repSearch) || task.price.includes(repSearch) || task.worker.includes(repSearch)) checkSearch = true;
            if (check && checkSearch) {
                document.getElementById('noSearch').style.visibility = "hidden";
                const tr = document.createElement('section'); /* создание строки таблицы */
                tr.classList.add('mainTable');
                const daysLeft = calcDays(task.deadline);
                tr.innerHTML = /* создание ячеек */ `
                <div class="tdNumber">${index + 1}</div>
                <div class="tdModel">${task.model}</div>
                <div class="tdStatus"><select class="statusInput">
                    <option ${task.status === 'Принят' ? 'selected' : ''}>Принят</option>
                    <option ${task.status === 'В работе' ? 'selected' : ''}>В работе</option>
                    <option ${task.status === 'Ждёт запчастей' ? 'selected' : ''}>Ждёт запчастей</option>
                    <option ${task.status === 'На согласовании' ? 'selected' : ''}>На согласовании</option>
                    <option ${task.status === 'Без ремонта' ? 'selected' : ''}>Без ремонта</option>
                    <option ${task.status === 'Сделан' ? 'selected' : ''}>Cделан</option>
                    <option ${task.status === 'Отменён' ? 'selected' : ''}>Отменён</option>
                </select></div>
                <div class="tdBug">${task.crush}</div>
                <div class="tdPrice">${task.price}</div>
                <div class="tdWorker">${task.worker}</div>
                <div class="tdBegin">${formattedDate(task.acceptDate)}</div>
                <div class="days-cell">${daysLeft} дн.</div>
                <div class="tdEdit">
                    <button onclick="editTask(${index})">📝</button>
                    <button onclick="deleteTask(${index})">❌</button>
                </div>
                `;

                if (daysLeft < 0) {
                    tr.querySelector('.days-cell').style.color = "red"; /* выбор текущего сектора */
                }

                const select = tr.querySelector('.statusInput');
                select.addEventListener('change', function () {
                    tasks[index].status = this.value;
                    localStorage.setItem("tasks", JSON.stringify(tasks));
                    renderTasks();
                });

                document.getElementById('orderTable').appendChild(tr); /* закрывающий аргумент строки таблицы */
            } else {
                orderTable.style.visibility = "hidden";
                document.getElementById('noSearch').style.visibility = "visible";
            }
        });
    }

    /* редактирование задачи */
    function editTask(index) {
        /* импорт из массива в редактирование */
        const task = tasks[index];

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
        deadline.value = calcDays(task.deadline);

        editIndex = index;  /* переключение на режим редактирования */;
        modalButton.textContent = "Сохранить"; /* изменение текста кнопки */;
        modal.style.display = 'flex';
    }

    /* удаление задачи */
    function deleteTask(index) {
        if (confirm("Удалить?")) {
        tasks.splice(index, 1); /* вырез элемента */
        localStorage.setItem("tasks", JSON.stringify(tasks));
        renderTasks(); /* перезагрузка таблицы */ }
    }

    /* очистка даты */
    function normalize(date) {
        date.setHours(0,0,0,0);
        return date;
    }

    function calcDays(dateString) {
        if (!dateString || !dateString.includes('-')) return '';
        const end = normalize(new Date(dateString));
        const today = normalize(new Date());
        const diffMs = end - today;
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    function formattedDate(dateString) {
        if (!dateString) return '';

        const parts = dateString.split('-');
        if (parts.length !== 3) return '';

        return `${parts[2]}.${parts[1]}.${parts[0]}`;
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

    /*JSWork = false;*/

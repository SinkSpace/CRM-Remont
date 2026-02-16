    let editIndex = null; /* переключатель режима редактирования */
    let sortField = null; /* поле сортировки */
    let sortDir = 1; /* сортировка по возрастанию или убыванию */
    
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

    /* Локальная память */
    let tasks = JSON.parse(localStorage.getItem("tasks")) || []; /* берёт данные браузера, если нет - создаёт новые */

    complete.addEventListener('change', function(event) { renderTasks() });
    search.addEventListener('change', function(event) {renderTasks()});
    document.addEventListener('DOMContentLoaded', () => { /* загрузка страницы */
        renderTasks(); /* обработка памяти */
    });

    tasks.forEach(task => {
        console.log(task.model, task.acceptDate);
    });

    modalButton.onclick = () => {
        if (modelInput.value == '') alert('Поле "Модель" не может быть пустым');
        else if (crushInput.value == '') alert('Поле "Неисправность" не может быть пустым');
        else if (priceInput.value == '') alert ('Поле "Цена" не может быть пустым');
        else if (workerInput.value == '') alert ('Поле "Исполнитель" не может быть пустым');
        else if (dateInput.value == '') alert ('Поле "Дата выдачи" не может быть пустым');
        else if (modelInput.value.length > 25) alert ('Поле "Модель" не может содержать больше 25 символов');
        else if (crushInput.value.length > 35) alert ('Поле "Неисправность" не может содержать больше 35 символов');
        /*else if (priceInput.value > 9) alert ('Ремонт не может стоить дороже 99999999 рублей');*/
        else if (workerInput.value > 20) alert ('Поле "Исполнитель" не может содержать больше 20 символов');
        else addTask(); /* сохранение в локал */

        clearForm();
        renderTasks(); /* обработка памяти */
        modal.style.display = 'none'; /* закрытие окна */
    }

    /* сортировка */
    document.getElementById('modelHead').onclick = () => sortTasks('model');
    document.getElementById('statusHead').onclick = () => sortTasks('status');
    document.getElementById('bugHead').onclick = () => sortTasks('crush');
    document.getElementById('priceHead').onclick = () => sortTasks('price');
    document.getElementById('workerHead').onclick = () => sortTasks('worker');
    document.getElementById('dateBeginHead').onclick = () => sortTasks('beginDate');
    document.getElementById('dateHead').onclick = () => sortTasks('acceptDate');

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
            acceptDate: dateInput.value
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
        const tbody = orderTable.querySelector("tbody"); /* выбор первого элемента таблицы на странице */
        tbody.innerHTML = ''; /* enter для читаемости */

        if (tasks.length === 0) {
            orderTable.style.visibility = "hidden";
            document.getElementById('noTask').style.visibility = "visible";
            return;
        }

        orderTable.style.visibility = "visible";
        document.getElementById('noTask').style.visibility = "hidden";

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
                const tr = document.createElement('tr'); /* создание строки таблицы */
                const daysLeft = calcDays(task.acceptDate);
                /*statusSelect.value = task.status;*/
                tr.innerHTML = /* создание ячеек */ `
                <td class="tdNumber">${index + 1}</td>
                <td class="tdModel">${task.model}</td>
                <td class="tdStatus">${task.status}</td>
                <td class="tdBug">${task.crush}</td>
                <td class="tdPrice">${task.price}</td>
                <td class="tdWorker">${task.worker}</td>
                <td class="tdBegin">${formattedDate(task.acceptDate)}</td>
                <td class="days-cell">${daysLeft} дн.</td>
                <td>
                    <button onclick="editTask(${index})">📝</button>
                    <button onclick="deleteTask(${index})">❌</button>
                </td>`;

                if (daysLeft < 0) {
                    tr.querySelector('.days-cell').style.color = "red"; /* выбор текущего сектора */
                }

                tbody.appendChild(tr); /* закрывающий аргумент строки таблицы */
            }
        });
                /*<select id='statusSelect'>
                    <option>Принят</option>
                    <option>В работе</option>
                    <option>Ждёт запчастей</option>
                    <option>На согласовании</option>
                    <option>Без ремонта</option>
                    <option>Cделан</option>
                    <option>Отменён</option>
                </select>*/
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
        deadline.value = task.deadline;

        editIndex = index;  /* переключение на режим редактирования */;
        modalButton.textContent = "Сохранить"; /* изменение текста кнопки */;
        modal.style.display = 'flex';
    }

    /* удаление задачи */
    function deleteTask(index) {
        tasks.splice(index, 1); /* вырез элемента */
        localStorage.setItem("tasks", JSON.stringify(tasks));
        renderTasks(); /* перезагрузка таблицы */
    }

    function calcDays(dateString) {
        const acceptDate = new Date(dateString); /* дата из инпута */
        const today = new Date(); /* текущая дата */
        const diffMs = acceptDate - today; /* вычитание дат */
        if (diffMs < 0) redInfo = true; else redInfo = false;
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24)); /* перевод миллисекунд в дни */
    }

    function formattedDate(dateString) {
        const rawDate = dateString;
        const parts = rawDate.split('-'); /* разбор составных частей даты */
        return `${parts[2]}.${parts[1]}.${parts[0]}`; /* изменение формата даты */
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
        dateInput.value = '';

        editIndex = null;
        modalButton.textContent = 'Добавить';
    }

    /* сортировка */
    function sortTasks(field) {
        if (field == 'price') {
            tasks.sort((a, b) => {
                return (Number(a.price) - Number(b.price)) * sortDir;
            });
        }

        if (sortField === field) { /* если сортировка уже установлена... */
            sortDir *= -1; /* ...она устанавливается по убыванию */
        } else {
            sortField = field; /* присвоение сортировки по новому признаку */
            sortDir = 1;
        }

        tasks.sort((a,b) => {
            if (a[field] > b[field]) return 1 * sortDir;
            if (a[field] < b[field]) return -1 * sortDir;
        });

        renderTasks();
    }
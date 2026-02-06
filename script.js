    let editIndex = null; /* переключатель режима редактирования */
    
    /* Модальное окно */
    const closeButton = document.getElementById('closeButton'); /* взаимодействие с кнопкой закрытия */
    const modal = document.getElementById('modal'); /* взаимодействие с модальным окном */
    const addOrder = document.getElementById('addOrder'); /* взаимодействие с кнопкой открытия */

    closeButton.onclick = () => modal.style.display = 'none';
    addOrder.onclick = () => modal.style.display = 'flex';
    modal.onclick = (event /* объект события */) => {if (event.target === modal) modal.style.display = 'none'};

    /* Добавление в таблицу */
    const modalButton = document.getElementById('modal-button');
    const orderTable = document.getElementById('orderTable');
    const deviceInput = document.getElementById('deviceInput')
    const modelInput = document.getElementById('modelInput');
    const statusInput = document.getElementById('statusInput');
    const crushInput = document.getElementById('crushInput');
    const priceInput = document.getElementById('priceInput');
    const noteInput = document.getElementById('noteInput');
    const workerInput = document.getElementById('workerInput');
    const dateBeginInput = document.getElementById('dateBeginInput');
    const dateInput = document.getElementById('dateInput');

    /* Локальная память */
    let tasks = JSON.parse(localStorage.getItem("tasks")) || []; /* берёт данные браузера, если нет - создаёт новые */

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
        else if (dateBeginInput.value = '') alert ('Поле "Дата приёма" не может быть пустым');
        else if (dateInput.value == '') alert ('Поле "Дата выдачи" не может быть пустым');
        else addTask(); /* сохранение в локал */

        renderTasks(); /* обработка памяти */
        modal.style.display = 'none'; /* закрытие окна */
    }

    /******** ФУНКЦИИ *********/

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
            beginDate: dateBeginInput.value,
            acceptDate: dateInput.value
        };

        tasks.push(task); /* добавление МАСССИВА в память */

        localStorage.setItem("tasks", JSON.stringify(tasks)); /* сохранение */
    } 

    /* обработка памяти */
    function renderTasks() { 
        const tbody = orderTable.querySelector("tbody"); /* выбор первого элемента таблицы на странице */
        tbody.innerHTML = ''; /* enter для читаемости */

        tasks.forEach((task, index) => {
            const tr = document.createElement('tr'); /* создание строки таблицы */
            tr.innerHTML = /* создание ячеек */ `
            <td>${index + 1}</td>
            <td>${task.model}</td>
            <td>${task.status}</td>
            <td>${task.crush}</td>
            <td>${task.price}</td>
            <td>${task.worker}</td>
            <td>${formattedDate(task.acceptDate)}</td>
            <td>${calcDays(task.acceptDate)} дн.</td>
            <td>
                <button onclick="editTask(${index})">📝</button>
                <button onclick="deleteTask(${index})">❌</button>
            </td>`;
            tbody.appendChild(tr); /* закрывающий аргумент строки таблицы */
        });

        if (tasks.length == 0) 
        {
            document.getElementById('orderTable').style.visibility = "hidden";
            document.getElementById('noTask').style.visibility = "visible";
        };
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
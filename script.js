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
    const modelInput = document.getElementById('modelInput');
    const statusInput = document.getElementById('statusInput');
    const crushInput = document.getElementById('crushInput');
    const priceInput = document.getElementById('priceInput');
    const workerInput = document.getElementById('workerInput');
    const dateInput = document.getElementById('dateInput');

    document.addEventListener('DOMContentLoaded', () => { /* загрузка страницы */
        renderTasks(); /* обработка памяти */
    });

    /* Локальная память */
    let tasks = JSON.parse(localStorage.getItem("tasks")) || []; /* берёт данные браузера, если нет - создаёт новые */

    function addTask() {
        const task = { /* характеристики добавления в память */
            model: modelInput.value,
            status: statusInput.value,
            crush: crushInput.value,
            price: priceInput.value,
            worker: workerInput.value,
            acceptDate: dateInput.value
        };

        tasks.push(task); /* добавление МАСССИВА в память */

        localStorage.setItem("tasks", JSON.stringify(tasks)); /* сохранение */
    } 

    function renderTasks() { /* обработка памяти */
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
            <td>${task.acceptDate}</td>
            <td>-</td>`;
            tbody.appendChild(tr); /* закрывающий аргумент строки таблицы */
        });
    }

    tasks.forEach(task => {
        console.log(task.model, task.acceptDate);
    });

    modalButton.onclick = () => {
        const acceptDate = new Date(dateInput.value); /* дата из инпута */
        const today = new Date(); /* текущая дата */
        const diffMs = acceptDate - today; /* вычитание дат */
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); /* перевод миллисекунд в дни */

        const rawDate = dateInput.value;
        const parts = rawDate.split('-'); /* разбор составных частей даты */
        const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`; /* изменение формата даты */

        if (modelInput.value == '') alert('Поле "Модель" не может быть пустым');
        else if (crushInput.value == '') alert('Поле "Неисправность" не может быть пустым');
        else if (priceInput.value == '') alert ('Поле "Цена" не может быть пустым');
        else if (workerInput.value == '') alert ('Поле "Исполнитель" не может быть пустым');
        else if (rawDate == '') alert ('Поле "Дата" не может быть пустым');
        else addTask(); /* сохранение в локал */

        renderTasks(); /* обработка памяти */

        const crOr = document.createElement('tr'); /* Добавление строки таблицы */
        crOr.innerHTML = `
            <td>${tbody.children.length + 1}</td>
            <td>${modelInput.value}</td>
            <td>${statusInput.value}</td>
            <td>${crushInput.value}</td>
            <td>${priceInput.value}</td>
            <td>${workerInput.value}</td>
            <td>${formattedDate}</td>
            <td>${diffDays} дн.</td>
        `
        /* orderTable.children.length - количество дочерних элементов*/
        /* value - пользовательский ввод */
        orderTable.appendChild(crOr); /* добавление таблицы из памяти на сайт */

        modal.style.display = 'none'; /* закрытие окна */
    }
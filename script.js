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

    /* Локальная память */
    /*let tasks = JSON.parse(localStorage.getItem("tasks")) || []; /* берёт данные браузера, если нет - создаёт новые */

    /*function addTask() {
        const task = { /* характеристики добавления в память */
            /*model: modelInput.value,
            status: modelInput.value,
            crush: crushInput.value,
            price: priceInput.value,
            worker: workerInput.value,
            acceptDate: dateInput.value
        };

        tasks.push(task); /* добавление МАСССИВА в память */

        /*localStorage.setItem("tasks", JSON.stringify(tasks)); /* сохранение */
    /*} */

    tasks.forEach(task => {
        console.log(task.title, task.startDate);
    });

    modalButton.onclick = () => {
        const acceptDate = new Date(dateInput.value); /* дата из инпута */
        const today = new Date(); /* текущая дата */
        const diffMs = acceptDate - today; /* вычитание дат */
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); /* перевод миллисекунд в дни */

        const rawDate = dateInput.value;
        const parts = rawDate.split('-'); /* разбор составных частей даты */
        const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`; /* изменение формата даты */

        /*addTask(); /* сохранение в локал */

        const crOr = document.createElement('tr'); /* Добавление строки таблицы */
        crOr.innerHTML = `
            <td>${orderTable.children.length}</td>
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
        /*orderTable.appendChild(crOr); /* добавление таблицы из памяти на сайт */

        modal.style.display = 'none'; /* закрытие окна */
    }
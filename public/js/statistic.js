document.addEventListener('DOMContentLoaded', () => {
    let currentDay = new Date();
    let currentMonth = new Date();

    const user = JSON.parse(localStorage.getItem('user'));
    const companyId = user.company_id;

    async function loadDayStats() {
        const date = currentDay.toISOString().split('T')[0];
        const res = await fetch(`/stats?type=day&date=${date}&company_id=${companyId}`);
        const data = await res.json();

        document.getElementById('nowDay').textContent =
            currentDay.toLocaleDateString('ru-RU');

        document.getElementById('dayIncome').textContent =
            `${data.income || 0} рублей`;
    }

    async function loadMonthStats() {
        const date = currentMonth.toISOString().split('T')[0];
        const res = await fetch(`/stats?type=month&date=${date}&company_id=${companyId}`);
        const data = await res.json();

        document.getElementById('nowMonth').textContent =
            currentMonth.toLocaleDateString('ru-RU', {
                month: 'long',
                year: 'numeric'
            });

        document.getElementById('monthIncome').textContent =
            `${data.income || 0} рублей`;
    }

    function renderWorkers(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!data || !Array.isArray(data)) return;

        data.forEach(worker => {
            const div = document.createElement('div');
            div.classList.add('worker-card');

            div.innerHTML = `
                <h3>${worker.name || 'Сотрудник' + worker.worker_id}</h3>
                <p>Выручка: ${worker.income || 0} ₽</p>
                <p>Заказов: ${worker.orders_count || 0} заказов</p>
            `;

            container.appendChild(div);
        });
    }

    async function loadWorkersDay() {
        const date = currentDay.toISOString().split('T')[0];
        const res = await fetch(`/stats/workers/day?date=${date}&company_id=${companyId}`);
        const data = await res.json();
        renderWorkers('workersDay', data);
    }

    async function loadWorkersMonth() {
        const date = currentMonth.toISOString().split('T')[0];
        const res = await fetch(`/stats/workers/month?date=${date}&company_id=${companyId}`);
        const data = await res.json();
        renderWorkers('workersMonth', data);
    }

    loadDayStats();
    loadMonthStats();
    loadWorkersDay();
    loadWorkersMonth();

    document.getElementById('dayPrev').addEventListener('click', () => {
        currentDay.setDate(currentDay.getDate() - 1);
        loadDayStats();
        loadWorkersDay(); 
    });

    document.getElementById('dayNext').addEventListener('click', () => {
        currentDay.setDate(currentDay.getDate() + 1);
        loadDayStats();
        loadWorkersDay(); 
    });

    document.getElementById('monthPrev').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        loadMonthStats();
        loadWorkersMonth(); 
    });

    document.getElementById('monthNext').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        loadMonthStats();
        loadWorkersMonth(); 
    });
})
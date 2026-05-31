const menuButton = document.getElementById('menu');
const modalMenu = document.getElementById('modal-menu');

if (menuButton && modalMenu) {
    menuButton.onclick = () => modalMenu.style.display = 'flex';
    modalMenu.onclick = (event) => {
        if (event.target === event.currentTarget) {
            modalMenu.style.display = 'none';
        }
    };
}

const logoutButton = document.getElementById('logoutButton');

if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        if (confirm('Вы действительно хотите выйти?')) {
            localStorage.removeItem('user');
            window.location.href = '/start';
        }
    });
}

const userJoin = JSON.parse(localStorage.getItem('user'));
const userElement = document.getElementById('userName');

if (userJoin) {

    if (userElement) {
        userElement.textContent = userJoin.shop_name || userJoin.display_name || '';
    }
}

const menuWindow = document.getElementById('menu-window');

if (menuWindow && userJoin && userJoin.role === 'admin') {
    const adminLink = document.createElement('a');
    adminLink.href = '/admin';

    const adminButton = document.createElement('button');
    adminButton.textContent = 'Админ-панель';

    adminLink.appendChild(adminButton);
    menuWindow.appendChild(adminLink);
}

const headName = document.getElementById('headName');

if (headName && userJoin && userJoin.role === 'admin') {
    const adminLink = document.createElement('a');
    adminLink.href = '/admin';

    const adminButton = document.createElement('button');
    adminButton.textContent = 'Админ';
    adminButton.className = 'admin-head-button';

    adminLink.appendChild(adminButton);
    headName.appendChild(adminLink);
}
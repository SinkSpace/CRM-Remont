const menuButton = document.getElementById('menu');
const modalMenu = document.getElementById('modal-menu');

menuButton.onclick = () => modalMenu.style.display = 'flex';
modalMenu.onclick = (event /* объект события */) => {if (event.target === event.currentTarget) modalMenu.style.display = 'none'}; 

const logoutButton = document.getElementById('logoutButton');

if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '/join';
    });
}
const user = JSON.parse(localStorage.getItem('user'));
if (user) window.location.href = '/';

const registerButton = document.getElementById('reg');
const nameInput = document.getElementById('nameCRM');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const repeatPasswordInput = document.getElementById('repeatPassword');

registerButton.addEventListener('click', async () => {
    const display_name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const repeatPassword = repeatPasswordInput.value;

    if (!display_name || !email || !password || !repeatPassword) {
        alert('Заполните все поля');
        return;
    }

    if (password !== repeatPassword) {
        alert('Пароли не совпадают');
        return;
    }

    const passwordRegex = /^(?=.*[a-zA-Zа-яА-Я])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(password)) {
        alert(
            'Пароль должен содержать минимум 8 символов и содержать хотя бы одну букву и цифру'
        );
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                display_name,
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка регистрации');
        }

        alert('Регистрация успешна');
        window.location.href = '/join';
    } catch (error) {
        console.error('Ошибка:', error);
        alert(error.message);
    }
});
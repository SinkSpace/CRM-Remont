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
        alert('Заполни все поля');
        return;
    }

    if (password !== repeatPassword) {
        alert('Пароли не совпадают');
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
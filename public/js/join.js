const loginButton = document.getElementById('join');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

loginButton.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка входа');
        }

        localStorage.setItem('user', JSON.stringify(data.user));

        window.location.href = '/';
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert(error.message);
    }
});
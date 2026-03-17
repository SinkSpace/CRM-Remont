const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
    window.location.href = '/join';
}

async function loadProfile() {
    try {
        const response = await fetch(`/api/profile/${user.id}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки профиля');
        }

        const displayNameInput = document.getElementById('displayName');
        const shopNameInput = document.getElementById('shopName');
        const phoneInput = document.getElementById('phone');

        if (displayNameInput) {
            displayNameInput.value = data.display_name || '';
        }

        if (shopNameInput) {
            shopNameInput.value = data.shop_name || '';
        }

        if (phoneInput) {
            phoneInput.value = data.phone || '';
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert(error.message);
    }
}

loadProfile();
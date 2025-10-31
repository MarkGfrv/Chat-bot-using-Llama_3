const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');
const registerConfirmPassword = document.getElementById('registerConfirmPassword');
const registerSubmit = document.getElementById('registerSubmit');
const googleRegister = document.getElementById('googleRegister');

registerSubmit.addEventListener('click', () => {
  const username = registerUsername.value.trim();
  const password = registerPassword.value.trim();
  const confirmPassword = registerConfirmPassword.value.trim();
  if (username && password && confirmPassword) {
    if (password === confirmPassword) {
      console.log(`Регистрация успешна для пользователя ${username}!`);
      window.location.href = 'index.html';
    } else {
      console.log('Пароли не совпадают!');
    }
  } else {
    console.log('Пожалуйста, заполните все поля!');
  }
});

googleRegister.addEventListener('click', () => {
  const dummyEmail = `user${Math.floor(Math.random() * 1000)}@gmail.com`;
  console.log(`Регистрация через Google для ${dummyEmail}`);
  window.location.href = 'index.html';
});
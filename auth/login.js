const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginSubmit = document.getElementById('loginSubmit');
const googleLogin = document.getElementById('googleLogin');

loginSubmit.addEventListener('click', () => {
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();
  if (username && password) {
    console.log(`Авторизация успешна для пользователя ${username}!`);
    window.location.href = 'index.html';
  } else {
    console.log('Пожалуйста, заполните все поля!');
  }
});

googleLogin.addEventListener('click', () => {
  const dummyEmail = `user${Math.floor(Math.random() * 1000)}@gmail.com`;
  console.log(`Авторизация через Google для ${dummyEmail}`);
  window.location.href = 'index.html';
});
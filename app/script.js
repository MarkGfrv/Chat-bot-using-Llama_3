document.addEventListener('DOMContentLoaded', () => {
  const API_BASE_URL = 'http://localhost:3001';
  const chatMessages = document.getElementById('chatMessages');
  const userInput = document.getElementById('userInput');
  const sendButton = document.getElementById('sendButton');
  const voiceButton = document.getElementById('voiceButton');
  const sidebar = document.getElementById('sidebar');
  const toggleSidebar = document.getElementById('toggleSidebar');
  const chatHistoryList = document.getElementById('chatHistoryList');
  const newChatButton = document.getElementById('newChatButton');

  let chatHistory = [];
  let currentChatId = null;

  async function init() {
    await loadChatHistory();
    if (chatHistory.length > 0) {
      await loadChat(chatHistory[0].id);
    } else {
      // Сначала создаем новый чат без сообщения
      await createNewChat(true);
    }
    checkOllamaConnection();
  }

  async function createNewChat(isInitial = false) {
    if (!isInitial && chatMessages.children.length > 0) {
      await updateOrCreateChat(false, '');
    }

    chatMessages.innerHTML = '';
    currentChatId = null;

    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'chat-message bot-message flex items-start space-x-2';
    welcomeMessage.innerHTML = `
      <i class="fas fa-robot text-purple-400 mt-1"></i>
      <div class="bg-gray-700 rounded-lg p-3 max-w-lg">
        Привет! Я MusicBot на основе LLaMA 3. Отвечаю только на русском языке. Спрашивай о музыке!
      </div>
    `;
    welcomeMessage.dataset.isBot = 'true';
    welcomeMessage.dataset.content = 'Привет! Я MusicBot на основе LLaMA 3. Отвечаю только на русском языке. Спрашивай о музыке!';

    chatMessages.appendChild(welcomeMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (!isInitial) {
      await updateOrCreateChat(true, '');
    }
  }

  async function checkOllamaConnection() {
    try {
      const response = await fetch('http://localhost:11434');
      if (!response.ok) {
        addMessage('⚠️ Ollama не запущен. Пожалуйста, убедитесь, что Ollama установлен и запущен на http://localhost:11434', true);
      }
    } catch (error) {
      addMessage('⚠️ Не удалось подключиться к Ollama. Убедитесь, что сервер запущен на http://localhost:11434', true);
    }
  }

  async function sendToOllamaAPI(query) {
    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3:8b-instruct-q4_0',
          messages: [{
            role: 'system',
            content: 'Ты MusicBot - русскоязычный музыкальный ассистент. Отвечай ТОЛЬКО на русском языке. Будь кратким и информативным.'
          }, {
            role: 'user',
            content: query
          }],
          stream: false,
          options: {
            temperature: 0.7,
            num_ctx: 1024,
            top_p: 0.9
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ошибка: ${response.status}`);
      }

      const data = await response.json();
      return { text: data.message.content.trim() };
    } catch (error) {
      console.error('Ошибка Ollama:', error);
      return {
        text: 'Ошибка при обращении к LLaMA 3. Убедись, что Ollama запущен (http://localhost:11434).'
      };
    }
  }

  function addMessage(content, isBot = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message flex items-start space-x-2 ${isBot ? 'bot-message' : 'user-message justify-end'}`;

    messageDiv.innerHTML = `
      ${isBot ? '<i class="fas fa-robot text-purple-400 mt-1"></i>' : ''}
      <div class="${isBot ? 'bg-gray-700' : 'bg-purple-600'} rounded-lg p-3 max-w-lg">
        ${content}
      </div>
    `;

    messageDiv.dataset.isBot = isBot;
    messageDiv.dataset.content = content;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    updateOrCreateChat(isBot, content);
  }

  async function dbSaveChat(chat) {
    try {
      const url = chat.id ? `${API_BASE_URL}/api/chats/${chat.id}` : `${API_BASE_URL}/api/chats`;
      const method = chat.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: chat.title,
          messages: chat.messages
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Ошибка сохранения чата:', error);
      return chat;
    }
  }

  async function dbLoadChatHistory() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chats`);
      const chats = await response.json();
      return chats.map(chat => ({
        ...chat,
        messages: chat.messages || []
      }));
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
      return [];
    }
  }

  async function dbDeleteChat(chatId) {
    try {
      await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Ошибка удаления чата:', error);
    }
  }

  async function updateOrCreateChat(isBot, userContent) {
    try {
      const messageElements = Array.from(chatMessages.querySelectorAll('.chat-message'));
      const messages = messageElements.map(el => ({
        content: el.dataset.content || el.querySelector('div').textContent.trim(),
        isBot: el.dataset.isBot === 'true' || el.classList.contains('bot-message')
      }));

      if (!currentChatId) {
        let chatTitle = `Чат ${new Date().toLocaleDateString('ru-RU')}`;
        const firstUserMessage = messages.find(msg => !msg.isBot);

        if (firstUserMessage) {
          chatTitle = firstUserMessage.content.length > 30
            ? `${firstUserMessage.content.substring(0, 30)}...`
            : firstUserMessage.content;
        }

        const chat = {
          id: null,
          title: chatTitle,
          messages: messages
        };

        const savedChat = await dbSaveChat(chat);
        currentChatId = savedChat.id;
        chatHistory.unshift(savedChat);
      } else {
        const chat = chatHistory.find(c => c.id === currentChatId);
        if (chat) {
          chat.messages = messages;
          await dbSaveChat(chat);
        }
      }

      await loadChatHistory();
    } catch (error) {
      console.error('Ошибка сохранения чата:', error);
    }
  }

  async function updateHistoryList() {
    chatHistoryList.innerHTML = '';

    if (chatHistory.length === 0) {
      chatHistoryList.innerHTML = '<p class="history-empty text-gray-400">История чатов пуста</p>';
    } else {
      chatHistory.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));

      chatHistory.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'history-item p-2 hover:bg-gray-700 rounded-lg cursor-pointer flex justify-between items-center';
        item.innerHTML = `
          <span>${chat.title}</span>
          <button class="delete-chat text-gray-400 hover:text-red-400 p-1" data-id="${chat.id}">
            <i class="fas fa-trash"></i>
          </button>
        `;

        item.addEventListener('click', (e) => {
          if (!e.target.closest('.delete-chat')) {
            loadChat(chat.id);
          }
        });

        chatHistoryList.appendChild(item);
      });

      document.querySelectorAll('.delete-chat').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteChat(btn.dataset.id);
        });
      });
    }
  }

  async function loadChatHistory() {
    try {
      chatHistory = await dbLoadChatHistory();
      updateHistoryList();
    } catch (error) {
      console.error('Error loading history:', error);
      chatHistory = [];
    }
  }

  async function deleteChat(id) {
    try {
      await dbDeleteChat(id);
      chatHistory = chatHistory.filter(chat => chat.id !== parseInt(id));

      if (currentChatId === parseInt(id)) {
        createNewChat();
      }

      updateHistoryList();
    } catch (error) {
      console.error('Ошибка удаления чата:', error);
    }
  }

  async function loadChat(id) {
    try {
      const chat = chatHistory.find(c => c.id === parseInt(id));
      if (chat) {
        currentChatId = parseInt(id);
        chatMessages.innerHTML = '';

        const messages = (chat.messages || []).map(msg => ({
          content: msg.content,
          isBot: msg.is_bot !== undefined ? msg.is_bot : msg.isBot
        }));

        messages.forEach(msg => {
          addMessage(msg.content, msg.isBot);
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки чата:', error);
    }
  }

  toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('translate-x-0');
    sidebar.classList.toggle('-translate-x-full');
    toggleSidebar.innerHTML = sidebar.classList.contains('translate-x-0') ?
      '<i class="fas fa-times"></i>' :
      '<i class="fas fa-bars"></i>';
  });

  newChatButton.addEventListener('click', createNewChat);

  sendButton.addEventListener('click', async () => {
    const query = userInput.value.trim();
    if (!query) return;

    addMessage(query, false);
    userInput.value = '';

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message bot-message flex items-start space-x-2';
    loadingDiv.innerHTML = `
      <i class="fas fa-robot text-purple-400 mt-1"></i>
      <div class="bg-gray-700 rounded-lg p-3 max-w-lg">
        <div class="flex space-x-2">
          <div class="w-2 h-2 rounded-full bg-purple-400 animate-bounce"></div>
          <div class="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style="animation-delay: 0.2s"></div>
          <div class="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style="animation-delay: 0.4s"></div>
        </div>
      </div>
    `;
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const response = await sendToOllamaAPI(query);
      chatMessages.removeChild(loadingDiv);
      addMessage(response.text, true);
    } catch (error) {
      chatMessages.removeChild(loadingDiv);
      addMessage('Произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз.', true);
      console.error('Ошибка:', error);
    }
  });

  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendButton.click();
  });

  voiceButton.addEventListener('click', () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.lang = 'ru-RU';

      recognition.onstart = () => {
        voiceButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        voiceButton.classList.add('bg-red-600');
        voiceButton.classList.remove('bg-blue-600');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        sendButton.click();
      };

      recognition.onerror = () => {
        addMessage('Ошибка распознавания голоса. Попробуй снова!', true);
      };

      recognition.onend = () => {
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceButton.classList.remove('bg-red-600');
        voiceButton.classList.add('bg-blue-600');
      };

      recognition.start();
    } else {
      addMessage('Голосовой ввод не поддерживается в этом браузере.', true);
    }
  });

  document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.getAttribute('data-query');
      userInput.value = query;
      sendButton.click();
    });
  });

  init();
});
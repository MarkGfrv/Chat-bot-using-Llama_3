const axios = require('axios');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');

// Конфигурация тестирования
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001/api',
  testIterations: 5,
  testDelay: 300,
  chartWidth: 1000,
  chartHeight: 600
};

async function runPerformanceTest() {
  const metrics = {
    timestamps: [],
    createTimes: [],
    readAllTimes: [],
    readSingleTimes: [],
    updateTimes: [],
    deleteTimes: []
  };

  console.log(`Запуск теста производительности (${TEST_CONFIG.testIterations} итераций)...`);

  let createdChatId = null;

  try {
    for (let i = 0; i < TEST_CONFIG.testIterations; i++) {
      // Тест создания чата
      const createStart = Date.now();
      const createResponse = await axios.post(`${TEST_CONFIG.baseUrl}/chats`, {
        title: `Тест ${i+1}`,
        messages: [
          { content: `Тестовое сообщение ${i+1}`, isBot: false },
          { content: `Тестовый ответ ${i+1}`, isBot: true }
        ]
      });
      const createEnd = Date.now();

      createdChatId = createResponse.data.id;
      metrics.createTimes.push(createEnd - createStart);
      metrics.timestamps.push(new Date().toLocaleTimeString());

      // Тест чтения всех чатов
      const readAllStart = Date.now();
      await axios.get(`${TEST_CONFIG.baseUrl}/chats`);
      const readAllEnd = Date.now();
      metrics.readAllTimes.push(readAllEnd - readAllStart);

      // Тест чтения конкретного чата
      const readSingleStart = Date.now();
      await axios.get(`${TEST_CONFIG.baseUrl}/chats/${createdChatId}/messages`);
      const readSingleEnd = Date.now();
      metrics.readSingleTimes.push(readSingleEnd - readSingleStart);

      // Тест обновления чата
      const updateStart = Date.now();
      await axios.put(`${TEST_CONFIG.baseUrl}/chats/${createdChatId}`, {
        title: `Обновленный тест ${i+1}`,
        messages: [
          { content: `Обновленное сообщение ${i+1}`, isBot: false },
          { content: `Обновленный ответ ${i+1}`, isBot: true }
        ]
      });
      const updateEnd = Date.now();
      metrics.updateTimes.push(updateEnd - updateStart);

      // Тест удаления чата
      const deleteStart = Date.now();
      await axios.delete(`${TEST_CONFIG.baseUrl}/chats/${createdChatId}`);
      const deleteEnd = Date.now();
      metrics.deleteTimes.push(deleteEnd - deleteStart);

      // Задержка между тестами
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    }

    console.log('Тестирование завершено. Генерация графика...');
    await generateChart(metrics);
  } catch (error) {
    console.error('Ошибка во время тестирования:', error.message);
    if (error.response) {
      console.error('Детали ошибки:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config.url
      });
    }
  }
}

async function generateChart(metrics) {
  const configuration = {
    type: 'line',
    data: {
      labels: metrics.timestamps,
      datasets: [
        {
          label: 'Создание чата (мс)',
          data: metrics.createTimes,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
          borderWidth: 2
        },
        {
          label: 'Чтение всех чатов (мс)',
          data: metrics.readAllTimes,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1,
          borderWidth: 2
        },
        {
          label: 'Чтение одного чата (мс)',
          data: metrics.readSingleTimes,
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.1,
          borderWidth: 2
        },
        {
          label: 'Обновление чата (мс)',
          data: metrics.updateTimes,
          borderColor: 'rgb(255, 206, 86)',
          backgroundColor: 'rgba(255, 206, 86, 0.2)',
          tension: 0.1,
          borderWidth: 2
        },
        {
          label: 'Удаление чата (мс)',
          data: metrics.deleteTimes,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Производительность API чата',
          font: { size: 18 }
        },
        legend: {
          position: 'top',
          labels: { font: { size: 14 } }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Время выполнения (мс)',
            font: { size: 14 }
          },
          ticks: { font: { size: 12 } }
        },
        x: {
          title: {
            display: true,
            text: 'Время теста',
            font: { size: 14 }
          },
          ticks: { font: { size: 12 } }
        }
      }
    }
  };

  const canvasRenderService = new ChartJSNodeCanvas({
    width: TEST_CONFIG.chartWidth,
    height: TEST_CONFIG.chartHeight,
    backgroundColour: 'white',
    plugins: {
      modern: ['chartjs-plugin-annotation']
    }
  });

  const image = await canvasRenderService.renderToBuffer(configuration);
  const filename = `performance-test-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  fs.writeFileSync(filename, image);
  console.log(`График сохранен как ${filename}`);
}

// Запуск теста
runPerformanceTest();
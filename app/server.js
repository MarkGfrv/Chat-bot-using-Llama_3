const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3001;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '5595515m',
  port: 5432
});

app.use(cors());
app.use(express.json());

app.get('/api/chats', async (req, res) => {
  try {
    const chatsResult = await pool.query('SELECT * FROM chats ORDER BY created_at DESC');
    const chats = chatsResult.rows;

    for (const chat of chats) {
      const messagesResult = await pool.query(
        'SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
        [chat.id]
      );
      chat.messages = messagesResult.rows;
    }

    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    const { title, messages } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const chatResult = await client.query(
        'INSERT INTO chats (title) VALUES ($1) RETURNING *',
        [title]
      );
      const chatId = chatResult.rows[0].id;

      for (const msg of messages) {
        await client.query(
          'INSERT INTO messages (chat_id, content, is_bot) VALUES ($1, $2, $3)',
          [chatId, msg.content, msg.isBot]
        );
      }

      await client.query('COMMIT');

      const fullChat = {
        ...chatResult.rows[0],
        messages: messages
      };
      res.json(fullChat);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/chats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, messages } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE chats SET title = $1 WHERE id = $2',
        [title, id]
      );

      await client.query(
        'DELETE FROM messages WHERE chat_id = $1',
        [id]
      );

      for (const msg of messages) {
        await client.query(
          'INSERT INTO messages (chat_id, content, is_bot) VALUES ($1, $2, $3)',
          [id, msg.content, msg.isBot]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chats/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'DELETE FROM messages WHERE chat_id = $1',
        [id]
      );

      await client.query(
        'DELETE FROM chats WHERE id = $1',
        [id]
      );

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
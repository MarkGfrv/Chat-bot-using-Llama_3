CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chats(id),
    content TEXT,
    is_bot BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);
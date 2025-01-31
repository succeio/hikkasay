import dotenv from 'dotenv';

// Загружаем переменные окружения из .env файла
dotenv.config();

// Определяем интерфейс для конфигурации
interface Config {
    botToken: string | undefined;
}

const config: Config = {
    botToken: process.env.BOT_TOKEN
};

export default config;

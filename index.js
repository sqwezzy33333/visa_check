import axios from 'axios';
import * as cheerio from 'cheerio'; // Правильный импорт
import * as fs from 'fs/promises';
import TelegramBot from 'node-telegram-bot-api';

const DATA_FILE = 'news.txt';
const TARGET_URL = 'https://it.tlscontact.com/by/msq/page.php?pid=news&l=ru'; // Замените на URL целевой страницы

// Замените на ваш токен и ID чата
const TELEGRAM_BOT_TOKEN = "7101593002:AAG-64_zesJof4Lffe0p1fymvsXJ8IEKLfo";
const TELEGRAM_CHAT_ID = "-1002493780047"; // ID чата куда бот будет отправлять сообщения
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

async function sendTelegramMessage(message) {
    try {
        await bot.sendMessage(TELEGRAM_CHAT_ID, message);
        console.log('Уведомление отправлено в Telegram:', message);
    } catch (error) {
        console.error('Ошибка отправки уведомления в Telegram:', error.message);
    }
}

async function getPageHTML(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения страницы:', error.message);
        return null;
    }
}

function parseH3(html) {
    if (!html) return '';

    const $ = cheerio.load(html);
    return $('h3').first();
}


async function loadPreviousNews() {
    try {
        return await fs.readFile(DATA_FILE, 'utf-8');
    } catch (error) {
        return 'Новость не найдена';
    }
}

async function saveCurrentNews(news) {
    await fs.writeFile(DATA_FILE, news.text(), 'utf-8');
}


async function notifyNewNews(news) {

    let message = 'Обнаружена новая новость:\n';

    await sendTelegramMessage(message + news.text());
}


async function checkNewNews() {
    await sendTelegramMessage("Запущена проверка содержимого сайта - " + TARGET_URL);
    const html = await getPageHTML(TARGET_URL);
    if (!html) return;

    const currentNews = parseH3(html);
    const previousNews = await loadPreviousNews();

    if (currentNews.text() !== previousNews) {
        await notifyNewNews(currentNews);
    } else {
        await sendTelegramMessage("Новых новостей нет");
    }
    await saveCurrentNews(currentNews);
}

async function main() {
    await checkNewNews();
    //Запускаем проверку каждые 5 минут
    setInterval(checkNewNews, 5 * 60 * 1000);
}

await main();

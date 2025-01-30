import axios from 'axios';
import * as cheerio from 'cheerio'; // Правильный импорт
import * as fs from 'fs/promises';
import TelegramBot from 'node-telegram-bot-api';
import moment from 'moment';

const DATA_FILE = 'news.txt';
const TARGET_URL = 'https://it.tlscontact.com/by/msq/page.php?pid=news&l=ru'; // Замените на URL целевой страницы
let lastTime = moment().format('DD.MM - HH.mm');

let currentNews = '';

// Замените на ваш токен и ID чата
const TELEGRAM_BOT_TOKEN = "7101593002:AAG-64_zesJof4Lffe0p1fymvsXJ8IEKLfo";
const TELEGRAM_CHAT_ID = "-1002493780047";
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {polling: true});

bot.on('message', async (msg) => {
    const text = msg.text;
    if (!text || !text.toLowerCase().includes('last') || !currentNews.text) {
        return;
    }
    const message = `Последняя новость: "${currentNews.text()}".
Время проверки: ${lastTime}`
    await sendTelegramMessage(message, msg.chat.id)
});

async function sendTelegramMessage(message, id = null) {
    try {
        await bot.sendMessage(id || TELEGRAM_CHAT_ID, message);
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
    console.log(news.text() + ' - ' + lastTime);
    await fs.writeFile(DATA_FILE, news.text(), 'utf-8');
}


async function notifyNewNews(news) {

    let message = 'Обнаружена новая новость:\n';

    await sendTelegramMessage(message + news.text());
}


async function checkNewNews() {
    const html = await getPageHTML(TARGET_URL);
    if (!html) return;

    currentNews = parseH3(html);
    const previousNews = await loadPreviousNews();
    lastTime = moment().format('DD.MM - HH.mm');
    if (currentNews.text() !== previousNews) {
        await notifyNewNews(currentNews);
    }
    await saveCurrentNews(currentNews);
}

async function main() {
    await checkNewNews();
    //Запускаем проверку каждые 5 минут
    setInterval(checkNewNews, 3 * 60 * 1000);
}

await main();

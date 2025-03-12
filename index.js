import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import TelegramBot from 'node-telegram-bot-api';
import moment from 'moment';

const DATA_FILES = ['news_ru.txt', 'news_en.txt'];
const TARGET_URLS = ['https://it.tlscontact.com/by/msq/page.php?pid=news&l=ru', 'https://it.tlscontact.com/by/msq/page.php?pid=news&l=en'];
let lastTime = moment().format('DD.MM - HH.mm');

let currentNews =  {
    'news_ru.txt': null,
    'news_en.txt': null,
}

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


async function loadPreviousNews(path) {
    try {
        return await fs.readFile(path, 'utf-8');
    } catch (error) {
        return 'Новость не найдена';
    }
}

async function saveCurrentNews(news, filename) {
    console.log(news.text() + ' - ' + lastTime);
    await fs.writeFile(filename, news.text(), 'utf-8');
}


async function notifyNewNews(news, url) {

    let message = 'Обнаружена новая новость:\n';

    await sendTelegramMessage(message + news.text() + '\n' + 'Ссылка - ' + url);
}


async function checkNewNews() {
    let index = -1;
    for (const url of TARGET_URLS) {
        index++;
        const fileName = DATA_FILES[index];
        const html = await getPageHTML(url);
        if (!html) continue;

        currentNews[fileName] = parseH3(html);
        const previousNews = await loadPreviousNews(fileName);
        lastTime = moment().format('DD.MM - HH.mm');
        if (currentNews[fileName]?.text() !== previousNews) {
            await notifyNewNews(currentNews, url);
        }
        await saveCurrentNews(currentNews, fileName);
    }

}

async function main() {
    await checkNewNews();

    setInterval(checkNewNews, 3 * 60 * 1000);
}

await main();

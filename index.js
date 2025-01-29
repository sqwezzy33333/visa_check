import axios from 'axios';
import * as cheerio from 'cheerio'; // Правильный импорт
import * as fs from 'fs/promises';
import TelegramBot from 'node-telegram-bot-api';

const DATA_FILE = 'news.json';
const TARGET_URL = 'https://github.com/sqwezzy33333/visa_check'; // Замените на URL целевой страницы

// Замените на ваш токен и ID чата
const TELEGRAM_BOT_TOKEN = "7101593002:AAG-64_zesJof4Lffe0p1fymvsXJ8IEKLfo";
const TELEGRAM_CHAT_ID = "-1002493780047"; // ID чата куда бот будет отправлять сообщения
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

async function sendTelegramMessage(message) {
    try {
        await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML' });
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

function parseNews(html) {
    if (!html) return [];

    const $ = cheerio.load(html);
    const newsItems = [];
    $('.news-item').each((i, el) => {
        const title = $(el).find('.news-title').text().trim();
        const link = $(el).find('a').attr('href');
        const date = $(el).find('.news-date').text().trim();

        newsItems.push({ title, link, date });
    });

    return newsItems;
}


async function loadPreviousNews() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function saveCurrentNews(news) {
    await fs.writeFile(DATA_FILE, JSON.stringify(news, null, 2), 'utf-8');
}

function compareNews(previousNews, currentNews) {
    const previousLinks = new Set(previousNews.map(item => item.link));
    const newNews = currentNews.filter(item => !previousLinks.has(item.link));
    return newNews;
}

async function notifyNewNews(news) {
    if (news.length === 0) {
        console.log('Нет новых новостей.');
        return;
    }

    let message = 'Обнаружены новые новости:\n';
    news.forEach(item => {
        message += `- <a href="${item.link}">${item.title}</a>\n`;
    });

    await sendTelegramMessage(message);
}


async function checkNewNews() {
    const html = await getPageHTML(TARGET_URL);
    if (!html) return;

    const currentNews = parseNews(html);
    const previousNews = await loadPreviousNews();
    const newNews = compareNews(previousNews, currentNews);

    if(newNews.length > 0) {
        await notifyNewNews(newNews);
    }
    await saveCurrentNews(currentNews);
}

async function main(){
    await checkNewNews();
    //Запускаем проверку каждые 5 минут
    setInterval(checkNewNews, 5 * 60 * 1000);
}

await main();

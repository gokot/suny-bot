const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');

const BOT_TOKEN = '8909651086:AAEL5CD6bWu5_oAcyiccYlh-ezge_619yMk';
const YOOMONEY_WALLET = '4100119542546884';
const ADMINS = ['gokot', 'Pullpy'];

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// НОВЫЕ ПРИВИЛЕГИИ (старые удалены)
const PRICES = { 
    'MODER': 350, 
    'ADMIN': 600, 
    'MONSTER': 500, 
    'PASXA': 700 
};

const payments = {};

// Хранилище chatId админов
const adminChatIds = {};

// Функция отправки уведомлений админам
async function notifyAdmins(message) {
    console.log(`📤 Отправка уведомления админам...`);
    
    for (const admin of ADMINS) {
        if (adminChatIds[admin]) {
            try {
                await bot.sendMessage(adminChatIds[admin], message, { parse_mode: 'Markdown' });
                console.log(`✅ Уведомление отправлено ${admin} (chatId)`);
                continue;
            } catch (err) {
                console.log(`❌ Ошибка chatId для ${admin}: ${err.message}`);
            }
        }
        
        try {
            await bot.sendMessage(`@${admin}`, message, { parse_mode: 'Markdown' });
            console.log(`✅ Уведомление отправлено @${admin}`);
        } catch (err) {
            console.log(`❌ Не удалось отправить @${admin}: ${err.message}`);
        }
    }
}

// РЕГИСТРАЦИЯ АДМИНОВ
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    
    console.log(`📩 Сообщение от @${username || 'нет'}, chatId: ${chatId}`);
    
    if (username && ADMINS.includes(username.toLowerCase())) {
        adminChatIds[username.toLowerCase()] = chatId;
        console.log(`👑 АДМИН @${username} ЗАРЕГИСТРИРОВАН! chatId: ${chatId}`);
        bot.sendMessage(chatId, 
            `✅ **Вы зарегистрированы как администратор!**\n\n` +
            `📊 Теперь вы будете получать уведомления о всех заказах.\n\n` +
            `🛠 **Доступные команды:**\n` +
            `• /approve [код] — подтвердить оплату ✅\n` +
            `• /cancel [код] — отменить заказ ❌\n` +
            `• /stats — статистика 📈\n` +
            `• /orders — список активных заказов 📋`,
            { parse_mode: 'Markdown' }
        );
    }
    
    bot.sendMessage(chatId,
        `🎮 **Добро пожаловать в магазин SunyWorld!**\n\n` +
        `💰 **ПРИВИЛЕГИИ:**\n` +
        `• 🛡️ MODER — 350₽\n` +
        `• 👑 ADMIN — 600₽\n` +
        `• 👹 MONSTER — 500₽\n` +
        `• 🐣 PASXA — 700₽\n\n` +
        `📝 **Как купить:**\n` +
        `/buy [привилегия] [ник]\n` +
        `Пример: /buy MODER Gamer228\n\n` +
        `👑 **Администраторы:**\n` +
        `• [@gokot](https://t.me/gokot)\n` +
        `• [@Pullpy](https://t.me/Pullpy)`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
});

// ПОКУПКА
bot.onText(/\/buy (\S+) (\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const privilege = match[1].toUpperCase();
    const nickname = match[2];
    
    if (!PRICES[privilege]) {
        bot.sendMessage(chatId, '❌ Нет такой привилегии! Доступно: MODER, ADMIN, MONSTER, PASXA');
        return;
    }
    
    const amount = PRICES[privilege];
    const paymentId = crypto.randomBytes(4).toString('hex');
    
    payments[paymentId] = {
        chatId: chatId,
        nickname: nickname,
        privilege: privilege,
        rubPrice: amount,
        status: 'pending',
        username: msg.from.username || 'нет',
        date: new Date().toLocaleString()
    };
    
    const paymentUrl = `https://yoomoney.ru/transfer/quickpay?receiver=${YOOMONEY_WALLET}&quickpay-form=small&sum=${amount}&label=${paymentId}&targets=${encodeURIComponent(`${privilege} для ${nickname}`)}`;
    
    bot.sendMessage(chatId,
        `💎 **${privilege} для ${nickname}**\n\n` +
        `💰 Сумма: ${amount} ₽\n\n` +
        `📌 **Кошелёк ЮMoney:** \`4100 1195 4254 6884\`\n\n` +
        `🔗 [ОПЛАТИТЬ ЧЕРЕЗ ЮMONEY](${paymentUrl})\n\n` +
        `✅ **После оплаты отправьте:** /check ${paymentId}\n\n` +
        `🆔 **Код платежа:** \`${paymentId}\``,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
    
    await notifyAdmins(
        `🆕 **НОВЫЙ ЗАКАЗ!**\n\n` +
        `🆔 Код: \`${paymentId}\`\n` +
        `👤 Игрок: ${nickname}\n` +
        `🎁 Привилегия: ${privilege}\n` +
        `💰 Сумма: ${amount} ₽\n` +
        `👤 Telegram: @${msg.from.username || 'нет'}\n` +
        `⏰ Время: ${payments[paymentId].date}\n\n` +
        `✅ Подтвердить: /approve ${paymentId}\n` +
        `❌ Отменить: /cancel ${paymentId}`
    );
});

// ПРОВЕРКА ОПЛАТЫ
bot.onText(/\/check (\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const paymentId = match[1];
    const p = payments[paymentId];
    
    if (!p) {
        bot.sendMessage(chatId, '❌ **Платёж не найден**\n\nПроверьте правильность кода.', { parse_mode: 'Markdown' });
        return;
    }
    
    if (p.status === 'completed') {
        bot.sendMessage(chatId,
            `✅ **Привилегия ${p.privilege} уже активирована** для *${p.nickname}*!\n\n` +
            `🎮 Заходите на сервер \`mc.sunyworld.me\``,
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    bot.sendMessage(chatId,
        `⏳ **Платёж проверяется**\n\n` +
        `👤 Игрок: ${p.nickname}\n` +
        `🎁 Привилегия: ${p.privilege}\n` +
        `💰 Сумма: ${p.rubPrice} ₽\n\n` +
        `📢 Вопросы: [@gokot](https://t.me/gokot), [@Pullpy](https://t.me/Pullpy)\n\n` +
        `🆔 Код: \`${paymentId}\``,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
    
    await notifyAdmins(
        `🟡 **ПРОВЕРКА ПЛАТЕЖА ПОКУПАТЕЛЕМ**\n\n` +
        `🆔 Код: \`${paymentId}\`\n` +
        `👤 Игрок: ${p.nickname}\n` +
        `🎁 Привилегия: ${p.privilege}\n` +
        `💰 Сумма: ${p.rubPrice} ₽\n` +
        `👤 Telegram: @${msg.from.username || 'нет'}\n\n` +
        `✅ Подтвердить: /approve ${paymentId}`
    );
});

// /approve - ПОДТВЕРЖДЕНИЕ ОПЛАТЫ
bot.onText(/\/approve (\S+)/, async (msg, match) => {
    const adminChatId = msg.chat.id;
    const adminUsername = msg.from.username;
    
    console.log(`🔑 Команда /approve от @${adminUsername}`);
    
    if (!adminUsername || !ADMINS.includes(adminUsername.toLowerCase())) {
        bot.sendMessage(adminChatId, '❌ У вас нет прав на эту команду!');
        return;
    }
    
    const paymentId = match[1];
    const p = payments[paymentId];
    
    if (!p) {
        bot.sendMessage(adminChatId, `❌ Платёж с кодом ${paymentId} не найден!`);
        return;
    }
    
    if (p.status === 'completed') {
        bot.sendMessage(adminChatId, `⚠️ Привилегия для ${p.nickname} уже была активирована!`);
        return;
    }
    
    p.status = 'completed';
    console.log(`✅ АДМИН @${adminUsername} подтвердил оплату ${paymentId} для ${p.nickname}`);
    
    // Сообщение для покупателя
    const buyerMessage = 
        `✅ **ПЛАТЁЖ УСПЕШНО ПОДТВЕРЖДЁН!**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎁 **Привилегия *${p.privilege}***\n` +
        `👤 **Игрок:** *${p.nickname}*\n` +
        `💰 **Сумма:** ${p.rubPrice} ₽\n\n` +
        `⏳ **Донат будет выдан в течении дня!**\n\n` +
        `✨ Обычно это занимает **15-30 минут**.\n\n` +
        `❓ **Вопросы?** Напишите: @gokot\n\n` +
        `🎮 **Сервер:** \`mc.sunyworld.me\`\n\n` +
        `❤️ **Спасибо за поддержку SunyWorld!**`;
    
    try {
        await bot.sendMessage(p.chatId, buyerMessage, { parse_mode: 'Markdown' });
        console.log(`✅ Сообщение отправлено покупателю ${p.nickname}`);
        bot.sendMessage(adminChatId, `✅ Сообщение отправлено покупателю ${p.nickname}!`);
    } catch (err) {
        console.log(`❌ Ошибка при отправке покупателю: ${err.message}`);
        bot.sendMessage(adminChatId, `⚠️ Не удалось отправить сообщение покупателю!`);
    }
    
    bot.sendMessage(adminChatId,
        `✅ **Привилегия подтверждена!**\n\n` +
        `👤 Игрок: ${p.nickname}\n` +
        `🎁 Привилегия: ${p.privilege}\n` +
        `💰 Сумма: ${p.rubPrice} ₽\n` +
        `🆔 Код: ${paymentId}`,
        { parse_mode: 'Markdown' }
    );
});

// ОТМЕНА ЗАКАЗА
bot.onText(/\/cancel (\S+)/, async (msg, match) => {
    const adminUsername = msg.from.username;
    
    if (!adminUsername || !ADMINS.includes(adminUsername.toLowerCase())) {
        bot.sendMessage(msg.chat.id, '❌ У вас нет прав!');
        return;
    }
    
    const paymentId = match[1];
    const p = payments[paymentId];
    
    if (!p) {
        bot.sendMessage(msg.chat.id, '❌ Платёж не найден!');
        return;
    }
    
    if (p.status === 'completed') {
        bot.sendMessage(msg.chat.id, '⚠️ Привилегия уже активирована, отмена невозможна!');
        return;
    }
    
    try {
        await bot.sendMessage(p.chatId,
            `❌ **ЗАКАЗ ОТМЕНЁН**\n\n` +
            `😞 Заказ на *${p.privilege}* для *${p.nickname}* отменён.\n\n` +
            `📢 Вопросы: [@gokot](https://t.me/gokot)`,
            { parse_mode: 'Markdown', disable_web_page_preview: true }
        );
    } catch (err) {}
    
    bot.sendMessage(msg.chat.id, `❌ Заказ ${paymentId} отменён!`);
});

// АКТИВНЫЕ ЗАКАЗЫ
bot.onText(/\/orders/, async (msg) => {
    const adminUsername = msg.from.username;
    
    if (!adminUsername || !ADMINS.includes(adminUsername.toLowerCase())) {
        bot.sendMessage(msg.chat.id, '❌ У вас нет прав!');
        return;
    }
    
    const pendingOrders = Object.entries(payments).filter(([_, p]) => p.status === 'pending');
    
    if (pendingOrders.length === 0) {
        bot.sendMessage(msg.chat.id, '📭 **Нет активных заказов**', { parse_mode: 'Markdown' });
        return;
    }
    
    let ordersText = `📋 **Активные заказы (${pendingOrders.length})**\n\n`;
    for (const [id, p] of pendingOrders) {
        ordersText += `🆔 \`${id}\`\n`;
        ordersText += `   👤 ${p.nickname} | 🎁 ${p.privilege} | 💰 ${p.rubPrice}₽\n`;
        ordersText += `   ✅ /approve ${id}\n\n`;
    }
    
    bot.sendMessage(msg.chat.id, ordersText, { parse_mode: 'Markdown' });
});

// СТАТИСТИКА
bot.onText(/\/stats/, async (msg) => {
    const adminUsername = msg.from.username;
    
    if (!adminUsername || !ADMINS.includes(adminUsername.toLowerCase())) {
        bot.sendMessage(msg.chat.id, '❌ У вас нет прав!');
        return;
    }
    
    const total = Object.keys(payments).length;
    const completed = Object.values(payments).filter(p => p.status === 'completed').length;
    const pending = total - completed;
    let totalRub = 0;
    Object.values(payments).forEach(p => { if (p.status === 'completed') totalRub += p.rubPrice; });
    
    bot.sendMessage(msg.chat.id,
        `📊 **СТАТИСТИКА МАГАЗИНА**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 Всего заказов: **${total}**\n` +
        `✅ Выполнено: **${completed}**\n` +
        `⏳ В обработке: **${pending}**\n` +
        `💰 Всего собрано: **${totalRub} ₽**`,
        { parse_mode: 'Markdown' }
    );
});

// /shop
bot.onText(/\/shop/, (msg) => {
    const text = 
        `🛒 **МАГАЗИН SUNYWORLD**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🛡️ **MODER** — 350₽\n` +
        `   /fly, /heal, /kit\n\n` +
        `👑 **ADMIN** — 600₽\n` +
        `   /vanish, /god, полный доступ\n\n` +
        `👹 **MONSTER** — 500₽\n` +
        `   /fly, /heal, особый набор\n\n` +
        `🐣 **PASXA** — 700₽\n` +
        `   Все возможности + уникальный префикс\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 **Купить:** /buy [привилегия] [ник]\n` +
        `Пример: /buy MODER Gamer228`;
    
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

// /help
bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `📖 **КОМАНДЫ БОТА**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 **Для всех:**\n` +
        `• /start — Главное меню 🎮\n` +
        `• /buy [прив] [ник] — Купить привилегию 💎\n` +
        `• /check [код] — Проверить оплату 🔍\n` +
        `• /shop — Список товаров 🛒\n` +
        `• /help — Эта справка 📖\n\n` +
        `👑 **Для администраторов:**\n` +
        `• /approve [код] — Подтвердить оплату ✅\n` +
        `• /cancel [код] — Отменить заказ ❌\n` +
        `• /orders — Активные заказы 📋\n` +
        `• /stats — Статистика 📊\n\n` +
        `👑 **Администраторы:**\n` +
        `• [@gokot](https://t.me/gokot)\n` +
        `• [@Pullpy](https://t.me/Pullpy)`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
});

console.log('✅ БОТ SUNYWORLD ЗАПУЩЕН!');
console.log(`👑 Администраторы: @${ADMINS.join(', @')}`);
console.log('');
console.log(`💰 НОВЫЕ ЦЕНЫ: MODER 350₽, ADMIN 600₽, MONSTER 500₽, PASXA 700₽`);

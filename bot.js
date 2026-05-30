const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');

const BOT_TOKEN = '8909651086:AAEL5CD6bWu5_oAcyiccYlh-ezge_619yMk';
const YOOMONEY_WALLET = '4100119542546884';
const ADMINS = ['gokot', 'Pullpy'];

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ПРИВИЛЕГИИ (рубли и звёзды) - 1 Star ≈ 1.5 рубля
const PRICES = { 
    'PEGAS': { rub: 50, stars: 34 },
    'GOD': { rub: 100, stars: 67 },
    'MODER': { rub: 350, stars: 234 },
    'ML.MODER': { rub: 400, stars: 267 },
    'MONSTER': { rub: 500, stars: 334 },
    'ADMIN': { rub: 600, stars: 400 },
    'PASXA': { rub: 700, stars: 467 }
};

const payments = {};
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
        `• 🦄 PEGAS — 50₽ / 34⭐\n` +
        `• 👑 GOD — 100₽ / 67⭐\n` +
        `• 🛡️ MODER — 350₽ / 234⭐\n` +
        `• 🤖 ML.MODER — 400₽ / 267⭐\n` +
        `• 👹 MONSTER — 500₽ / 334⭐\n` +
        `• ⚡ ADMIN — 600₽ / 400⭐\n` +
        `• 🐣 PASXA — 700₽ / 467⭐\n\n` +
        `📝 **Как купить:**\n` +
        `/buy [привилегия] [ник]\n` +
        `Пример: /buy MODER Gamer228\n\n` +
        `👑 **Администраторы:**\n` +
        `• [@gokot](https://t.me/gokot)\n` +
        `• [@Pullpy](https://t.me/Pullpy)`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
});

// ПОКУПКА - выбор способа оплаты
bot.onText(/\/buy (\S+) (\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let privilege = match[1].toUpperCase();
    const nickname = match[2];
    
    if (privilege === 'ML.MODER' || privilege === 'MLMODER') {
        privilege = 'ML.MODER';
    }
    
    if (!PRICES[privilege]) {
        bot.sendMessage(chatId, '❌ Нет такой привилегии! Доступно: PEGAS, GOD, MODER, ML.MODER, MONSTER, ADMIN, PASXA');
        return;
    }
    
    const rubPrice = PRICES[privilege].rub;
    const starsPrice = PRICES[privilege].stars;
    const paymentId = crypto.randomBytes(4).toString('hex');
    
    payments[paymentId] = {
        chatId: chatId,
        nickname: nickname,
        privilege: privilege,
        rubPrice: rubPrice,
        starsPrice: starsPrice,
        status: 'pending',
        username: msg.from.username || 'нет',
        date: new Date().toLocaleString()
    };
    
    const keyboard = {
        inline_keyboard: [
            [{ text: '💳 Оплатить рублями (ЮMoney)', callback_data: `rub_${paymentId}` }],
            [{ text: '⭐ Оплатить Telegram Stars', callback_data: `stars_${paymentId}` }]
        ]
    };
    
    bot.sendMessage(chatId,
        `💎 **${privilege} для ${nickname}**\n\n` +
        `💰 Рубли: ${rubPrice} ₽\n` +
        `⭐ Telegram Stars: ${starsPrice}\n\n` +
        `⬇️ **Выберите способ оплаты:** ⬇️`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
    );
});

// ОБРАБОТКА КНОПОК ВЫБОРА ОПЛАТЫ
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data.startsWith('rub_')) {
        const paymentId = data.replace('rub_', '');
        const p = payments[paymentId];
        
        if (!p) {
            bot.sendMessage(chatId, '❌ Платёж не найден');
            return;
        }
        
        const paymentUrl = `https://yoomoney.ru/transfer/quickpay?receiver=${YOOMONEY_WALLET}&quickpay-form=small&sum=${p.rubPrice}&label=${paymentId}&targets=${encodeURIComponent(`${p.privilege} для ${p.nickname}`)}`;
        
        bot.sendMessage(chatId,
            `💳 **Оплата рублями**\n\n` +
            `📌 **Кошелёк ЮMoney:** \`4100 1195 4254 6884\`\n` +
            `💰 **Сумма:** ${p.rubPrice} ₽\n\n` +
            `🔗 [ОПЛАТИТЬ](${paymentUrl})\n\n` +
            `✅ После оплаты: /check ${paymentId}\n` +
            `🆔 Код: \`${paymentId}\``,
            { parse_mode: 'Markdown', disable_web_page_preview: true }
        );
        
        await notifyAdmins(
            `💳 **ОПЛАТА РУБЛЯМИ**\n\n` +
            `🆔 Код: \`${paymentId}\`\n` +
            `👤 Игрок: ${p.nickname}\n` +
            `🎁 Привилегия: ${p.privilege}\n` +
            `💰 Сумма: ${p.rubPrice} ₽\n\n` +
            `✅ /approve ${paymentId}`
        );
        
    } else if (data.startsWith('stars_')) {
        const paymentId = data.replace('stars_', '');
        const p = payments[paymentId];
        
        if (!p) {
            bot.sendMessage(chatId, '❌ Платёж не найден');
            return;
        }
        
        // СОЗДАЁМ ИНВОЙС ДЛЯ TELEGRAM STARS
        try {
            const invoice = {
                chat_id: chatId,
                title: p.privilege,
                description: `Привилегия "${p.privilege}" для игрока ${p.nickname} на SunyWorld`,
                payload: JSON.stringify({ paymentId, nickname: p.nickname, privilege: p.privilege, starsAmount: p.starsPrice }),
                provider_token: '',
                currency: 'XTR',
                prices: [{ label: p.privilege, amount: p.starsPrice }],
                start_parameter: `buy_stars_${paymentId}`,
                photo_url: 'https://cdn-icons-png.flaticon.com/512/2917/2917995.png',
                photo_size: 512
            };
            
            await bot.sendInvoice(chatId, invoice);
            
            await notifyAdmins(
                `⭐ **ОПЛАТА STARS**\n\n` +
                `🆔 Код: \`${paymentId}\`\n` +
                `👤 Игрок: ${p.nickname}\n` +
                `🎁 Привилегия: ${p.privilege}\n` +
                `⭐ Сумма: ${p.starsPrice} Stars\n\n` +
                `✅ После оплаты Stars привилегия выдастся автоматически!`
            );
            
        } catch (err) {
            console.error('Stars error:', err.message);
            bot.sendMessage(chatId, 
                `❌ **Оплата Telegram Stars временно недоступна**\n\n` +
                `💡 Пожалуйста, выберите оплату рублями.\n\n` +
                `👑 Администраторы: [@gokot](https://t.me/gokot), [@Pullpy](https://t.me/Pullpy)`,
                { parse_mode: 'Markdown', disable_web_page_preview: true }
            );
        }
    }
    
    await bot.answerCallbackQuery(query.id);
});

// ОБРАБОТКА УСПЕШНОЙ ОПЛАТЫ STARS
bot.on('pre_checkout_query', (query) => {
    bot.answerPreCheckoutQuery(query.id, true);
});

bot.on('successful_payment', async (msg) => {
    const payload = JSON.parse(msg.successful_payment.invoice_payload);
    const paymentId = payload.paymentId;
    const p = payments[paymentId];
    
    if (p) {
        p.status = 'completed';
        
        await bot.sendMessage(p.chatId,
            `⭐ **ОПЛАТА STARS ПОДТВЕРЖДЕНА!**\n\n` +
            `✅ **Привилегия *${p.privilege}* АКТИВИРОВАНА!**\n` +
            `👤 Игрок: *${p.nickname}*\n` +
            `⭐ Оплачено: ${p.starsPrice} Stars\n\n` +
            `✨ Зайдите на сервер \`mc.sunyworld.me\`\n` +
            `❤️ Спасибо за поддержку!`,
            { parse_mode: 'Markdown' }
        );
        
        await notifyAdmins(
            `✅ **STARS ОПЛАЧЕН И ВЫДАН АВТОМАТИЧЕСКИ!**\n\n` +
            `👤 Игрок: ${p.nickname}\n` +
            `🎁 Привилегия: ${p.privilege}\n` +
            `⭐ Сумма: ${p.starsPrice} Stars\n` +
            `🆔 Код: ${paymentId}`
        );
    }
});

// ПРОВЕРКА ОПЛАТЫ (для рублей)
bot.onText(/\/check (\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const paymentId = match[1];
    const p = payments[paymentId];
    
    if (!p) {
        bot.sendMessage(chatId, '❌ **Платёж не найден**', { parse_mode: 'Markdown' });
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
        `🟡 **ПРОВЕРКА ПЛАТЕЖА**\n\n` +
        `🆔 Код: \`${paymentId}\`\n` +
        `👤 Игрок: ${p.nickname}\n` +
        `🎁 Привилегия: ${p.privilege}\n` +
        `💰 Сумма: ${p.rubPrice} ₽\n\n` +
        `✅ /approve ${paymentId}`
    );
});

// /approve - ПОДТВЕРЖДЕНИЕ ОПЛАТЫ РУБЛЯМИ
bot.onText(/\/approve (\S+)/, async (msg, match) => {
    const adminChatId = msg.chat.id;
    const adminUsername = msg.from.username;
    
    if (!adminUsername || !ADMINS.includes(adminUsername.toLowerCase())) {
        bot.sendMessage(adminChatId, '❌ У вас нет прав!');
        return;
    }
    
    const paymentId = match[1];
    const p = payments[paymentId];
    
    if (!p) {
        bot.sendMessage(adminChatId, `❌ Платёж не найден!`);
        return;
    }
    
    if (p.status === 'completed') {
        bot.sendMessage(adminChatId, `⚠️ Уже активировано!`);
        return;
    }
    
    p.status = 'completed';
    
    const buyerMessage = 
        `✅ **ПЛАТЁЖ УСПЕШНО ПОДТВЕРЖДЁН!**\n\n` +
        `🎁 **Привилегия *${p.privilege}***\n` +
        `👤 **Игрок:** *${p.nickname}*\n` +
        `💰 **Сумма:** ${p.rubPrice} ₽\n\n` +
        `⏳ **Донат будет выдан в течении дня!**\n\n` +
        `❓ **Вопросы?** Напишите: @gokot\n\n` +
        `🎮 **Сервер:** \`mc.sunyworld.me\`\n\n` +
        `❤️ **Спасибо за поддержку!**`;
    
    try {
        await bot.sendMessage(p.chatId, buyerMessage, { parse_mode: 'Markdown' });
        bot.sendMessage(adminChatId, `✅ Сообщение отправлено ${p.nickname}!`);
    } catch (err) {
        bot.sendMessage(adminChatId, `⚠️ Ошибка при отправке!`);
    }
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
        bot.sendMessage(msg.chat.id, '⚠️ Уже активировано!');
        return;
    }
    
    try {
        await bot.sendMessage(p.chatId,
            `❌ **ЗАКАЗ ОТМЕНЁН**\n\n` +
            `😞 Заказ на *${p.privilege}* для *${p.nickname}* отменён.\n\n` +
            `📢 Вопросы: @gokot`,
            { parse_mode: 'Markdown' }
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
    let totalRub = 0;
    Object.values(payments).forEach(p => { if (p.status === 'completed') totalRub += p.rubPrice; });
    
    bot.sendMessage(msg.chat.id,
        `📊 **СТАТИСТИКА**\n\n` +
        `📦 Заказов: ${total}\n` +
        `✅ Выполнено: ${completed}\n` +
        `💰 Собрано: ${totalRub} ₽`,
        { parse_mode: 'Markdown' }
    );
});

// /shop
bot.onText(/\/shop/, (msg) => {
    const text = 
        `🛒 **МАГАЗИН SUNYWORLD**\n\n` +
        `🦄 **PEGAS** — 50₽ / 34⭐\n` +
        `👑 **GOD** — 100₽ / 67⭐\n` +
        `🛡️ **MODER** — 350₽ / 234⭐\n` +
        `🤖 **ML.MODER** — 400₽ / 267⭐\n` +
        `👹 **MONSTER** — 500₽ / 334⭐\n` +
        `⚡ **ADMIN** — 600₽ / 400⭐\n` +
        `🐣 **PASXA** — 700₽ / 467⭐\n\n` +
        `📝 /buy [привилегия] [ник]`;
    
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

// /help
bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `📖 **КОМАНДЫ**\n\n` +
        `/start — Меню\n` +
        `/buy [прив] [ник] — Купить\n` +
        `/check [код] — Проверить оплату\n` +
        `/shop — Цены\n` +
        `/help — Помощь\n\n` +
        `👑 Админы: @gokot, @Pullpy`,
        { parse_mode: 'Markdown' }
    );
});

console.log('✅ БОТ ЗАПУЩЕН!');
console.log(`💰 Цены в рублях и Stars:`);
for (const [name, price] of Object.entries(PRICES)) {
    console.log(`   ${name}: ${price.rub}₽ / ${price.stars}⭐`);
}

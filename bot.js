const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');

const BOT_TOKEN = '8909651086:AAEL5CD6bWu5_oAcyiccYlh-ezge_619yMk';
const YOOMONEY_WALLET = '4100119542546884';
const ADMINS = ['gokot', 'Pullpy'];

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Цены в рублях и Stars (1 Star = 1.5 рубля)
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

// Уведомления админам
async function notifyAdmins(message) {
    for (const admin of ADMINS) {
        if (adminChatIds[admin]) {
            try {
                await bot.sendMessage(adminChatIds[admin], message, { parse_mode: 'Markdown' });
            } catch (err) {}
        } else {
            try {
                await bot.sendMessage(`@${admin}`, message, { parse_mode: 'Markdown' });
            } catch (err) {}
        }
    }
}

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    
    if (username && ADMINS.includes(username.toLowerCase())) {
        adminChatIds[username.toLowerCase()] = chatId;
        bot.sendMessage(chatId, '✅ Вы зарегистрированы как администратор!');
    }
    
    bot.sendMessage(chatId,
        `🎮 **Добро пожаловать в SunyWorld!**\n\n` +
        `💰 **ПРИВИЛЕГИИ:**\n` +
        `• 🦄 PEGAS — 50₽ / 34⭐\n` +
        `• 👑 GOD — 100₽ / 67⭐\n` +
        `• 🛡️ MODER — 350₽ / 234⭐\n` +
        `• 🤖 ML.MODER — 400₽ / 267⭐\n` +
        `• 👹 MONSTER — 500₽ / 334⭐\n` +
        `• ⚡ ADMIN — 600₽ / 400⭐\n` +
        `• 🐣 PASXA — 700₽ / 467⭐\n\n` +
        `📝 /buy [привилегия] [ник]\n` +
        `Пример: /buy MODER Gamer228\n\n` +
        `✨ **Оплата:** Рубли (ЮMoney) или Telegram Stars`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
});

// /buy - выбор привилегии
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
    
    // Кнопки выбора оплаты
    const keyboard = {
        inline_keyboard: [
            [{ text: '💳 Оплатить рублями', callback_data: `rub_${paymentId}` }],
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

// Обработка кнопок
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    // ОПЛАТА РУБЛЯМИ
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
            `🔗 [Нажмите для оплаты](${paymentUrl})\n\n` +
            `✅ После оплаты: /check ${paymentId}\n` +
            `🆔 Код: \`${paymentId}\``,
            { parse_mode: 'Markdown', disable_web_page_preview: true }
        );
        
        await notifyAdmins(
            `💳 **НОВЫЙ ЗАКАЗ (Рубли)**\n` +
            `👤 ${p.nickname}\n` +
            `🎁 ${p.privilege}\n` +
            `💰 ${p.rubPrice} ₽\n` +
            `🆔 ${paymentId}\n\n` +
            `✅ /approve ${paymentId}`
        );
    }
    
    // ОПЛАТА STARS
    if (data.startsWith('stars_')) {
        const paymentId = data.replace('stars_', '');
        const p = payments[paymentId];
        
        if (!p) {
            bot.sendMessage(chatId, '❌ Платёж не найден');
            return;
        }
        
        try {
            // СОЗДАЁМ ИНВОЙС ДЛЯ TELEGRAM STARS
            const invoice = {
                chat_id: chatId,
                title: `${p.privilege} | SunyWorld`,
                description: `${p.privilege} для игрока ${p.nickname}`,
                payload: JSON.stringify({ 
                    paymentId: paymentId, 
                    nickname: p.nickname, 
                    privilege: p.privilege,
                    starsAmount: p.starsPrice
                }),
                provider_token: '',
                currency: 'XTR',
                prices: [{ label: p.privilege, amount: p.starsPrice }],
                start_parameter: `stars_${paymentId}`,
                photo_url: 'https://cdn-icons-png.flaticon.com/512/2917/2917995.png',
                photo_size: 512
            };
            
            await bot.sendInvoice(chatId, invoice);
            
            await notifyAdmins(
                `⭐ **НОВЫЙ ЗАКАЗ (Stars)**\n` +
                `👤 ${p.nickname}\n` +
                `🎁 ${p.privilege}\n` +
                `⭐ ${p.starsPrice} Stars\n` +
                `🆔 ${paymentId}\n\n` +
                `✅ После оплаты выдастся автоматически!`
            );
            
        } catch (err) {
            console.error('Stars error:', err.message);
            bot.sendMessage(chatId, 
                `❌ **Ошибка оплаты Stars**\n\n` +
                `Возможные причины:\n` +
                `• Telegram Stars не подключены в BotFather\n` +
                `• В вашем регионе Stars недоступны\n\n` +
                `💡 Выберите оплату рублями\n\n` +
                `👑 Администраторы: @gokot, @Pullpy`,
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
            `✅ **ОПЛАТА STARS ПОДТВЕРЖДЕНА!**\n\n` +
            `🎁 **Привилегия *${p.privilege}* АКТИВИРОВАНА!**\n` +
            `👤 Игрок: *${p.nickname}*\n` +
            `⭐ Оплачено: ${p.starsPrice} Stars\n\n` +
            `✨ Зайдите на сервер \`mc.sunyworld.me\`\n` +
            `❤️ Спасибо за поддержку!`,
            { parse_mode: 'Markdown' }
        );
        
        await notifyAdmins(
            `✅ **STARS ОПЛАЧЕН АВТОМАТИЧЕСКИ!**\n` +
            `👤 ${p.nickname}\n` +
            `🎁 ${p.privilege}\n` +
            `⭐ ${p.starsPrice} Stars\n` +
            `🆔 ${paymentId}`
        );
    }
});

// /check - проверка рублёвой оплаты
bot.onText(/\/check (\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const paymentId = match[1];
    const p = payments[paymentId];
    
    if (!p) {
        bot.sendMessage(chatId, '❌ Платёж не найден');
        return;
    }
    
    if (p.status === 'completed') {
        bot.sendMessage(chatId, `✅ Привилегия ${p.privilege} уже активирована для ${p.nickname}!`);
        return;
    }
    
    bot.sendMessage(chatId,
        `⏳ **Платёж проверяется**\n\n` +
        `👤 ${p.nickname}\n` +
        `🎁 ${p.privilege}\n` +
        `💰 ${p.rubPrice} ₽\n\n` +
        `🆔 Код: ${paymentId}`,
        { parse_mode: 'Markdown' }
    );
    
    await notifyAdmins(
        `🟡 **ПРОВЕРКА ПЛАТЕЖА**\n` +
        `👤 ${p.nickname}\n` +
        `🎁 ${p.privilege}\n` +
        `💰 ${p.rubPrice} ₽\n` +
        `✅ /approve ${paymentId}`
    );
});

// /approve - подтверждение рублёвой оплаты
bot.onText(/\/approve (\S+)/, async (msg, match) => {
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
    
    p.status = 'completed';
    
    await bot.sendMessage(p.chatId,
        `✅ **ОПЛАТА ПОДТВЕРЖДЕНА!**\n\n` +
        `🎁 Привилегия *${p.privilege}* активирована для *${p.nickname}*\n` +
        `💰 Сумма: ${p.rubPrice} ₽\n\n` +
        `✨ Зайдите на сервер \`mc.sunyworld.me\``,
        { parse_mode: 'Markdown' }
    );
    
    bot.sendMessage(msg.chat.id, `✅ Привилегия ${p.privilege} выдана ${p.nickname}!`);
});

// /shop
bot.onText(/\/shop/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🛒 **МАГАЗИН SUNYWORLD**\n\n` +
        `🦄 PEGAS — 50₽ / 34⭐\n` +
        `👑 GOD — 100₽ / 67⭐\n` +
        `🛡️ MODER — 350₽ / 234⭐\n` +
        `🤖 ML.MODER — 400₽ / 267⭐\n` +
        `👹 MONSTER — 500₽ / 334⭐\n` +
        `⚡ ADMIN — 600₽ / 400⭐\n` +
        `🐣 PASXA — 700₽ / 467⭐\n\n` +
        `📝 /buy [привилегия] [ник]`,
        { parse_mode: 'Markdown' }
    );
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
console.log('⭐ Telegram Stars подключены!');

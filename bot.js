const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');

const BOT_TOKEN = '8909651086:AAEL5CD6bWu5_oAcyiccYlh-ezge_619yMk';
const YOOMONEY_WALLET = '4100119542546884';
const ADMINS = ['gokot', 'Pullpy'];

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ПРИВИЛЕГИИ
const PRICES = { 
    'PEGAS': 50,
    'GOD': 100,
    'MODER': 350,
    'ML.MODER': 400,
    'MONSTER': 500,
    'ADMIN': 600,
    'PASXA': 700
};

// КЕЙСЫ
const CASES = {
    '3 КЕЙСА': 89,
    '10 КЕЙСОВ': 199,
    '25 КЕЙСОВ': 299
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

// Функция показа главного меню с кнопками
async function showMainMenu(chatId) {
    const keyboard = {
        inline_keyboard: [
            [{ text: '🛡️ ПРИВИЛЕГИИ', callback_data: 'menu_privileges' }],
            [{ text: '🎁 КЕЙСЫ', callback_data: 'menu_cases' }],
            [{ text: '❓ ПОМОЩЬ', callback_data: 'menu_help' }]
        ]
    };
    
    await bot.sendMessage(chatId,
        `🎮 **Добро пожаловать в магазин SunyWorld!**\n\n` +
        `Выберите категорию товаров:`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
    );
}

// Функция показа привилегий
async function showPrivileges(chatId) {
    const keyboard = {
        inline_keyboard: [
            [{ text: '🦄 PEGAS 50₽', callback_data: 'buy_PEGAS' }],
            [{ text: '👑 GOD 100₽', callback_data: 'buy_GOD' }],
            [{ text: '🛡️ MODER 350₽', callback_data: 'buy_MODER' }],
            [{ text: '🤖 ML.MODER 400₽', callback_data: 'buy_ML.MODER' }],
            [{ text: '👹 MONSTER 500₽', callback_data: 'buy_MONSTER' }],
            [{ text: '⚡ ADMIN 600₽', callback_data: 'buy_ADMIN' }],
            [{ text: '🐣 PASXA 700₽', callback_data: 'buy_PASXA' }],
            [{ text: '◀️ НАЗАД В МЕНЮ', callback_data: 'menu_back' }]
        ]
    };
    
    await bot.sendMessage(chatId,
        `🛡️ **ПРИВИЛЕГИИ**\n\n` +
        `• 🦄 PEGAS — 50₽\n` +
        `• 👑 GOD — 100₽\n` +
        `• 🛡️ MODER — 350₽\n` +
        `• 🤖 ML.MODER — 400₽\n` +
        `• 👹 MONSTER — 500₽\n` +
        `• ⚡ ADMIN — 600₽\n` +
        `• 🐣 PASXA — 700₽\n\n` +
        `Нажмите на привилегию для покупки:`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
    );
}

// Функция показа кейсов
async function showCases(chatId) {
    const keyboard = {
        inline_keyboard: [
            [{ text: '🎁 3 КЕЙСА — 89₽', callback_data: 'case_3 КЕЙСА' }],
            [{ text: '🎁 10 КЕЙСОВ — 199₽', callback_data: 'case_10 КЕЙСОВ' }],
            [{ text: '🎁 25 КЕЙСОВ — 299₽', callback_data: 'case_25 КЕЙСОВ' }],
            [{ text: '◀️ НАЗАД В МЕНЮ', callback_data: 'menu_back' }]
        ]
    };
    
    await bot.sendMessage(chatId,
        `🎁 **КЕЙСЫ С ДОНАТОМ**\n\n` +
        `• 3 кейса — 89₽\n` +
        `• 10 кейсов — 199₽\n` +
        `• 25 кейсов — 299₽\n\n` +
        `Нажмите на набор кейсов для покупки:`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
    );
}

// Обработка нажатий на кнопки
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    // Навигация по меню
    if (data === 'menu_privileges') {
        await showPrivileges(chatId);
    } else if (data === 'menu_cases') {
        await showCases(chatId);
    } else if (data === 'menu_help') {
        const helpText = 
            `❓ **ПОМОЩЬ**\n\n` +
            `📝 **Как купить:**\n` +
            `1. Выберите товар в меню\n` +
            `2. Введите никнейм игрока\n` +
            `3. Оплатите по реквизитам\n` +
            `4. Отправьте /check [код]\n\n` +
            `👑 **Администраторы:**\n` +
            `• @gokot\n` +
            `• @Pullpy\n\n` +
            `🆘 По всем вопросам обращайтесь к ним!`;
        
        const keyboard = {
            inline_keyboard: [[{ text: '◀️ НАЗАД В МЕНЮ', callback_data: 'menu_back' }]]
        };
        await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown', reply_markup: keyboard });
    } else if (data === 'menu_back') {
        await showMainMenu(chatId);
    }
    
    // Покупка привилегии
    else if (data.startsWith('buy_')) {
        const privilege = data.replace('buy_', '');
        // Запрашиваем никнейм
        bot.sendMessage(chatId, `💎 Вы выбрали привилегию *${privilege}*\n\nВведите никнейм игрока:`, { parse_mode: 'Markdown' });
        
        // Сохраняем временные данные
        adminChatIds[`temp_${chatId}`] = { type: 'privilege', item: privilege };
    }
    
    // Покупка кейсов
    else if (data.startsWith('case_')) {
        const caseName = data.replace('case_', '');
        bot.sendMessage(chatId, `🎁 Вы выбрали *${caseName}*\n\nВведите никнейм игрока:`, { parse_mode: 'Markdown' });
        
        // Сохраняем временные данные
        adminChatIds[`temp_${chatId}`] = { type: 'case', item: caseName };
    }
    
    await bot.answerCallbackQuery(query.id);
});

// Обработка ввода ника
bot.onText(/^[A-Za-z0-9_]{3,16}$/, async (msg) => {
    const chatId = msg.chat.id;
    const nickname = msg.text;
    const temp = adminChatIds[`temp_${chatId}`];
    
    if (!temp) return;
    
    delete adminChatIds[`temp_${chatId}`];
    
    let itemName, amount;
    
    if (temp.type === 'privilege') {
        itemName = temp.item;
        amount = PRICES[itemName];
        if (!amount) return;
    } else if (temp.type === 'case') {
        itemName = temp.item;
        amount = CASES[itemName];
        if (!amount) return;
    } else {
        return;
    }
    
    const paymentId = crypto.randomBytes(4).toString('hex');
    const itemType = temp.type === 'privilege' ? 'Привилегия' : 'Кейсы';
    
    payments[paymentId] = {
        chatId: chatId,
        nickname: nickname,
        itemName: itemName,
        itemType: itemType,
        rubPrice: amount,
        status: 'pending',
        username: msg.from.username || 'нет',
        date: new Date().toLocaleString()
    };
    
    const paymentUrl = `https://yoomoney.ru/transfer/quickpay?receiver=${YOOMONEY_WALLET}&quickpay-form=small&sum=${amount}&label=${paymentId}&targets=${encodeURIComponent(`${itemName} для ${nickname}`)}`;
    
    bot.sendMessage(chatId,
        `💎 **${itemName} для ${nickname}**\n\n` +
        `💰 Сумма: ${amount} ₽\n\n` +
        `📌 **Кошелёк ЮMoney:** \`4100 1195 4254 6884\`\n\n` +
        `🔗 [ОПЛАТИТЬ](${paymentUrl})\n\n` +
        `✅ После оплаты: /check ${paymentId}\n` +
        `🆔 Код: \`${paymentId}\``,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
    
    await notifyAdmins(
        `🆕 **НОВЫЙ ЗАКАЗ!**\n\n` +
        `🆔 Код: \`${paymentId}\`\n` +
        `👤 Игрок: ${nickname}\n` +
        `🎁 Товар: ${itemName}\n` +
        `📦 Тип: ${itemType}\n` +
        `💰 Сумма: ${amount} ₽\n` +
        `👤 Telegram: @${msg.from.username || 'нет'}\n` +
        `⏰ Время: ${payments[paymentId].date}\n\n` +
        `✅ Подтвердить: /approve ${paymentId}\n` +
        `❌ Отменить: /cancel ${paymentId}`
    );
});

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
    
    showMainMenu(chatId);
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
            `✅ **${p.itemName} уже активирован** для *${p.nickname}*!\n\n` +
            `🎮 Заходите на сервер \`mc.sunyworld.me\``,
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    bot.sendMessage(chatId,
        `⏳ **Платёж проверяется**\n\n` +
        `👤 Игрок: ${p.nickname}\n` +
        `🎁 Товар: ${p.itemName}\n` +
        `💰 Сумма: ${p.rubPrice} ₽\n\n` +
        `📢 Вопросы: [@gokot](https://t.me/gokot), [@Pullpy](https://t.me/Pullpy)\n\n` +
        `🆔 Код: \`${paymentId}\``,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
    
    await notifyAdmins(
        `🟡 **ПРОВЕРКА ПЛАТЕЖА**\n\n` +
        `🆔 Код: \`${paymentId}\`\n` +
        `👤 Игрок: ${p.nickname}\n` +
        `🎁 Товар: ${p.itemName}\n` +
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
        bot.sendMessage(adminChatId, `⚠️ Товар для ${p.nickname} уже был активирован!`);
        return;
    }
    
    p.status = 'completed';
    console.log(`✅ АДМИН @${adminUsername} подтвердил оплату ${paymentId} для ${p.nickname}`);
    
    const buyerMessage = 
        `✅ **ОПЛАТА ПОДТВЕРЖДЕНА!**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎁 **${p.itemName}**\n` +
        `👤 **Игрок:** *${p.nickname}*\n` +
        `💰 **Сумма:** ${p.rubPrice} ₽\n\n` +
        `⏳ **Товар будет выдан в течении дня!**\n\n` +
        `❓ **Вопросы?** Напишите: @gokot\n\n` +
        `🎮 **Сервер:** \`mc.sunyworld.me\`\n\n` +
        `❤️ **Спасибо за поддержку!**`;
    
    try {
        await bot.sendMessage(p.chatId, buyerMessage, { parse_mode: 'Markdown' });
        console.log(`✅ Сообщение отправлено покупателю ${p.nickname}`);
        bot.sendMessage(adminChatId, `✅ Сообщение отправлено покупателю ${p.nickname}!`);
    } catch (err) {
        console.log(`❌ Ошибка при отправке покупателю: ${err.message}`);
        bot.sendMessage(adminChatId, `⚠️ Не удалось отправить сообщение покупателю!`);
    }
    
    bot.sendMessage(adminChatId,
        `✅ **Товар подтверждён!**\n\n` +
        `👤 Игрок: ${p.nickname}\n` +
        `🎁 Товар: ${p.itemName}\n` +
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
        bot.sendMessage(msg.chat.id, '⚠️ Товар уже активирован, отмена невозможна!');
        return;
    }
    
    try {
        await bot.sendMessage(p.chatId,
            `❌ **ЗАКАЗ ОТМЕНЁН**\n\n` +
            `😞 Заказ на *${p.itemName}* для *${p.nickname}* отменён.\n\n` +
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
        ordersText += `   👤 ${p.nickname} | 🎁 ${p.itemName} | 💰 ${p.rubPrice}₽\n`;
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

// /shop - старый формат для совместимости
bot.onText(/\/shop/, (msg) => {
    showMainMenu(msg.chat.id);
});

// /help
bot.onText(/\/help/, (msg) => {
    const helpText = 
        `📖 **КОМАНДЫ БОТА**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 **Для всех:**\n` +
        `• /start — Главное меню 🎮\n` +
        `• /shop — Список товаров 🛒\n` +
        `• /help — Эта справка 📖\n\n` +
        `👑 **Для администраторов:**\n` +
        `• /approve [код] — Подтвердить оплату ✅\n` +
        `• /cancel [код] — Отменить заказ ❌\n` +
        `• /orders — Активные заказы 📋\n` +
        `• /stats — Статистика 📊\n\n` +
        `👑 **Администраторы:**\n` +
        `• [@gokot](https://t.me/gokot)\n` +
        `• [@Pullpy](https://t.me/Pullpy)`;
    
    bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

console.log('✅ БОТ SUNYWORLD ЗАПУЩЕН!');
console.log(`👑 Администраторы: @${ADMINS.join(', @')}`);
console.log('');
console.log(`💰 ПРИВИЛЕГИИ: PEGAS 50₽, GOD 100₽, MODER 350₽, ML.MODER 400₽, MONSTER 500₽, ADMIN 600₽, PASXA 700₽`);
console.log(`🎁 КЕЙСЫ: 3 кейса 89₽, 10 кейсов 199₽, 25 кейсов 299₽`);

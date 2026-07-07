require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const {
  getUser,
  updateBalance,
  addPurchase,
  addKitToUser,
  userHasKit,
  getUserPurchases
} = require('./database');

// Токен забирается из файла .env — ЭТО ПРАВИЛЬНО
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// ============ КОНФИГУРАЦИЯ НАБОРОВ ============
const KITS = {
  kit1: {
    id: 'kit1',
    name: '🎨 Набор #1',
    description: 'Базовый набор (20 изображений)',
    price: 20,
    emoji: '🟦'
  },
  kit2: {
    id: 'kit2',
    name: '🎨 Набор #2',
    description: 'Расширенный набор (35 изображений)',
    price: 35,
    emoji: '🟩'
  },
  kit3: {
    id: 'kit3',
    name: '🎨 Набор #3',
    description: 'Полный комплект (50 изображений)',
    price: 50,
    emoji: '🟪'
  }
};

const COMBOS = {
  combo_1_2: {
    id: 'combo_1_2',
    name: '📦 Набор #1 + #2',
    description: 'Экономия 5 Stars!',
    price: 50,
    kits: ['kit1', 'kit2'],
    emoji: '🟧'
  },
  combo_all: {
    id: 'combo_all',
    name: '📦 Все наборы (полный комплект)',
    description: 'Экономия 15 Stars!',
    price: 90,
    kits: ['kit1', 'kit2', 'kit3'],
    emoji: '🌟'
  }
};

// ============ КЛАВИАТУРЫ ============
function getMainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '🛒 Магазин' }, { text: '⭐ Пополнить Stars' }],
        [{ text: '👤 Мой профиль' }, { text: '📦 Мои покупки' }]
      ],
      resize_keyboard: true
    }
  };
}

function getShopKeyboard() {
  const buttons = [];
  
  for (const kitId in KITS) {
    const kit = KITS[kitId];
    buttons.push([{ text: `${kit.emoji} ${kit.name} — ${kit.price} ⭐`, callback_data: `buy_${kitId}` }]);
  }
  
  buttons.push([{ text: '— КОМБО —', callback_data: 'dummy' }]);
  
  for (const comboId in COMBOS) {
    const combo = COMBOS[comboId];
    buttons.push([{ text: `${combo.emoji} ${combo.name} — ${combo.price} ⭐`, callback_data: `buy_${comboId}` }]);
  }
  
  buttons.push([{ text: '⬅ Назад в меню', callback_data: 'back_to_menu' }]);
  
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

function getStarsKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⭐ 10 Stars', callback_data: 'stars_10' }, { text: '⭐ 25 Stars', callback_data: 'stars_25' }],
        [{ text: '⭐ 50 Stars', callback_data: 'stars_50' }, { text: '⭐ 100 Stars', callback_data: 'stars_100' }],
        [{ text: '⭐ 200 Stars', callback_data: 'stars_200' }, { text: '⭐ 500 Stars', callback_data: 'stars_500' }],
        [{ text: '⬅ Назад в меню', callback_data: 'back_to_menu' }]
      ]
    }
  };
}

function getBackKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅ Назад в меню', callback_data: 'back_to_menu' }]
      ]
    }
  };
}

// ============ ХЕНДЛЕРЫ КОМАНД ============

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  getUser(chatId, (err, user) => {
    if (err) {
      bot.sendMessage(chatId, '❌ Ошибка базы данных');
      return;
    }
    bot.sendMessage(
      chatId,
      `👋 Добро пожаловать в магазин Kit-наборов!\n\n` +
      `📦 Здесь ты можешь приобрести эксклюзивные наборы изображений.\n` +
      `💰 Твой баланс: ${user.stars_balance} ⭐\n\n` +
      `Выбери действие:`,
      getMainKeyboard()
    );
  });
});

bot.onText(/🛒 Магазин/, (msg) => {
  const chatId = msg.chat.id;
  let text = '🛒 **Магазин Kit-наборов**\n\n';
  text += '**📦 Отдельные наборы:**\n';
  for (const kitId in KITS) {
    const kit = KITS[kitId];
    text += `${kit.emoji} **${kit.name}** — ${kit.price} ⭐\n`;
    text += `   _${kit.description}_\n\n`;
  }
  text += '\n**🎁 Комбо-предложения:**\n';
  for (const comboId in COMBOS) {
    const combo = COMBOS[comboId];
    text += `${combo.emoji} **${combo.name}** — ${combo.price} ⭐\n`;
    text += `   _${combo.description}_\n\n`;
  }
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...getShopKeyboard() });
});

bot.onText(/⭐ Пополнить Stars/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    '⭐ **Пополнение баланса Stars**\n\nВыбери сумму пополнения. Оплата через Telegram Stars.',
    { parse_mode: 'Markdown', ...getStarsKeyboard() }
  );
});

bot.onText(/👤 Мой профиль/, (msg) => {
  const chatId = msg.chat.id;
  getUser(chatId, (err, user) => {
    if (err) {
      bot.sendMessage(chatId, '❌ Ошибка базы данных');
      return;
    }
    const purchased = JSON.parse(user.purchased_kits);
    let text = '👤 **Профиль**\n\n';
    text += `💰 Баланс: ${user.stars_balance} ⭐\n`;
    text += `📦 Куплено наборов: ${purchased.length}\n\n`;
    if (purchased.length > 0) {
      text += '**Купленные наборы:**\n';
      purchased.forEach(kitId => {
        if (KITS[kitId]) {
          text += `• ${KITS[kitId].emoji} ${KITS[kitId].name}\n`;
        }
      });
    }
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...getBackKeyboard() });
  });
});

bot.onText(/📦 Мои покупки/, (msg) => {
  const chatId = msg.chat.id;
  getUser(chatId, (err, user) => {
    if (err) {
      bot.sendMessage(chatId, '❌ Ошибка базы данных');
      return;
    }
    const purchased = JSON.parse(user.purchased_kits);
    if (purchased.length === 0) {
      bot.sendMessage(
        chatId,
        '📦 **У вас пока нет купленных наборов**\n\nПерейдите в магазин, чтобы приобрести.',
        { parse_mode: 'Markdown', ...getShopKeyboard() }
      );
      return;
    }
    let text = '📦 **Мои наборы**\n\n';
    purchased.forEach(kitId => {
      if (KITS[kitId]) {
        const kit = KITS[kitId];
        text += `${kit.emoji} **${kit.name}**\n`;
        text += `   ${kit.description}\n\n`;
      }
    });
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '⬇️ Скачать все наборы', callback_data: 'download_all' }],
          [{ text: '⬅ Назад в меню', callback_data: 'back_to_menu' }]
        ]
      }
    };
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard });
  });
});

// ============ ОБРАБОТЧИКИ INLINE КНОПОК ============

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  
  if (data === 'back_to_menu') {
    getUser(chatId, (err, user) => {
      if (err) {
        bot.sendMessage(chatId, '❌ Ошибка базы данных');
        return;
      }
      bot.editMessageText(
        `👋 Главное меню\n\n💰 Баланс: ${user.stars_balance} ⭐`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown',
          ...getMainKeyboard()
        }
      );
    });
    bot.answerCallbackQuery(query.id);
    return;
  }
  
  if (data.startsWith('stars_')) {
    const amount = parseInt(data.split('_')[1]);
    handleStarsPurchase(query, amount);
    return;
  }
  
  if (data.startsWith('buy_')) {
    const productId = data.replace('buy_', '');
    handleKitPurchase(query, productId);
    return;
  }
  
  if (data === 'download_all') {
    handleDownloadAll(query);
    return;
  }
  
  if (data === 'dummy') {
    bot.answerCallbackQuery(query.id);
    return;
  }
});

// ============ ЛОГИКА ПОКУПОК ============

function handleStarsPurchase(query, amount) {
  const chatId = query.message.chat.id;
  
  const invoice = {
    chat_id: chatId,
    title: `Пополнение на ${amount} Stars`,
    description: `Покупка ${amount} Stars для магазина Kit-наборов`,
    payload: `stars_${amount}_${chatId}`,
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: `${amount} Stars`, amount: amount * 100 }],
    start_parameter: 'stars_payment'
  };
  
  bot.sendInvoice(invoice);
  bot.answerCallbackQuery(query.id);
}

function handleKitPurchase(query, productId) {
  const chatId = query.message.chat.id;
  
  let product = null;
  let productType = '';
  
  if (KITS[productId]) {
    product = KITS[productId];
    productType = 'kit';
  } else if (COMBOS[productId]) {
    product = COMBOS[productId];
    productType = 'combo';
  } else {
    bot.answerCallbackQuery(query.id, { text: '❌ Товар не найден' });
    return;
  }
  
  const price = product.price;
  
  getUser(chatId, (err, user) => {
    if (err) {
      bot.sendMessage(chatId, '❌ Ошибка базы данных');
      return;
    }
    
    if (productType === 'kit') {
      const purchased = JSON.parse(user.purchased_kits);
      if (purchased.includes(productId)) {
        bot.answerCallbackQuery(query.id, { text: '⚠️ У вас уже есть этот набор!' });
        bot.sendMessage(
          chatId,
          `⚠️ У вас уже есть **${product.name}**!\nПовторная покупка недоступна.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
    }
    
    if (user.stars_balance < price) {
      bot.answerCallbackQuery(query.id, { text: '❌ Недостаточно Stars!' });
      bot.sendMessage(
        chatId,
        `❌ **Недостаточно Stars!**\n\nНужно: ${price} ⭐\nУ тебя: ${user.stars_balance} ⭐\n\nПополни баланс в главном меню.`,
        { parse_mode: 'Markdown', ...getBackKeyboard() }
      );
      return;
    }
    
    updateBalance(chatId, -price, (err) => {
      if (err) {
        bot.sendMessage(chatId, '❌ Ошибка при списании средств');
        return;
      }
      
      if (productType === 'kit') {
        addKitToUser(chatId, productId, (err) => {
          if (err) {
            bot.sendMessage(chatId, '❌ Ошибка при выдаче набора');
            return;
          }
          addPurchase(chatId, productId, 'kit', price, null, (err) => {
            if (err) console.error('Ошибка сохранения покупки:', err);
          });
          bot.sendMessage(
            chatId,
            `✅ **Покупка успешна!**\n\nПриобретено: ${product.name}\nСписано: ${price} ⭐\nОстаток: ${user.stars_balance - price} ⭐\n\n📂 Набор добавлен в твою коллекцию.`,
            { parse_mode: 'Markdown' }
          );
        });
      } else if (productType === 'combo') {
        let completed = 0;
        product.kits.forEach((kitId) => {
          addKitToUser(chatId, kitId, (err) => {
            if (!err) {
              addPurchase(chatId, kitId, 'kit', 0, null, () => {});
            }
            completed++;
            if (completed === product.kits.length) {
              addPurchase(chatId, productId, 'combo', price, null, (err) => {
                if (err) console.error('Ошибка сохранения комбо:', err);
              });
              const kitsList = product.kits.map(id => KITS[id].name).join(', ');
              bot.sendMessage(
                chatId,
                `✅ **Покупка успешна!**\n\nПриобретено: ${product.name}\nВключает: ${kitsList}\nСписано: ${price} ⭐\nОстаток: ${user.stars_balance - price} ⭐`,
                { parse_mode: 'Markdown' }
              );
            }
          });
        });
      }
      
      bot.answerCallbackQuery(query.id, { text: '✅ Покупка совершена!' });
    });
  });
}

function handleDownloadAll(query) {
  const chatId = query.message.chat.id;
  
  getUser(chatId, (err, user) => {
    if (err) {
      bot.sendMessage(chatId, '❌ Ошибка базы данных');
      return;
    }
    const purchased = JSON.parse(user.purchased_kits);
    if (purchased.length === 0) {
      bot.answerCallbackQuery(query.id, { text: 'У вас нет наборов для скачивания' });
      return;
    }
    
    // ЗДЕСЬ ВАМ НУЖНО ДОБАВИТЬ ОТПРАВКУ ФАЙЛОВ
    bot.sendMessage(
      chatId,
      '📂 **Ваши наборы готовы к скачиванию!**\n\n' +
      'Ссылка: https://example.com/kits.zip\n\n' +
      '⚠️ Ссылка действительна 24 часа.',
      { parse_mode: 'Markdown' }
    );
    bot.answerCallbackQuery(query.id);
  });
}

// ============ ОБРАБОТКА ПЛАТЕЖЕЙ ============

bot.on('pre_checkout_query', (query) => {
  bot.answerPreCheckoutQuery(query.id, true);
});

bot.on('successful_payment', (msg) => {
  const chatId = msg.chat.id;
  const payment = msg.successful_payment;
  const payload = payment.invoice_payload;
  
  const parts = payload.split('_');
  const amountStars = parseInt(parts[1]);
  const userId = parseInt(parts[2]);
  
  if (userId === chatId) {
    updateBalance(chatId, amountStars, (err) => {
      if (err) {
        bot.sendMessage(chatId, '❌ Ошибка при начислении Stars');
        return;
      }
      getUser(chatId, (err, user) => {
        if (err) {
          bot.sendMessage(chatId, '❌ Ошибка базы данных');
          return;
        }
        bot.sendMessage(
          chatId,
          `✅ **Пополнение успешно!**\n\nНачислено: ${amountStars} ⭐\nНовый баланс: ${user.stars_balance} ⭐`,
          { parse_mode: 'Markdown' }
        );
      });
    });
  }
});

// ============ АДМИН-КОМАНДА ============

bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;
  
  const adminId = process.env.ADMIN_ID;
  if (adminId && parseInt(adminId) !== chatId) {
    bot.sendMessage(chatId, '⛔ Доступ запрещен');
    return;
  }
  
  const db = require('./database').db;
  db.get('SELECT COUNT(*) as total FROM users', (err, users) => {
    if (err) return;
    db.get('SELECT SUM(price) as revenue FROM purchases WHERE status="success"', (err, revenue) => {
      if (err) return;
      db.get('SELECT COUNT(*) as purchases FROM purchases WHERE status="success"', (err, purchases) => {
        if (err) return;
        bot.sendMessage(
          chatId,
          `📊 **Админ-панель**\n\n` +
          `👥 Пользователей: ${users ? users.total : 0}\n` +
          `💰 Выручка: ${revenue ? revenue.revenue || 0 : 0} ⭐\n` +
          `📦 Продаж: ${purchases ? purchases.purchases || 0 : 0}`,
          { parse_mode: 'Markdown' }
        );
      });
    });
  });
});

// ============ ЗАПУСК ============

console.log('✅ Бот запущен!');
console.log('📦 Kit-наборы загружены:');
for (const kitId in KITS) {
  console.log(`   ${KITS[kitId].name} — ${KITS[kitId].price} ⭐`);
}
console.log('🎁 Комбо-предложения:');
for (const comboId in COMBOS) {
  console.log(`   ${COMBOS[comboId].name} — ${COMBOS[comboId].price} ⭐`);
}
console.log('\n🚀 Бот готов к работе!');

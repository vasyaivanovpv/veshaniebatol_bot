const Scene = require("telegraf/scenes/base");
const { textBlockLimits } = require("../../constants");

const User = require("../../models/User");

const registration = new Scene("registration");

registration.enter(async (ctx) => {
  await ctx.replyWithMarkdown(
    `🏠 *Регистрация* \n\nВведи свой псевдоним. Изменить его будет невозможно.`
  );
});

registration.on("text", async (ctx) => {
  const { text } = ctx.message;

  if (text.length > textBlockLimits.RAP_NAME) {
    return ctx.replyWithMarkdown(
      `❗️ Вы превысили лимит символов! Попробуйте ввести снова.`
    );
  }

  if (text.search(/^[a-zа-яё\d ]+$/i) === -1) {
    return ctx.replyWithMarkdown(
      `❗️ Используй только буквы и цифры! Введи снова.`
    );
  }

  const rapName = text
    .split(" ")
    .filter((str) => str)
    .map((str) => str.trim())
    .join(" ");

  const matchedUserDB = await User.findOne({
    rapName: { $regex: new RegExp("^" + rapName.toLowerCase(), "i") },
  });

  if (matchedUserDB) {
    return ctx.replyWithMarkdown(`❗️ Псевдоним занят! Введи другой.`);
  }

  const userDB = await User.findOne({
    telegramId: ctx.from.id,
  });
  userDB.rapName = rapName;
  await userDB.save();

  return ctx.scene.enter("main_menu");
});

registration.use(async (ctx) => {
  await ctx.replyWithMarkdown(`❗️ Введи свой псевдоним!`);
});

module.exports = registration;

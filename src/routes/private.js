const Composer = require("telegraf/composer");
const Stage = require("telegraf/stage");
const session = require("telegraf/session");

const { escapeChar } = require("../utils");

const User = require("../models/User");

const mainMenu = require("../controllers/mainMenu");
const registration = require("../controllers/registration");
const sendTrack = require("../controllers/sendTrack");
const popularRate = require("../controllers/popularRate");
const topTracks = require("../controllers/topTracks");
const personalTop = require("../controllers/personalTop");

const stage = new Stage(
  [mainMenu, registration, sendTrack, popularRate, topTracks, personalTop],
  {
    // ttl: 10,
    // default: "main_menu",
  }
);

const privateRoute = new Composer();
privateRoute.use(session());
privateRoute.use(stage.middleware());

privateRoute.start(async (ctx) => {
  const { id, first_name, last_name } = ctx.from;
  const userName = [first_name, last_name].filter((v) => v).join(" ");

  await ctx.replyWithMarkdown(
    `😎 Привет, ${escapeChar(
      userName
    )}! \n\nЗдесь ты будешь отслеживать свой прогресс в батле. У тебя есть две основные кнопки. Первая кнопка *Сдать трек* - я думаю, ты знаешь для чего она. И вторая кнопка *Обновить инфу* - для того чтобы подгрузить актуальную информацию о текущем состоянии батла.`
  );

  let userDB = await User.findOne({ telegramId: id });

  if (!userDB) {
    userDB = await new User({
      telegramId: id,
      firstName: first_name,
      lastName: last_name,
      created: new Date(),
      blocked: false,
    });

    await userDB.save();
  }

  if (userDB.rapName) {
    return ctx.scene.enter("main_menu");
  }

  return ctx.scene.enter("registration");
});

privateRoute.use(async (ctx) => {
  await ctx.replyWithMarkdown(
    `❗️ Бот получил некоторые обновления. \nИспользуйте команду /start, чтобы возобновить работу.`
  );
});

module.exports = privateRoute;

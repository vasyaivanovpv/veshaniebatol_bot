const {
  escapeRegExp,
  toHashTag,
  isJSONString,
  formatPrice,
} = require("./utils");
const {
  textBlockLimits,
  realEstate,
  numberRoomTags,
  comfortTypes,
  typesUser,
} = require("./constants");

const checkJSONmw = async (ctx, next) => {
  if (!isJSONString(ctx.callbackQuery.data)) {
    await ctx.answerCbQuery();
    return ctx.replyWithMarkdown(`❗️ Это действие сейчас не актуально!`);
  } else {
    next();
  }
};

module.exports = {
  checkJSONmw,
};

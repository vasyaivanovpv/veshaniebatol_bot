const { Schema, model } = require("mongoose");

const schema = new Schema({
  telegramId: Number,
  rapName: String,
  sheetColumn: String,
});

const Referee = model("Referee", schema);

module.exports = Referee;

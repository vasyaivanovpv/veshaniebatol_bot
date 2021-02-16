const { Schema, model } = require("mongoose");

const schema = new Schema({
  created: Date,
  telegramId: Number,
  firstName: String,
  lastName: String,
  rapName: String,
  currentPair: Number,
  currentSheetRow: Number,
  hasTrack: {
    type: Boolean,
    default: false,
  },
  blocked: Boolean,
  status: {
    type: String,
    enum: ["empty", "active", "finished"],
    default: "empty",
  },
  totalRate: {
    type: Number,
    default: 0,
  },
});

const User = model("User", schema);

module.exports = User;

const { Schema, model } = require("mongoose");

const schema = new Schema({
  created: Date,
  telegramId: Number,
  firstName: String,
  lastName: String,
  rapName: String,
  currentPair: Number,
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
});

const User = model("User", schema);

module.exports = User;
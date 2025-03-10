const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  nameWithInitials: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: { type: String },
  experience: { type: String },
  portfolioURL: { type: String },
  linkedinURL: { type: String },
  skills: { type: String },
  profilePicture: { type: String }, // The file path to the uploaded image
});

const User = mongoose.model('User', userSchema);

module.exports = User;

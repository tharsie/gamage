const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2; // Assuming you are using Cloudinary
const auth = require("../middleware/auth"); // Authentication middleware

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, nameWithInitials, email, password, confirmPassword, phoneNumber, gender, experience, skills, portfolioURL, linkedinURL } = req.body;
    let { profilePicture } = req.files; // Assuming you use a file upload library like express-fileupload

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Upload the profile picture to Cloudinary if provided
    let profilePictureUrl = null;
    if (profilePicture) {
      const uploadResult = await cloudinary.uploader.upload(profilePicture.tempFilePath);
      profilePictureUrl = uploadResult.secure_url;
    }

    // Create a new user object with the provided data
    user = new User({
      firstName,
      lastName,
      nameWithInitials,
      email,
      password: hashedPassword,
      phoneNumber,
      gender,
      experience,
      skills,
      portfolioURL,
      linkedinURL,
      profilePicture: profilePictureUrl, // Store the Cloudinary URL for the profile picture
    });

    // Save user to the database
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private (Requires auth middleware)
router.get("/profile", auth, async (req, res) => {
  try {
    // The 'auth' middleware already adds the 'user' object to the request, so we can directly access it
    const user = await User.findById(req.user.id).select("-password"); // Exclude password from response

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user); // Return user data
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   POST /api/auth/login
// @desc    Login user and return a JWT token
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password with hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create and sign the JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ token, userId: user._id, user }); // Return token, user ID, and user object excluding password
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private (Requires auth middleware)
router.put("/profile", auth, async (req, res) => {
  try {
    const { firstName, lastName, nameWithInitials, phoneNumber, gender, experience, skills, portfolioURL, linkedinURL } = req.body;
    let { profilePicture } = req.files; // Assuming you're using a file upload library

    // Check if user exists
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Upload the profile picture to Cloudinary if provided
    let profilePictureUrl = user.profilePicture; // Keep current picture if no new one is provided
    if (profilePicture) {
      const uploadResult = await cloudinary.uploader.upload(profilePicture.tempFilePath);
      profilePictureUrl = uploadResult.secure_url;
    }

    // Update user data
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.nameWithInitials = nameWithInitials || user.nameWithInitials;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.gender = gender || user.gender;
    user.experience = experience || user.experience;
    user.skills = skills || user.skills;
    user.portfolioURL = portfolioURL || user.portfolioURL;
    user.linkedinURL = linkedinURL || user.linkedinURL;
    user.profilePicture = profilePictureUrl;

    // Save the updated user to the database
    await user.save();

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;

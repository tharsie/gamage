const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2; // Assuming you're using Cloudinary for image uploads
const dotenv = require('dotenv');

dotenv.config();

// Configure Cloudinary for image upload
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

// Register User
exports.register = async (req, res) => {
    try {
        const { firstName, lastName, nameWithInitials, email, password, confirmPassword, phoneNumber, gender, experience, skills, portfolioURL, linkedinURL } = req.body;
        let { profilePicture } = req.files; // Assuming you're using a package like `express-fileupload` to handle file uploads

        // Validate fields
        if (!firstName || !lastName || !nameWithInitials || !email || !password || !confirmPassword || !phoneNumber || !gender || !experience || !skills) {
            return res.status(400).json({ msg: "All fields are required." });
        }

        // Check for existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ msg: "User already exists" });

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({ msg: "Passwords do not match" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Upload the profile picture to Cloudinary if available
        let profilePictureUrl = null;
        if (profilePicture) {
            const uploadResult = await cloudinary.uploader.upload(profilePicture.tempFilePath);
            profilePictureUrl = uploadResult.secure_url;
        }

        // Create a new user
        const newUser = new User({
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
            profilePicture: profilePictureUrl, // Store the profile picture URL
        });

        await newUser.save();
        res.status(201).json({ msg: "User registered successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Get User Profile (Authenticated)
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password"); // Exclude password from response
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ msg: "User not found" });

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        // Create JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.json({ token, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

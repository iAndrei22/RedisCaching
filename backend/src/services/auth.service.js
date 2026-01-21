const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const saltRounds = 10;

const register = async (username, email, password) => {
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });

        return user._id;
    } catch (error) {
        if (error.code === 11000) { // MongoDB duplicate key error code
            throw new Error("Email or Username already in use.");
        }
        throw error;
    }
};

const login = async (email, password) => {
    const user = await User.findOne({ email });

    if (!user) throw new Error("Invalid credentials.");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid credentials.");

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;
    
    return userObj;
};

module.exports = { register, login };
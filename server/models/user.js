const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cloudinary = require('cloudinary').v2;


const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    salt: { type: String, required: true },
    name: { type: String },
    picture: { type: String, default: null },
}, {
    timestamps: true
});







// Functions

userSchema.methods.setPassword = async function (password) {
    this.salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(password, this.salt);
};

userSchema.methods.checkPassword = async function (password) {
    return (await bcrypt.compare(password, this.password));
};

userSchema.methods.setName = async function () {
    return this.name = this.email.substring(0, this.email.indexOf('@')) + (Date.now()) % 10000;
};

userSchema.methods.setGooglePassword = async function () {
    this.salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(await bcrypt.genSalt(20), this.salt);
};

userSchema.methods.setProfileImg = async function (img) {
    if (process.env.CLOUDINARY_URL && img) {
        try {
            const result = await cloudinary.uploader.upload(
                img, {
                public_id: this.email + (Date.now() % 10000) + Math.floor(Math.random() * 10000),
                folder: 'Mars_Doodles', resource_type: 'image'
            });
            this.picture = result.secure_url;
        } catch (err) {
            console.log(err);
            this.picture = null;
        }
    } else {
        this.picture = null;
    }
}


const User = mongoose.model('users', userSchema);
module.exports = User;
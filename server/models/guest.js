const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const guestSchema = new mongoose.Schema({
    name: { type: String },
}, {
    timestamps: true
});






// Functions

guestSchema.methods.setName = async function () {
    return this.name = `Guest${Number.parseInt(Date.now() % 10000)}${Number.parseInt(Math.random() * 10000)}`;
};

const guest = mongoose.model('guests', guestSchema);
module.exports = guest;
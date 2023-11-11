const Guest = require('../models/guest');
const jwt = require('jsonwebtoken');

module.exports.create = function (req, res) {
    let guest = new Guest();
    guest.setName();
    // Save guest
    guest.save()
        .then(guest => {
            // Send correct response
            console.log(guest);
            let data = {
                type: 'guest',
                guest: {
                    _id: guest._id,
                    name: guest.name
                }
            };
            const authtoken = jwt.sign(data, process.env.JWT_SECRET);
            res.cookie('auth-token', authtoken, {
                secure: true,
                sameSite: 'None',
                httpOnly: true,
                // domain: process.env.COOKIE_DOMAIN
            });
            return res.status(200).json({
                message: 'Guest account created', type: 'success',
                player: {
                    type: 'guest',
                    guest: {
                        name: guest.name
                    }
                }
            });
        }).catch(err => {
            console.log(err);
            return res.status(403).json({ message: 'Server Failure', type: 'error' });
        });
}
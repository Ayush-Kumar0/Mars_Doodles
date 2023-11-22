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
                        _id: guest._id,
                        name: guest.name
                    }
                }
            });
        }).catch(err => {
            console.log(err);
            return res.status(403).json({ message: 'Server Failure', type: 'error' });
        });
}


// Change user's display name (name property)
module.exports.changeName = function (req, res) {
    const { name } = req.body;
    if (name && req.guest) {
        Guest.findByIdAndUpdate(req.guest._id, { $set: { name: name } }, { new: true })
            .then(async guest => {
                let data = {
                    type: 'guest',
                    guest: {
                        _id: guest._id,
                        name: guest.name
                    }
                }
                return res.status(200).json(data);
            })
            .catch(err => {
                console.log(err);
                return res.status(500).json({ message: 'Server error', type: 'error' });
            });
    } else {
        return res.status(401).json({});
    }
}
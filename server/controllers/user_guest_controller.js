const User = require('../models/user');
const Guest = require('../models/guest');
const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');

module.exports.logout = async function (req, res) {
    res.cookie('auth-token', '', {
        secure: true,
        sameSite: 'None',
        httpOnly: true,
        maxAge: 0,
        // domain: process.env.COOKIE_DOMAIN
    });
    if (req.guest) {
        try {
            await Guest.findByIdAndDelete(req.guest._id);
        } catch (err) {
            console.log(err);
        }
    }
    return res.status(200).json({});
}

module.exports.exists = async function (req, res) {
    if (req.user) {
        User.findById(req.user._id)
            .then(user => {
                if (user) {
                    let data = {
                        type: 'user',
                        user: {
                            _id: user._id,
                            name: user.name,
                            email: user.email,
                            picture: user.picture
                        }
                    };
                    return res.status(200).json(data);
                }
                else {
                    res.cookie('auth-token', '', {
                        secure: true,
                        sameSite: 'None',
                        httpOnly: true,
                        maxAge: 0,
                        // domain: process.env.COOKIE_DOMAIN
                    });
                    return res.status(403).json({});
                }
            }).catch(err => {
                console.log(err);
                res.cookie('auth-token', '', {
                    secure: true,
                    sameSite: 'None',
                    httpOnly: true,
                    maxAge: 0,
                    // domain: process.env.COOKIE_DOMAIN
                });
                return res.status(403).json({});
            });
    } else if (req.guest) {
        Guest.findById(req.guest._id)
            .then(guest => {
                if (guest) {
                    let data = {
                        type: 'guest',
                        guest: {
                            _id: guest._id,
                            name: guest.name,
                        }
                    };
                    return res.status(200).json(data);
                }
                else {
                    res.cookie('auth-token', '', {
                        secure: true,
                        sameSite: 'None',
                        httpOnly: true,
                        maxAge: 0,
                        // domain: process.env.COOKIE_DOMAIN
                    });
                    return res.status(403).json({});
                }
            }).catch(err => {
                console.log(err);
                res.cookie('auth-token', '', {
                    secure: true,
                    sameSite: 'None',
                    httpOnly: true,
                    maxAge: 0,
                    // domain: process.env.COOKIE_DOMAIN
                });
                return res.status(403).json({});
            });
    } else {
        return res.status(401).json({});
    }
}
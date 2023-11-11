const User = require('../models/user');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

module.exports.sendCode = async function (req, res) { }
async function emailExists(email) {
    try {
        async function codeToMail(email) {
            const transporter = nodemailer.createTransport({
                host: process.env.smtp_host,
                port: process.env.smtp_port,
                secure: false,
                auth: {
                    user: process.env.smtp_user,
                    pass: process.env.smtp_pass
                }
            });
            const info = transporter.sendMail({
                from: `"Mars Doodles" <${process.env.smtp_user}>`, // sender address
                to: `${email}`, // list of receivers
                subject: "Mars Doodles | verify", // Subject line
                text: `.`, // plain text body
            });
            return info;
        };
        const info = await codeToMail(email);
        // console.log(info);
        return true;
    } catch (err) {
        console.log('Email verification error: ' + err);
        return false;
    }
}

module.exports.create = async function (req, res) {
    const { email, password, confirmPassword } = req.body;
    // Credential verification
    if (!email || email === '' || !password || password === '' || !confirmPassword || confirmPassword === '')
        return res.status(403).json({ message: 'Enter all fields', type: 'error' });
    const emailRegex = /^[a-z0-9]+@[a-z]+\.[a-z]{2,3}$/;
    if (emailRegex.test(email) === false)
        return res.status(403).json({ message: 'Invalid email', type: 'error' });
    if (password !== confirmPassword)
        return res.status(403).json({ message: 'Password not matching', type: 'error' });
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!\s).+/;
    if (password.length < 8 || passwordRegex.test(password) === false)
        return res.status(403).json({ message: 'Weak password', type: 'warning' });
    if (await emailExists(email) === false)
        return res.status(403).json({ message: 'Email not found', type: 'error' });

    // Database saving
    User.findOne({ email: email })
        .then(async user => {
            if (user) {
                // User found
                return res.status(401).json({ message: 'Already created', type: 'warning' });
            } else {
                // Create user
                user = new User({ email });
                await user.setPassword(password);
                await user.setName();
                user.save()
                    .then(async user => {
                        // Correct response to client
                        let data = {
                            type: 'user',
                            user: {
                                _id: user._id,
                                name: user.name,
                                email: user.email
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
                            message: 'Signup successful', type: 'success',
                            player: {
                                type: 'user',
                                user: {
                                    name: user.name,
                                    email: user.email
                                }
                            }
                        });
                    })
                    .catch(err => {
                        console.log(err);
                        return res.status(500).json({ message: 'Server error', type: 'error' });
                    });
            }
        }).catch(err => {
            console.log(err);
            return res.status(500).json({ message: 'Server error', type: 'error' });
        });
}

module.exports.createSession = function (req, res) {
    const { email, password } = req.body;
    if (!email || email === '' || !password || password === '')
        return res.status(403).json({ message: 'Enter all fields', type: 'error' });

    // Database saving
    User.findOne({ email: email })
        .then(async user => {
            if (user) {
                // User found
                let data = {
                    type: 'user',
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email
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
                    message: 'Signin successful', type: 'success',
                    player: {
                        type: 'user',
                        user: {
                            name: user.name,
                            email: user.email
                        }
                    }
                });
            } else {
                // User not found
                return res.status(401).json({ message: 'Not registered', type: 'error' });
            }
        }).catch(err => {
            console.log(err);
            return res.status(500).json({ message: 'Server error', type: 'error' });
        });
}

module.exports.googleSignin = async function (req, res) {
    const { clientId, credential } = req.body;
    if (!clientId || !credential)
        return res.status(403).json({ message: 'Login data empty', type: 'error' });

    // Get google account details
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: [clientId]
    });
    const payload = ticket.getPayload();
    // const domain = payload['hd']; // If request specified a G Suite domain

    if (payload['email_verified'] === false)
        return res.status(401).json({ message: 'Account not verified', type: 'error' });

    // console.log(payload);
    // Autherization
    const email = payload['email'];
    User.findOne({ email })
        .then(async user => {
            if (user) {
                // Account present
                let data = {
                    type: 'user',
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email
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
                    message: 'Signin successful', type: 'success',
                    player: {
                        type: 'user',
                        user: {
                            name: user.name,
                            email: user.email
                        }
                    }
                });
            } else {
                // Account not present
                user = new User({ email, name: payload['name'] });
                await user.setGooglePassword();
                user.save()
                    .then(async user => {
                        // Correct response to client
                        let data = {
                            type: 'user',
                            user: {
                                _id: user._id,
                                name: user.name,
                                email: user.email
                            }
                        };
                        console.log(data);
                        const authtoken = jwt.sign(data, process.env.JWT_SECRET);
                        res.cookie('auth-token', authtoken, {
                            secure: true,
                            sameSite: 'None',
                            httpOnly: true,
                            // domain: process.env.COOKIE_DOMAIN
                        });
                        return res.status(200).json({
                            message: 'Signin successful', type: 'success',
                            player: {
                                type: 'user',
                                user: {
                                    name: user.name,
                                    email: user.email
                                }
                            }
                        });
                    })
                    .catch(err => {
                        console.log(err);
                        return res.status(500).json({ message: 'Server error', type: 'error' });
                    });
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ message: 'Server error', type: 'error' });
        });
}

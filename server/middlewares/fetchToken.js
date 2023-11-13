const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
    const token = req.cookies['auth-token'];
    if (!token) {
        return next();
    }
    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        if (data.type === 'user')
            req.user = data.user;
        else if (data.type === 'guest')
            req.guest = data.guest;
        return next();
    } catch (err) {
        return next();
    }
}
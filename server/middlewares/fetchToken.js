const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
    const token = req.cookies['auth-token'];
    if (!token) {
        return res.status(401).json({});
    }
    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        if (data.type === 'user')
            req.user = data.user;
        else if (data.type === 'guest')
            req.guest = data.guest;
        else
            return res.status(401).json({});
        next();
    } catch (err) {
        return res.status(500).json({});
    }
}
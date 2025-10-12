const jwt = require('jsonwebtoken');

exports.verifyToken = async(req,res,next) =>{
    const token = req.header('Authorization') || req.headers['authorization'];
    try {
        if(!token){
            return res.status(401).json({
                message:'Token is required,please send the token'
            })
        }
        const decode = jwt.verify(token,process.env.JWT_SECRET);
        req.user = decode;
        next();
    } catch (error) {
        console.log(error.message);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired' });
        } else {
            return res.status(500).json({ message: 'Server error during token verification' });
        }
    }
};
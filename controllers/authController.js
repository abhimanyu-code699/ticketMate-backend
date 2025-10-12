const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { registerUserSchema } = require('../validators/validator');
const { success, email } = require('zod');
const { sendMail } = require('../utils/sendMail');
const { generateRandomCode } = require('../utils/generateCode');
const redisClient = require('../config/redis');
const { id } = require('zod/locales');

exports.registerUser = async(req,res) =>{
    let connection

    const validatedData = registerUserSchema.parse(req.body);

    try {
        const { name,email,password,phone } = validatedData;
        
        connection = await pool.getConnection();

        const [rows] = await connection.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        )
        if(rows.length != 0){
            return res.status(409).json({
                message:'User already exists with this email'
            })
        }
        const code = await generateRandomCode();

        //hash the password
        const hashedPassword = await bcrypt.hash(password,10);

        const [result] = await connection.query(
            "INSERT INTO users(name,email,password,phone,code,isVerify) VALUES(?,?,?,?,?,?)",
            [name,email,password,phone,code,0]
        )
        const userData = {
            id: result.insertId,
            name,
            email,
            password: hashedPassword,
            code
        };
        const userId = userData.id;
        await redisClient.setEx(`verify:${userId}`, 1800, JSON.stringify(userData)); // 30 mins TTL
        //now send to the email
        await sendMail(
            email,
            "Verify Your Account",
            "verifyTemplate",
            {code}
        );
        return res.status(200).json({
            success:true,
            message:'user register and verification code sended successfully',
            userId:result.insertId
        });
    } catch (error) {
        console.log(error);
    }finally{
        if(connection) connection.release();
    }
}

exports.verifyAccount = async (req, res) => {
  let connection;

  const { userId, code } = req.body;
  if (!userId || !code) {
    return res.status(400).json({
      message: 'User Id and verification code are required'
    });
  }

  try {
    const redisData = await redisClient.get(`verify:${userId}`);
    if (!redisData) {
        return res.status(400).json({ message: 'Verification code expired, register again' });
    }
    const user = JSON.parse(redisData);

    if (user.code.toString() !== code.toString()) {
        return res.status(400).json({ message: 'Invalid verification code' });
    }
    const { password, id, name,email } = user;

    await redisClient.setEx(`user:${email}`,86400,JSON.stringify({id,password,name,email}));

    connection = await pool.getConnection();

    await connection.query(
      "UPDATE users SET isVerify = 1 WHERE id = ?",
      [userId]
    );
    connection.release();

    // Remove from verification cache
    await redisClient.del(`verify:${userId}`);

    const payload = {
        id:user.id,
        email:user.email,
        name:user.name
    }

    //jwt token
    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn:'24h'}
    )
    return res.status(200).json({
      success: true,
      message: 'Account verified successfully',
      token
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};


exports.loginUser = async (req, res) => {
  let connection;
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({
        message: "email and password is required to login",
      });
    }
    const cachedData = await redisClient.get(`user:${email}`);
    if (cachedData) {
      const user = JSON.parse(cachedUser);
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid)
        return res.status(401).json({ message: "Invalid password" });

      await redisClient.expire(`user:${email}`, 86400);
      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );
      return res
        .status(200)
        .json({ message: "User logged in (from cache)", token });
    }
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT id, name, email, password FROM users WHERE email = ? AND isVerify = 1",
      [email]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "User not found or not verified" });
    }
    const user = rows[0];
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid)
      return res.status(401).json({ message: "Invalid password" });

    // Cache the user in Redis for next login
    await redisClient.setEx(`user:${email}`, 86400, JSON.stringify(user));

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    return res.status(200).json({
      message: "user logged in successfully",
      token,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json(error);
  } finally {
    if (connection) connection.release();
  }
};

exports.forgetPassword = () =>{
    try {
        
    } catch (error) {
        
    }
}
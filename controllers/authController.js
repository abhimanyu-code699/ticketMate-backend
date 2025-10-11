const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { registerUserSchema } = require('../validators/validator');
const { success } = require('zod');
const { sendMail } = require('../utils/sendMail');
const { generateRandomCode } = require('../utils/generateCode');

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
    connection = await pool.getConnection();

    const [rows] = await connection.query(
      "SELECT id, name, email, code, createdAt FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    const userCreatedAt = new Date(user.createdAt);
    const expirationTime = 30 * 60 * 1000; 

    // Check expiration
    if (Date.now() - userCreatedAt.getTime() > expirationTime) {
        await connection.query("DELETE FROM users WHERE id = ?", [userId]);
        return res.status(400).json({
            message: 'Verification code has expired, please register again'
        });
    }

    // Check code
    if (code !== user.code) {
      return res.status(400).json({ message: 'Entered code is wrong' });
    }

    await connection.query(
      "UPDATE users SET isVerify = 1 WHERE id = ?",
      [userId]
    );

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


exports.loginUser = async(req,res) =>{
    let connection
    const { email,password } = req.body;
    try {
        if(!email || !password){
            return res.status(400).json({
                message:'email and password is required to login'
            })
        }
        connection = await pool.getConnection();
        
        const [row] = await connection.query(
            "SELECT id,name,email FROM users WHERE email = ?",
            [email]
        )
        if(row.length === 0){
            return res.status(409).json({
                message:'user not exists with this email'
            })
        }
        const user = row[0];
        const hashedPassword = await bcrypt.compare(password,user.password)
        if(!hashedPassword){
            return res.status(409).json({
                message:'Invalid password'
            })
        }
        const payload = {
            id:user.id,
            name:user.name,
            email:user.email
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn:'24h'}
        )
        return res.status(200).json({
            message:'user logged in successfully',
            token
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json(error);
    }finally{
        if(connection)connection.release();
    }
}
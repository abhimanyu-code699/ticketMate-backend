const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  console.log("🟡 Incoming Authorization:", req.headers.authorization);

  let token = req.headers.authorization;
  if (!token) {
    console.log("🔴 No token received");
    return res.status(401).json({ message: "Token required" });
  }

  if (token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  }

  console.log("🟡 Extracted Token:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🟢 Decoded Token Payload:", decoded);

    req.user = decoded; // { id, email }
    next();
  } catch (error) {
    console.log("🔴 JWT Error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};


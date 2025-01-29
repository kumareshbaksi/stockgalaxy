const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Retrieve token from HttpOnly cookies.
  const token = req.cookies?.authToken;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user ID to the request.
    req.userId = decoded.id;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized: Token expired" });
    }
    return res
      .status(403)
      .json({ success: false, message: "Unauthorized: Invalid token" });
  }
};

module.exports = verifyToken;

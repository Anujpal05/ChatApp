import jwt from "jsonwebtoken";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
});

export const createAccessToken = (user) => {
  if (!process.env.SECRET_KEY) throw new Error("SECRET_KEY is required");
  return jwt.sign(
    { userId: user._id.toString(), userName: user.userName, authenticatedAtSeconds: Math.floor(Date.now() / 1000) },
    process.env.SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d", issuer: "quicktalk-api", audience: "quicktalk-client" }
  );
};

export const generateToken = createAccessToken;

export const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    ...cookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookie = (res) => res.clearCookie("token", cookieOptions());

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Authentication required." });
  try {
    req.user = jwt.verify(token, process.env.SECRET_KEY, {
      issuer: "quicktalk-api",
      audience: "quicktalk-client",
    });
    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }
};

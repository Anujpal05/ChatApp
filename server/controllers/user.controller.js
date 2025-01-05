import Users from "../models/user.model.js";

export const registerUser = async (req, res) => {
  try {
    const { userName, password } = req.body;
    console.log("register.......");
    if (!userName || !password) {
      return res
        .status(404)
        .json({ message: "Please provide all required field!" });
    }

    if (userName.length < 5) {
      return res
        .status(400)
        .json({ message: "Username must be greater than 4!" });
    }

    if (password.length < 5) {
      return res
        .status(400)
        .json({ message: "Password must be greater than 4!" });
    }

    const existingUser = await Users.findOne({ userName });

    if (existingUser) {
      return res
        .status(200)
        .json({ message: "Login Successfully!", userDetails: existingUser });
    }

    const newUser = new Users({
      userName,
      password,
    });

    await newUser.save();
    console.log(newUser);
    return res.status(200).json({
      message: "New user register successfully!",
      userDetails: newUser,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Internal server error!", error: error });
  }
};

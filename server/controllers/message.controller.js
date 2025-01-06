import Messages from "../models/message.model.js";

export const getMessage = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;

    if (!senderId || !receiverId) {
      return res
        .status(404)
        .json({ message: "Please provide all required field!" });
    }

    const allMessage = await Messages.find({
      $or: [{ senderId }, { receiverId }],
    });

    return res
      .status(200)
      .json({ message: "Retrieve all messages!", allMessage });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;

    if (!senderId || !receiverId || !text) {
      return res
        .status(404)
        .json({ message: "Please provide all required field!" });
    }

    if (senderId == receiverId) {
      return res
        .status(400)
        .json({ message: "SenderId and ReceiverId do not same!" });
    }

    const newMessage = await Messages({
      senderId,
      receiverId,
      text,
    });

    newMessage.save();

    return res
      .status(200)
      .json({ message: "Message saved successfully!", newMessage });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!" });
  }
};

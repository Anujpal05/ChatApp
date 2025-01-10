import Messages from "../models/message.model.js";

export const getMessages = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user.userId;

    if (!senderId || !receiverId) {
      return res
        .status(404)
        .json({ message: "Please provide all required field!" });
    }

    const allMessages = await Messages.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    return res.status(200).json({ allMessages });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user.userId;

    console.log(receiverId);
    console.log(senderId);
    console.log(text);

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

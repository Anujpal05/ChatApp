import Messages from "../models/message.model.js";
import { getReceiverSocketId, io } from "../utils/socket.js";

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

    const receiverSocketId = getReceiverSocketId(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    return res.status(200).json({ newMessage });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!" });
  }
};

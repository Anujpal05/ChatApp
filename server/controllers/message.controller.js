import cloudinary from "../config/cloudnaryConfig.js";
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
    const { text, image } = req.body;
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

    let imageUrl;

    if (image) {
      const result = await cloudinary.uploader.upload(image, {
        folder: "chat_images",
        resource_type: "auto",
      });

      const publicId = result.public_id;
      scheduleImageDeletion(publicId);
      imageUrl = result.url;
    }

    const newMessage = await Messages({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    const receiverSocketId = getReceiverSocketId(receiverId);
    const time = Date.now();

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", {
        senderId,
        receiverId,
        text,
        image: imageUrl,
        createdAt: time,
      });
    }

    newMessage.save();

    return res.status(200).json({ newMessage });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!" });
  }
};

const scheduleImageDeletion = (publicId) => {
  setTimeout(() => {
    deleteImage(publicId);
  }, 100000);
};

const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(result);
  } catch (error) {
    console.log(error);
  }
};

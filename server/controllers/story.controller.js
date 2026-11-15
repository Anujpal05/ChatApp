import mongoose from "mongoose";
import Story from "../models/story.model.js";
import Users from "../models/user.model.js";
import cloudinary from "../config/cloudnaryConfig.js";

const STORY_DURATION = 12 * 60 * 60 * 1000;

const uploadStoryMedia = (buffer, resourceType) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "quicktalk/stories",
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    stream.end(buffer);
  });

export const listStories = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const currentUser = await Users.findById(currentUserId)
      .select("blockedUsers")
      .lean();

    if (!currentUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const blockedIds = (currentUser.blockedUsers || []).map(String);

    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
      audience: "public",
      userId: { $nin: [currentUserId, ...blockedIds] },
    })
      .populate("userId", "userName avatar")
      .sort({ createdAt: 1 })
      .lean();

    // Include the current user's own active stories separately.
    const ownStories = await Story.find({
      userId: currentUserId,
      expiresAt: { $gt: new Date() },
    })
      .populate("userId", "userName avatar")
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      stories: [...ownStories, ...stories],
      ownStories,
    });
  } catch (error) {
    console.error("listStories:", error.message);
    res.status(500).json({ message: "Unable to load stories." });
  }
};

export const createStory = async (req, res) => {
  let uploaded;

  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: "Choose a photo or video." });
    }

    const isImage = req.file.mimetype?.startsWith("image/");
    const isVideo = req.file.mimetype?.startsWith("video/");

    if (!isImage && !isVideo) {
      return res.status(400).json({
        message: "Only image and video stories are supported.",
      });
    }

    if (isImage && req.file.size > 10 * 1024 * 1024) {
      return res.status(413).json({
        message: "Maximum image story size is 10 MB.",
      });
    }

    if (isVideo && req.file.size > 50 * 1024 * 1024) {
      return res.status(413).json({
        message: "Maximum video story size is 50 MB.",
      });
    }

    const caption = String(req.body?.caption || "").trim();

    if (caption.length > 240) {
      return res.status(400).json({
        message: "Caption cannot exceed 240 characters.",
      });
    }

    uploaded = await uploadStoryMedia(
      req.file.buffer,
      isVideo ? "video" : "image",
    );

    const story = await Story.create({
      userId: req.user.userId,
      mediaUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      mediaType: isVideo ? "video" : "image",
      caption,
      audience: "public",
      expiresAt: new Date(Date.now() + STORY_DURATION),
    });

    await story.populate("userId", "userName avatar");

    res.status(201).json({ story });
  } catch (error) {
    console.error("createStory:", error.message);

    // Avoid leaving an uploaded file behind if database creation fails.
    if (uploaded?.public_id) {
      await cloudinary.uploader
        .destroy(uploaded.public_id, {
          resource_type: uploaded.resource_type || "image",
        })
        .catch(() => {});
    }

    res.status(500).json({ message: "Unable to publish story." });
  }
};

export const viewStory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid story." });
    }

    const story = await Story.findOne({
      _id: req.params.id,
      expiresAt: { $gt: new Date() },
    });

    if (!story) {
      return res.status(404).json({ message: "Story unavailable." });
    }

    if (String(story.userId) === String(req.user.userId)) {
      return res.json({ viewed: true, ownStory: true });
    }

    const [owner, viewer] = await Promise.all([
      Users.findById(story.userId).select("blockedUsers").lean(),
      Users.findById(req.user.userId).select("blockedUsers").lean(),
    ]);

    const ownerBlocksViewer = owner?.blockedUsers?.some(
      (id) => String(id) === String(req.user.userId),
    );
    const viewerBlocksOwner = viewer?.blockedUsers?.some(
      (id) => String(id) === String(story.userId),
    );

    if (story.audience !== "public" || ownerBlocksViewer || viewerBlocksOwner) {
      return res.status(403).json({ message: "Story unavailable." });
    }

    await Story.updateOne(
      {
        _id: story._id,
        "viewers.userId": { $ne: req.user.userId },
      },
      {
        $push: {
          viewers: {
            userId: req.user.userId,
            viewedAt: new Date(),
          },
        },
      },
    );

    res.json({ viewed: true });
  } catch (error) {
    console.error("viewStory:", error.message);
    res.status(500).json({ message: "Unable to record story view." });
  }
};

export const getStoryViewers = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid story." });
    }

    const story = await Story.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }).populate("viewers.userId", "userName avatar");

    if (!story) {
      return res.status(404).json({
        message: "Story not found or you are not its owner.",
      });
    }

    // Deduplicate older records, keeping each viewer's first view.
    const uniqueViewers = new Map();

    for (const viewer of story.viewers) {
      if (!viewer.userId) continue;

      const id = String(viewer.userId._id);
      const existing = uniqueViewers.get(id);

      if (
        !existing ||
        new Date(viewer.viewedAt) < new Date(existing.viewedAt)
      ) {
        uniqueViewers.set(id, {
          userId: id,
          userName: viewer.userId.userName,
          avatar: viewer.userId.avatar,
          viewedAt: viewer.viewedAt,
        });
      }
    }

    const viewers = Array.from(uniqueViewers.values()).sort(
      (a, b) => new Date(a.viewedAt) - new Date(b.viewedAt),
    );

    res.json({
      viewers,
      totalViews: viewers.length,
    });
  } catch (error) {
    console.error("getStoryViewers:", error.message);
    res.status(500).json({
      message: "Unable to load story viewers.",
    });
  }
};

export const deleteStory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid story." });
    }

    const story = await Story.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!story) {
      return res.status(404).json({
        message: "Story not found or you cannot delete it.",
      });
    }

    await Story.deleteOne({ _id: story._id });

    await cloudinary.uploader
      .destroy(story.publicId, {
        resource_type: story.mediaType === "video" ? "video" : "image",
      })
      .catch((error) => {
        console.error("Cloudinary story deletion:", error.message);
      });

    res.json({ message: "Story deleted." });
  } catch (error) {
    console.error("deleteStory:", error.message);
    res.status(500).json({ message: "Unable to delete story." });
  }
};

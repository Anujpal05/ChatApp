import mongoose from "mongoose";
import Group from "../models/group.model.js";
import Users from "../models/user.model.js";
import { io } from "../utils/socket.js";

const MAX_MEMBERS = 256;

const validId = (id) => mongoose.isValidObjectId(id);

const memberIds = (group) =>
  group.members.map((member) => String(member.userId));

const isMember = (group, userId) => memberIds(group).includes(String(userId));

const isAdmin = (group, userId) =>
  group.members.some(
    (member) =>
      String(member.userId) === String(userId) && member.role === "admin",
  );

const groupRoom = (groupId) => `group:${groupId}`;

const notifyMembers = (group, event, payload = {}) => {
  for (const member of group.members) {
    io.to(`user:${member.userId}`).emit(event, {
      groupId: String(group._id),
      ...payload,
    });
  }
};

async function findGroupForMember(groupId, userId) {
  if (!validId(groupId)) return null;

  const group = await Group.findOne({
    _id: groupId,
    isActive: true,
  });

  if (!group || !isMember(group, userId)) return null;

  return group;
}

// CREATE GROUP
export const createGroup = async (req, res) => {
  try {
    const creatorId = String(req.user.userId);
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();

    const requestedIds = req.body?.memberIds;

    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({
        message: "Group name must contain 2–50 characters.",
      });
    }

    if (description.length > 200) {
      return res.status(400).json({
        message: "Description cannot exceed 200 characters.",
      });
    }

    if (!Array.isArray(requestedIds)) {
      return res.status(400).json({
        message: "Select group members.",
      });
    }

    const uniqueIds = [...new Set(requestedIds.map(String))].filter(
      (id) => id !== creatorId,
    );

    if (uniqueIds.some((id) => !validId(id))) {
      return res.status(400).json({
        message: "One or more selected users are invalid.",
      });
    }

    if (uniqueIds.length < 1) {
      return res.status(400).json({
        message: "Select at least one other member.",
      });
    }

    if (uniqueIds.length + 1 > MAX_MEMBERS) {
      return res.status(400).json({
        message: `A group can have at most ${MAX_MEMBERS} members.`,
      });
    }

    const creator = await Users.findById(creatorId)
      .select("blockedUsers")
      .lean();

    if (!creator) {
      return res.status(404).json({ message: "User not found." });
    }

    const users = await Users.find({
      _id: { $in: uniqueIds },
    })
      .select("_id blockedUsers")
      .lean();

    if (users.length !== uniqueIds.length) {
      return res.status(400).json({
        message: "One or more selected users do not exist.",
      });
    }

    const blockedByCreator = new Set((creator.blockedUsers || []).map(String));

    const unavailable = users.some(
      (user) =>
        blockedByCreator.has(String(user._id)) ||
        (user.blockedUsers || []).some((id) => String(id) === creatorId),
    );

    if (unavailable) {
      return res.status(400).json({
        message: "One or more selected users are unavailable.",
      });
    }

    const members = [
      {
        userId: creatorId,
        role: "admin",
        joinedAt: new Date(),
        addedBy: creatorId,
      },
      ...uniqueIds.map((id) => ({
        userId: id,
        role: "member",
        joinedAt: new Date(),
        addedBy: creatorId,
      })),
    ];

    const group = await Group.create({
      name,
      description,
      createdBy: creatorId,
      members,
    });

    const populated = await Group.findById(group._id)
      .populate("createdBy", "userName avatar")
      .populate("members.userId", "userName avatar signalUserId")
      .lean();

    notifyMembers(group, "group:created", {
      group: populated,
    });

    return res.status(201).json({
      message: "Group created successfully.",
      group: populated,
    });
  } catch (error) {
    console.error("createGroup:", error.message);
    return res.status(500).json({
      message: "Unable to create group.",
    });
  }
};

// LIST MY GROUPS
export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      isActive: true,
      "members.userId": req.user.userId,
    })
      .populate("createdBy", "userName avatar")
      .populate("members.userId", "userName avatar signalUserId")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    return res.json({ groups });
  } catch (error) {
    console.error("getMyGroups:", error.message);
    return res.status(500).json({
      message: "Unable to load groups.",
    });
  }
};

// GET GROUP DETAILS
export const getGroupDetails = async (req, res) => {
  try {
    const group = await findGroupForMember(req.params.groupId, req.user.userId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found or access denied.",
      });
    }

    await group.populate([
      { path: "createdBy", select: "userName avatar" },
      {
        path: "members.userId",
        select: "userName avatar signalUserId isOnline",
      },
    ]);

    return res.json({ group });
  } catch (error) {
    console.error("getGroupDetails:", error.message);
    return res.status(500).json({
      message: "Unable to load group details.",
    });
  }
};

// UPDATE GROUP INFORMATION
export const updateGroup = async (req, res) => {
  try {
    const group = await findGroupForMember(req.params.groupId, req.user.userId);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (!isAdmin(group, req.user.userId)) {
      return res.status(403).json({
        message: "Only group admins can update group information.",
      });
    }

    const { name, description, avatar } = req.body || {};

    if (name !== undefined) {
      const value = String(name).trim();

      if (value.length < 2 || value.length > 50) {
        return res.status(400).json({
          message: "Group name must contain 2–50 characters.",
        });
      }

      group.name = value;
    }

    if (description !== undefined) {
      const value = String(description).trim();

      if (value.length > 200) {
        return res.status(400).json({
          message: "Description cannot exceed 200 characters.",
        });
      }

      group.description = value;
    }

    // Avatar upload will be added in the media phase.
    if (avatar !== undefined) {
      return res.status(400).json({
        message: "Use the group image upload feature when available.",
      });
    }

    await group.save();

    notifyMembers(group, "group:updated", {
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
      },
    });

    return res.json({
      message: "Group updated.",
      group,
    });
  } catch (error) {
    console.error("updateGroup:", error.message);
    return res.status(500).json({
      message: "Unable to update group.",
    });
  }
};

// ADD MEMBERS
export const addGroupMembers = async (req, res) => {
  try {
    const group = await findGroupForMember(req.params.groupId, req.user.userId);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (!isAdmin(group, req.user.userId)) {
      return res.status(403).json({
        message: "Only admins can add members.",
      });
    }

    const requestedIds = req.body?.memberIds;

    if (!Array.isArray(requestedIds) || !requestedIds.length) {
      return res.status(400).json({
        message: "Select at least one user.",
      });
    }

    const existing = new Set(memberIds(group));

    const newIds = [...new Set(requestedIds.map(String))].filter(
      (id) => !existing.has(id),
    );

    if (newIds.some((id) => !validId(id))) {
      return res.status(400).json({
        message: "Invalid member ID.",
      });
    }

    if (group.members.length + newIds.length > MAX_MEMBERS) {
      return res.status(400).json({
        message: "Group member limit reached.",
      });
    }

    const users = await Users.find({
      _id: { $in: newIds },
    })
      .select("_id blockedUsers")
      .lean();

    if (users.length !== newIds.length) {
      return res.status(400).json({
        message: "One or more users do not exist.",
      });
    }

    const currentMemberIds = memberIds(group);

    const blocked = users.some((user) =>
      (user.blockedUsers || []).some((id) =>
        currentMemberIds.includes(String(id)),
      ),
    );

    if (blocked) {
      return res.status(400).json({
        message: "A selected user is unavailable to a group member.",
      });
    }

    for (const id of newIds) {
      group.members.push({
        userId: id,
        role: "member",
        joinedAt: new Date(),
        addedBy: req.user.userId,
      });
    }

    await group.save();

    notifyMembers(group, "group:members-updated", {
      action: "added",
      memberIds: newIds,
    });

    const populated = await Group.findById(group._id)
      .populate("createdBy", "userName avatar")
      .populate("members.userId", "userName avatar signalUserId")
      .lean();

    return res.json({
      message: "Members added.",
      group: populated,
    });
  } catch (error) {
    console.error("addGroupMembers:", error.message);
    return res.status(500).json({
      message: "Unable to add members.",
    });
  }
};

// REMOVE MEMBER OR LEAVE GROUP
export const removeGroupMember = async (req, res) => {
  try {
    const group = await findGroupForMember(req.params.groupId, req.user.userId);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const targetId = String(req.params.userId);
    const actorId = String(req.user.userId);

    if (!validId(targetId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const target = group.members.find(
      (member) => String(member.userId) === targetId,
    );

    if (!target) {
      return res.status(404).json({
        message: "This user is not a group member.",
      });
    }

    const isSelfLeaving = targetId === actorId;

    if (!isSelfLeaving && !isAdmin(group, actorId)) {
      return res.status(403).json({
        message: "Only admins can remove other members.",
      });
    }

    if (!isSelfLeaving && target.role === "admin" && isAdmin(group, targetId)) {
      const adminCount = group.members.filter(
        (member) => member.role === "admin",
      ).length;

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Promote another admin before removing the only admin.",
        });
      }
    }

    group.members = group.members.filter(
      (member) => String(member.userId) !== targetId,
    );

    if (group.members.length === 0) {
      group.isActive = false;
    }

    await group.save();

    io.to(`user:${targetId}`).emit("group:removed", {
      groupId: String(group._id),
      removedBy: actorId,
    });

    notifyMembers(group, "group:members-updated", {
      action: isSelfLeaving ? "left" : "removed",
      memberIds: [targetId],
    });

    return res.json({
      message: isSelfLeaving ? "You left the group." : "Member removed.",
      groupId: String(group._id),
    });
  } catch (error) {
    console.error("removeGroupMember:", error.message);
    return res.status(500).json({
      message: "Unable to update group membership.",
    });
  }
};

// PROMOTE OR DEMOTE ADMIN
export const updateGroupMemberRole = async (req, res) => {
  try {
    const group = await findGroupForMember(req.params.groupId, req.user.userId);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (!isAdmin(group, req.user.userId)) {
      return res.status(403).json({
        message: "Only admins can change member roles.",
      });
    }

    const target = group.members.find(
      (member) => String(member.userId) === String(req.params.userId),
    );

    if (!target) {
      return res.status(404).json({
        message: "Member not found.",
      });
    }

    const role = req.body?.role;

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({
        message: "Role must be admin or member.",
      });
    }

    if (
      role === "member" &&
      target.role === "admin" &&
      group.members.filter((member) => member.role === "admin").length <= 1
    ) {
      return res.status(400).json({
        message: "A group must have at least one admin.",
      });
    }

    target.role = role;
    await group.save();

    notifyMembers(group, "group:members-updated", {
      action: "role-changed",
      memberIds: [String(target.userId)],
      role,
    });

    return res.json({
      message: `Member role updated to ${role}.`,
    });
  } catch (error) {
    console.error("updateGroupMemberRole:", error.message);
    return res.status(500).json({
      message: "Unable to update member role.",
    });
  }
};

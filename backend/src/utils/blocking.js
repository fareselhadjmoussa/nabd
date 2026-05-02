const Block = require('../models/Block');

const normalizeId = (value) => value?._id?.toString?.() || value?.toString?.() || '';

const isBlockedBetween = async (userId1, userId2) => {
  const a = normalizeId(userId1);
  const b = normalizeId(userId2);
  if (!a || !b) return false;

  return Boolean(await Block.exists({
    $or: [
      { blocker: a, blocked: b },
      { blocker: b, blocked: a },
    ],
  }));
};

const getBlockedUserIdsFor = async (userId) => {
  const id = normalizeId(userId);
  if (!id) return [];

  const blocks = await Block.find({
    $or: [
      { blocker: id },
      { blocked: id },
    ],
  }).lean();

  return [...new Set(blocks.flatMap((block) => [normalizeId(block.blocker), normalizeId(block.blocked)]))]
    .filter((blockedId) => blockedId && blockedId !== id);
};

module.exports = {
  isBlockedBetween,
  getBlockedUserIdsFor,
};

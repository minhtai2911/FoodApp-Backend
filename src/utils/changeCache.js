const invalidateCache = async (req, key, keys, input) => {
  const cachedKey = `${key}:${input}`;
  await req.redisClient.del(cachedKey);

  const cachedKeys = await req.redisClient.keys(`${keys}:*`);
  if (cachedKeys.length > 0) {
    await req.redisClient.del(cachedKeys);
  }
};

export default invalidateCache;

const mongoose = require('mongoose');
const config = require('../src/config');
const User = require('../src/models/User');

const run = async () => {
  try {
    if (!config.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from backend/.env');
    }

    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const indexes = await User.collection.indexes();

    const indexesToDrop = indexes.filter((index) => {
      if (index.name === '_id_') return false;

      // Old Google OAuth unique index can block normal email/password users.
      if (
        index.unique === true
        && index.key
        && Object.prototype.hasOwnProperty.call(index.key, 'googleId')
      ) {
        return true;
      }

      // Old text index used the default language_override field: `language`.
      // Our documents contain language: 'ar', but MongoDB text indexes do not
      // support Arabic as a language override, causing registration to fail.
      const hasTextKey = Object.values(index.key || {}).includes('text');
      const usesDefaultLanguageOverride = !index.language_override || index.language_override === 'language';
      if (hasTextKey && usesDefaultLanguageOverride) {
        return true;
      }

      return false;
    });

    if (indexesToDrop.length === 0) {
      console.log('✅ No old blocking indexes found');
    }

    for (const index of indexesToDrop) {
      await User.collection.dropIndex(index.name);
      console.log(`✅ Dropped old blocking index: ${index.name}`);
    }

    await User.syncIndexes();
    console.log('✅ User indexes synced');
  } catch (error) {
    console.error('❌ Failed to fix indexes:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();

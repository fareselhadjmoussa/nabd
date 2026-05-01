const User = require('../models/User');

/**
 * Fix old MongoDB indexes that can break registration.
 * Some earlier versions created a unique googleId index. Because normal users
 * do not have googleId, MongoDB may reject the second user with duplicate null.
 */
const fixUserIndexes = async () => {
  try {
    const indexes = await User.collection.indexes();

    const indexesToDrop = indexes.filter((index) => {
      if (index.name === '_id_') return false;

      const keys = Object.keys(index.key || {});

      // Keep only the valid unique indexes for username and email.
      if (index.unique) {
        const allowedUnique = keys.length === 1 && ['username', 'email'].includes(keys[0]);
        if (!allowedUnique) return true;
      }

      // Drop old text indexes that use the default language_override field name (`language`).
      // The user model has a normal `language` field with values like `ar`, which MongoDB
      // text indexes reject as an unsupported override language during insert.
      const hasTextKey = Object.values(index.key || {}).includes('text');
      const usesDefaultLanguageOverride = !index.language_override || index.language_override === 'language';
      if (hasTextKey && usesDefaultLanguageOverride) return true;

      return false;
    });

    for (const index of indexesToDrop) {
      await User.collection.dropIndex(index.name);
      console.log(`✅ Dropped old blocking user index: ${index.name}`);
    }

    // Re-sync current model indexes. This keeps username/email unique and recreates
    // the search text index with safe options.
    await User.syncIndexes();
    console.log('✅ User indexes are ready');
  } catch (error) {
    console.warn('⚠️ Could not auto-fix user indexes:', error.message);
    console.warn('   You can run: npm run fix:indexes');
  }
};

module.exports = fixUserIndexes;

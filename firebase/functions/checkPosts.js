const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'letsmakemusic-4e0fe'
  });
}

const db = admin.firestore();

// Check both the main posts collection AND the user's home_feed_live
// to verify edit data propagates correctly

async function checkDatabase() {
  console.log('\n========================================');
  console.log('DATABASE VERIFICATION - EDIT PROPAGATION');
  console.log('========================================\n');

  // 1. Check main posts collection
  console.log('=== 1. MAIN POSTS COLLECTION (posts) ===\n');
  const postsSnapshot = await db.collection('posts')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  console.log('Total posts found:', postsSnapshot.size);
  postsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log('\n---');
    console.log('ID:', doc.id);
    console.log('postText:', data.postText?.substring(0, 60) || '(empty)');
    console.log('description:', data.description?.substring(0, 60) || '(empty)');
    console.log('hashtags:', JSON.stringify(data.hashtags || []));
    console.log('isEdited:', data.isEdited || false);
    console.log('editedAt:', data.editedAt || '(never)');
  });

  // 2. Check a user's home_feed_live collection
  // Get the first user ID from posts
  const firstPost = postsSnapshot.docs[0]?.data();
  const userId = firstPost?.authorID;

  if (userId) {
    console.log('\n\n=== 2. HOME_FEED_LIVE for user:', userId, '===\n');
    const homeFeedSnapshot = await db.collection('social_feeds')
      .doc(userId)
      .collection('home_feed_live')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    console.log('Total in home_feed_live:', homeFeedSnapshot.size);
    homeFeedSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('\n---');
      console.log('ID:', doc.id);
      console.log('postText:', data.postText?.substring(0, 60) || '(empty)');
      console.log('description:', data.description?.substring(0, 60) || '(empty)');
      console.log('hashtags:', JSON.stringify(data.hashtags || []));
      console.log('isEdited:', data.isEdited || false);
      console.log('editedAt:', data.editedAt || '(never)');
    });
  }

  console.log('\n\n========================================');
  console.log('VERIFICATION COMPLETE');
  console.log('========================================\n');
  process.exit(0);
}

checkDatabase().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

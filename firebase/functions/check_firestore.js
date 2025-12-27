const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(process.cwd(), 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  // Check for Madison's Glow in songs
  const songs = await db.collection('songs').get();
  console.log('\n=== All Songs ===');
  songs.forEach(doc => {
    const data = doc.data();
    const hasLyrics = data.lyrics ? true : false;
    console.log('Song:', data.title, '| hasLyrics:', hasLyrics);
    if (data.title && data.title.toLowerCase().includes('madison')) {
      console.log('  -> FOUND MADISON in songs collection!');
      console.log('  Lyrics:', data.lyrics ? data.lyrics.substring(0, 100) + '...' : 'NO LYRICS');
    }
  });

  // Check posts for Madison's Glow
  const posts = await db.collection('posts').get();
  console.log('\n=== Checking Posts for Madison ===');

  for (const doc of posts.docs) {
    const data = doc.data();
    const title = data.songData?.title || data.postText || '';

    if (title.toLowerCase().includes('madison') || title.toLowerCase().includes('glow')) {
      console.log('\nPost ID:', doc.id);
      console.log('  Title:', title);
      console.log('  postType:', data.postType);
      console.log('  Has songData:', data.songData ? 'YES' : 'NO');
      console.log('  Has songData.lyrics:', data.songData?.lyrics ? 'YES' : 'NO');

      if (data.songData?.lyrics) {
        console.log('  Lyrics preview:', data.songData.lyrics.substring(0, 100) + '...');
      } else {
        console.log('  Lyrics: NOT AVAILABLE');
      }

      // Check comments for this post
      const comments = await db.collection('posts').doc(doc.id).collection('comments_live').get();
      console.log('  Comments count:', comments.size);
      comments.forEach(c => {
        const cData = c.data();
        console.log('    Comment by', cData.author?.username || cData.authorID, ':', cData.text);
      });
    }
  }

  // Also check lunastrums posts
  console.log('\n=== All posts by lunastrums ===');
  for (const doc of posts.docs) {
    const data = doc.data();
    if (data.author?.username === 'lunastrums') {
      console.log('Post:', data.songData?.title || data.postText, '| ID:', doc.id);
    }
  }
}

check().then(() => {
  console.log('\nDone checking');
  setTimeout(() => process.exit(0), 2000);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

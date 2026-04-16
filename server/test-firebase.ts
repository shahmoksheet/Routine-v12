import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import config from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp({
  credential: applicationDefault(),
  projectId: config.projectId
});

const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  await db.collection('test').add({ hello: 'world' });
  console.log('Success');
}
test().catch(console.error);

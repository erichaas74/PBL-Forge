export const environment = {
  production: true,
  useEmulators: false,
  // Keep enabled while the hosted application is being tested. Firestore rules still protect data.
  openTeacherAccess: true,
  // Never place a service-account key or Admin SDK credential in this file.
  firebase: {
    apiKey: 'AIzaSyAnnHk2FoDgBGn7kLm1MFZCesU89-bZCTs',
    authDomain: 'dragon-genetics-lab.firebaseapp.com',
    projectId: 'dragon-genetics-lab',
    storageBucket: 'dragon-genetics-lab.firebasestorage.app',
    messagingSenderId: '575459835780',
    appId: '1:575459835780:web:31344993eab5fdfaa527d1'
  }
};

export const environment = {
  production: true,
  useEmulators: false,
  // Keep enabled while the hosted application is being tested. Firestore rules still protect data.
  openTeacherAccess: true,
  // Never place a service-account key or Admin SDK credential in this file.
  firebase: {
    apiKey: 'AIzaSyAHohChpbexBOktzdm5ljjep7rVkeTPqP4',
    authDomain: 'pbl-forge.firebaseapp.com',
    projectId: 'pbl-forge',
    storageBucket: 'pbl-forge.firebasestorage.app',
    messagingSenderId: '48775518255',
    appId: '1:48775518255:web:fbbf070393d3f42dbc4eda'
  }
};

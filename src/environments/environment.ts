export const environment = {
  production: false,
  useEmulators: true,
  // Temporary testing policy: every tester, including a guest, may open teacher routes.
  openTeacherAccess: true,
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-pbl-forge.firebaseapp.com',
    projectId: 'demo-pbl-forge',
    storageBucket: 'demo-pbl-forge.firebasestorage.app',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:demo'
  }
};

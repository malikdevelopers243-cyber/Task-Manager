import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyDGPdo2jBG4xnd0f7_ylvbYVJ3uHodU5_Q',
  authDomain: 'office-management-53f77.firebaseapp.com',
  projectId: 'office-management-53f77',
  storageBucket: 'office-management-53f77.firebasestorage.app',
  messagingSenderId: '195242570689',
  appId: '1:195242570689:web:1d6f1a03c9a8dbc996b540',
  measurementId: 'G-MNXNZP3E84',
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

let analytics = null
try {
  analytics = getAnalytics(app)
} catch (error) {
  console.warn('Firebase analytics not initialized:', error.message)
}

export { analytics }

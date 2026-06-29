/* Firebase auth is disabled for frontend-only mock authentication. */

/*
import { auth, db } from './config.js'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export const loginUser = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const user = credential.user
  const userDoc = await getDoc(doc(db, 'users', user.uid))
  const userData = userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null
  return { authUser: user, userData }
}

export const logoutUser = async () => {
  await firebaseSignOut(auth)
}

export const createUserAccount = async (email, password, profile = {}) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const user = credential.user
  const userDoc = {
    email,
    role: profile.role || 'employee',
    name: profile.name || 'New User',
    department: profile.department || '',
    isActive: profile.isActive ?? true,
    joiningDate: profile.joiningDate || null,
    ...profile,
  }

  await setDoc(doc(db, 'users', user.uid), userDoc)
  return { id: user.uid, ...userDoc }
}

export const createEmployee = async (email, password, profile = {}) => {
  return createUserAccount(email, password, { role: 'employee', ...profile })
}
*/

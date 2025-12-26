import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create or update user profile in Firestore
  const createUserProfile = async (user, additionalData = {}) => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const { email, displayName, photoURL } = user;
      const createdAt = serverTimestamp();

      await setDoc(userRef, {
        email,
        displayName: displayName || additionalData.displayName || email.split('@')[0],
        photoURL,
        role: additionalData.role || 'hunter', // Default role
        createdAt,
        totalEarned: 0,
        totalSpent: 0,
        completedBounties: 0,
        postedBounties: 0,
        ...additionalData
      });
    }

    // Fetch the profile
    const updatedSnap = await getDoc(userRef);
    setUserProfile({ id: updatedSnap.id, ...updatedSnap.data() });
  };

  // Sign up with email/password
  const signup = async (email, password, displayName, role = 'hunter') => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    await createUserProfile(result.user, { displayName, role });
    return result.user;
  };

  // Sign in with email/password
  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await createUserProfile(result.user);
    return result.user;
  };

  // Sign in with Google
  const loginWithGoogle = async (role = 'hunter') => {
    const result = await signInWithPopup(auth, googleProvider);
    await createUserProfile(result.user, { role });
    return result.user;
  };

  // Sign out
  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  // Update user role
  const updateUserRole = async (role) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { role }, { merge: true });
    setUserProfile(prev => ({ ...prev, role }));
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await createUserProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

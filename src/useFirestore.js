import { useState, useEffect } from 'react';
import { 
  collection, 
  doc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

// ==================== BOUNTIES ====================

export const useBounties = (filters = {}) => {
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let q = collection(db, 'bounties');
    
    // Build query based on filters
    const constraints = [];
    
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.category && filters.category !== 'All') {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters.posterId) {
      constraints.push(where('posterId', '==', filters.posterId));
    }
    
    constraints.push(orderBy('createdAt', 'desc'));
    
    q = query(q, ...constraints);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const bountiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          deadline: doc.data().deadline?.toDate?.() || new Date()
        }));
        setBounties(bountiesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching bounties:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [filters.status, filters.category, filters.posterId]);

  return { bounties, loading, error };
};

export const useCreateBounty = () => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createBounty = async (bountyData) => {
    if (!user) throw new Error('Must be logged in');
    
    setLoading(true);
    setError(null);

    try {
      const bounty = {
        ...bountyData,
        posterId: user.uid,
        posterName: userProfile?.displayName || user.email,
        status: 'active',
        completed: 0,
        approved: 0,
        pendingReview: 0,
        hunters: [],
        hunterCount: 0,
        createdAt: serverTimestamp(),
        deadline: new Date(bountyData.deadline)
      };

      const docRef = await addDoc(collection(db, 'bounties'), bounty);
      
      // Update user's posted bounties count
      await updateDoc(doc(db, 'users', user.uid), {
        postedBounties: increment(1)
      });

      return docRef.id;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createBounty, loading, error };
};

export const useClaimBounty = () => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const claimBounty = async (bountyId) => {
    if (!user) throw new Error('Must be logged in');
    
    setLoading(true);

    try {
      const bountyRef = doc(db, 'bounties', bountyId);
      
      // Add user to hunters array
      await updateDoc(bountyRef, {
        hunters: arrayUnion(user.uid),
        hunterCount: increment(1)
      });

      // Create a claim record
      await addDoc(collection(db, 'claims'), {
        bountyId,
        hunterId: user.uid,
        hunterName: userProfile?.displayName || user.email,
        status: 'active',
        claimedAt: serverTimestamp()
      });

      return true;
    } catch (err) {
      console.error('Error claiming bounty:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { claimBounty, loading };
};

// ==================== SUBMISSIONS ====================

export const useSubmissions = (bountyId = null, hunterId = null) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = collection(db, 'submissions');
    const constraints = [];

    if (bountyId) {
      constraints.push(where('bountyId', '==', bountyId));
    }
    if (hunterId) {
      constraints.push(where('hunterId', '==', hunterId));
    }
    
    constraints.push(orderBy('submittedAt', 'desc'));
    q = query(q, ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const submissionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.() || new Date()
      }));
      setSubmissions(submissionsData);
      setLoading(false);
    });

    return unsubscribe;
  }, [bountyId, hunterId]);

  return { submissions, loading };
};

export const useCreateSubmission = () => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const createSubmission = async (bountyId, proof, proofLink = '') => {
    if (!user) throw new Error('Must be logged in');
    
    setLoading(true);

    try {
      const submission = {
        bountyId,
        hunterId: user.uid,
        hunterName: userProfile?.displayName || user.email,
        proof,
        proofLink,
        status: 'pending',
        submittedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'submissions'), submission);

      // Update bounty's pending count
      await updateDoc(doc(db, 'bounties', bountyId), {
        pendingReview: increment(1),
        completed: increment(1)
      });

      return true;
    } catch (err) {
      console.error('Error creating submission:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createSubmission, loading };
};

export const useApproveSubmission = () => {
  const [loading, setLoading] = useState(false);

  const approveSubmission = async (submissionId, bountyId, pricePerUnit) => {
    setLoading(true);

    try {
      // Get submission to find hunter
      const submissionRef = doc(db, 'submissions', submissionId);
      const submissionSnap = await getDoc(submissionRef);
      const submission = submissionSnap.data();

      // Update submission status
      await updateDoc(submissionRef, {
        status: 'approved',
        approvedAt: serverTimestamp()
      });

      // Update bounty counts
      await updateDoc(doc(db, 'bounties', bountyId), {
        approved: increment(1),
        pendingReview: increment(-1)
      });

      // Update hunter's earnings
      await updateDoc(doc(db, 'users', submission.hunterId), {
        totalEarned: increment(pricePerUnit),
        completedBounties: increment(1)
      });

      return true;
    } catch (err) {
      console.error('Error approving submission:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const rejectSubmission = async (submissionId, bountyId) => {
    setLoading(true);

    try {
      await updateDoc(doc(db, 'submissions', submissionId), {
        status: 'rejected',
        rejectedAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'bounties', bountyId), {
        pendingReview: increment(-1),
        completed: increment(-1)
      });

      return true;
    } catch (err) {
      console.error('Error rejecting submission:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { approveSubmission, rejectSubmission, loading };
};

// ==================== CASHOUT ====================

export const useCashout = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const cashoutBounty = async (bountyId, amount, approvedCount) => {
    if (!user) throw new Error('Must be logged in');
    
    setLoading(true);

    try {
      // Create cashout record
      await addDoc(collection(db, 'cashouts'), {
        bountyId,
        posterId: user.uid,
        amount,
        approvedCount,
        platformFee: amount * 0.1,
        netAmount: amount * 0.9,
        status: 'completed',
        cashedOutAt: serverTimestamp()
      });

      // Update poster's total spent
      await updateDoc(doc(db, 'users', user.uid), {
        totalSpent: increment(amount)
      });

      // Reset approved count on bounty (they've been paid out)
      await updateDoc(doc(db, 'bounties', bountyId), {
        approved: 0,
        lastCashout: serverTimestamp()
      });

      return true;
    } catch (err) {
      console.error('Error cashing out:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { cashoutBounty, loading };
};

// ==================== USER STATS ====================

export const useUserStats = (userId) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
        setStats({ id: doc.id, ...doc.data() });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return { stats, loading };
};

// ==================== HUNTER'S ACTIVE BOUNTIES ====================

export const useMyActiveBounties = () => {
  const { user } = useAuth();
  const [activeBounties, setActiveBounties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Get bounties where user is a hunter
    const q = query(
      collection(db, 'bounties'),
      where('hunters', 'array-contains', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const bountiesWithSubmissions = await Promise.all(
        snapshot.docs.map(async (bountyDoc) => {
          const bounty = { id: bountyDoc.id, ...bountyDoc.data() };
          
          // Get user's submissions for this bounty
          const submissionsQuery = query(
            collection(db, 'submissions'),
            where('bountyId', '==', bountyDoc.id),
            where('hunterId', '==', user.uid)
          );
          const submissionsSnap = await getDocs(submissionsQuery);
          const submissions = submissionsSnap.docs.map(d => d.data());
          
          return {
            ...bounty,
            mySubmissions: submissions.length,
            myApproved: submissions.filter(s => s.status === 'approved').length,
            myPending: submissions.filter(s => s.status === 'pending').length,
            myEarned: submissions.filter(s => s.status === 'approved').length * bounty.pricePerUnit
          };
        })
      );
      
      setActiveBounties(bountiesWithSubmissions);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { activeBounties, loading };
};
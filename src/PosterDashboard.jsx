import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { 
  useBounties, 
  useCreateBounty, 
  useSubmissions,
  useApproveSubmission,
  useCashout,
  useUserStats 
} from './useFirestore';

const categories = ['Sales', 'Lead Gen', 'Content', 'Research', 'Data', 'Design', 'Automation'];

export default function PosterDashboard() {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useAuth();
  const { stats } = useUserStats(user?.uid);
  
  const [activeTab, setActiveTab] = useState('bounties');
  const [selectedBounty, setSelectedBounty] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [cashoutBounty, setCashoutBounty] = useState(null);
  
  // Firebase hooks
  const { bounties, loading: bountiesLoading } = useBounties({ posterId: user?.uid });
  const { createBounty, loading: creating } = useCreateBounty();
  const { submissions: allSubmissions } = useSubmissions();
  const { approveSubmission, rejectSubmission, loading: approving } = useApproveSubmission();
  const { cashoutBounty: doCashout, loading: cashingOut } = useCashout();

  // Get pending submissions for poster's bounties
  const pendingSubmissions = allSubmissions.filter(s => 
    s.status === 'pending' && 
    bounties.some(b => b.id === s.bountyId)
  );

  // Create bounty form state
  const [newBounty, setNewBounty] = useState({
    title: '',
    description: '',
    category: 'Sales',
    pricePerUnit: '',
    total: '',
    deadline: '',
    requirements: ['']
  });

  const totalSpent = stats?.totalSpent || 0;
  const activeBudget = bounties
    .filter(b => b.status === 'active')
    .reduce((sum, b) => sum + (b.totalBudget || 0), 0);

  const handleCreateBounty = async () => {
    try {
      await createBounty({
        ...newBounty,
        pricePerUnit: Number(newBounty.pricePerUnit),
        total: Number(newBounty.total),
        totalBudget: Number(newBounty.pricePerUnit) * Number(newBounty.total),
        requirements: newBounty.requirements.filter(r => r.trim())
      });
      setShowCreateModal(false);
      setNewBounty({
        title: '',
        description: '',
        category: 'Sales',
        pricePerUnit: '',
        total: '',
        deadline: '',
        requirements: ['']
      });
    } catch (err) {
      alert('Error creating bounty: ' + err.message);
    }
  };

  const handleCashout = (bounty) => {
    setCashoutBounty(bounty);
    setShowCashoutModal(true);
  };

  const confirmCashout = async () => {
    try {
      const amount = cashoutBounty.approved * cashoutBounty.pricePerUnit;
      await doCashout(cashoutBounty.id, amount, cashoutBounty.approved);
      setShowCashoutModal(false);
      setCashoutBounty(null);
      alert('Cashout successful!');
    } catch (err) {
      alert('Error cashing out: ' + err.message);
    }
  };

  const handleApprove = async (submission) => {
    const bounty = bounties.find(b => b.id === submission.bountyId);
    if (!bounty) return;
    
    try {
      await approveSubmission(submission.id, submission.bountyId, bounty.pricePerUnit);
    } catch (err) {
      alert('Error approving: ' + err.message);
    }
  };

  const handleReject = async (submission) => {
    try {
      await rejectSubmission(submission.id, submission.bountyId);
    } catch (err) {
      alert('Error rejecting: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const addRequirement = () => {
    setNewBounty(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  const updateRequirement = (index, value) => {
    setNewBounty(prev => ({
      ...prev,
      requirements: prev.requirements.map((req, i) => i === index ? value : req)
    }));
  };

  const removeRequirement = (index) => {
    setNewBounty(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 p-6 flex flex-col fixed h-full">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold">Bounty</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab('bounties')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'bounties' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            My Bounties
            {bounties.filter(b => b.status === 'active').length > 0 && (
              <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                {bounties.filter(b => b.status === 'active').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'approvals' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Approvals
            {pendingSubmissions.length > 0 && (
              <span className="ml-auto bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                {pendingSubmissions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('spending')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'spending' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Spending
          </button>

          <div className="pt-4 border-t border-zinc-800 mt-4">
            <button
              onClick={() => navigate('/hunt')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Switch to Hunter
            </button>
          </div>
        </nav>

        {/* User profile */}
        <div className="border-t border-zinc-800 pt-6 mt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center font-semibold text-black">
              {userProfile?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{userProfile?.displayName || user?.email}</p>
              <p className="text-xs text-zinc-500">Poster</p>
            </div>
            <button onClick={handleLogout} className="text-zinc-500 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        {/* Top stats bar */}
        <div className="border-b border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-semibold rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Bounty
            </button>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-500 text-sm">Total Spent</span>
              </div>
              <p className="text-3xl font-bold">${totalSpent.toLocaleString()}</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-500 text-sm">Active Budget</span>
              </div>
              <p className="text-3xl font-bold text-amber-400">${activeBudget.toLocaleString()}</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-500 text-sm">Active Bounties</span>
              </div>
              <p className="text-3xl font-bold text-emerald-400">{bounties.filter(b => b.status === 'active').length}</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-500 text-sm">Pending Review</span>
              </div>
              <p className="text-3xl font-bold text-red-400">{pendingSubmissions.length}</p>
            </div>
          </div>
        </div>

        {/* My Bounties tab */}
        {activeTab === 'bounties' && (
          <div className="p-6">
            {bountiesLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : bounties.length === 0 ? (
              <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No bounties yet</h3>
                <p className="text-zinc-500 mb-6">Create your first bounty to get work done!</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
                >
                  Create bounty
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {bounties.map(bounty => (
                  <div key={bounty.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2.5 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-400">{bounty.category}</span>
                          <span className={`px-2.5 py-1 rounded-lg text-xs ${
                            bounty.status === 'active' 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-zinc-700 text-zinc-400'
                          }`}>
                            {bounty.status === 'active' ? 'Active' : 'Completed'}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold mb-1">{bounty.title}</h3>
                        <p className="text-zinc-500 text-sm">{bounty.description}</p>
                      </div>
                      <div className="text-right ml-6">
                        <p className="text-sm text-zinc-500">Budget</p>
                        <p className="text-2xl font-bold">${bounty.totalBudget?.toLocaleString()}</p>
                        <p className="text-xs text-zinc-500">${bounty.pricePerUnit} per unit</p>
                      </div>
                    </div>

                    {/* Progress section */}
                    <div className="grid grid-cols-4 gap-4 mb-4 pt-4 border-t border-zinc-800">
                      <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                        <p className="text-2xl font-bold">{bounty.completed || 0}</p>
                        <p className="text-xs text-zinc-500">Completed</p>
                      </div>
                      <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                        <p className="text-2xl font-bold text-emerald-400">{bounty.approved || 0}</p>
                        <p className="text-xs text-zinc-500">Approved</p>
                      </div>
                      <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                        <p className="text-2xl font-bold text-amber-400">{bounty.pendingReview || 0}</p>
                        <p className="text-xs text-zinc-500">Pending</p>
                      </div>
                      <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                        <p className="text-2xl font-bold">{bounty.total - (bounty.completed || 0)}</p>
                        <p className="text-xs text-zinc-500">Remaining</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                          style={{ width: `${((bounty.approved || 0) / bounty.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-zinc-400">{Math.round(((bounty.approved || 0) / bounty.total) * 100)}%</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setSelectedBounty(bounty)}
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                      >
                        View details
                      </button>
                      {bounty.status === 'active' && (bounty.approved || 0) > 0 && (
                        <button 
                          onClick={() => handleCashout(bounty)}
                          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Cash out ${(bounty.approved || 0) * bounty.pricePerUnit}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Approvals tab */}
        {activeTab === 'approvals' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Pending Approvals</h2>
            
            {pendingSubmissions.length === 0 ? (
              <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-zinc-500">No pending submissions to review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSubmissions.map(submission => {
                  const bounty = bounties.find(b => b.id === submission.bountyId);
                  if (!bounty) return null;
                  
                  return (
                    <div key={submission.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">{bounty.title}</p>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center font-semibold">
                              {submission.hunterName?.[0]?.toUpperCase() || 'H'}
                            </div>
                            <div>
                              <p className="font-medium">{submission.hunterName}</p>
                              <p className="text-xs text-zinc-500">
                                {submission.submittedAt?.toLocaleDateString?.() || 'Just now'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-amber-400">${bounty.pricePerUnit}</p>
                          <p className="text-xs text-zinc-500">payout</p>
                        </div>
                      </div>

                      <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
                        <p className="text-sm text-zinc-300 mb-2">{submission.proof}</p>
                        {submission.proofLink && (
                          <a href={submission.proofLink} target="_blank" rel="noopener noreferrer" className="text-amber-400 text-sm hover:underline flex items-center gap-1">
                            View proof
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleApprove(submission)}
                          disabled={approving}
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(submission)}
                          disabled={approving}
                          className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Spending tab */}
        {activeTab === 'spending' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Spending Overview</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-zinc-500 text-sm mb-2">Total budget allocated</h3>
                <p className="text-4xl font-bold mb-4">${(totalSpent + activeBudget).toLocaleString()}</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-zinc-500 text-sm mb-2">Total spent</h3>
                <p className="text-4xl font-bold text-emerald-400 mb-4">${totalSpent.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Bounty Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setShowCreateModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Create new bounty</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Bounty title *</label>
                <input
                  type="text"
                  value={newBounty.title}
                  onChange={(e) => setNewBounty(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Book 10 qualified sales meetings"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Description *</label>
                <textarea
                  value={newBounty.description}
                  onChange={(e) => setNewBounty(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what you need in detail..."
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Category</label>
                  <select
                    value={newBounty.category}
                    onChange={(e) => setNewBounty(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Deadline</label>
                  <input
                    type="date"
                    value={newBounty.deadline}
                    onChange={(e) => setNewBounty(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Price per completion ($) *</label>
                  <input
                    type="number"
                    value={newBounty.pricePerUnit}
                    onChange={(e) => setNewBounty(prev => ({ ...prev, pricePerUnit: e.target.value }))}
                    placeholder="500"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Number of completions *</label>
                  <input
                    type="number"
                    value={newBounty.total}
                    onChange={(e) => setNewBounty(prev => ({ ...prev, total: e.target.value }))}
                    placeholder="10"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>

              {newBounty.pricePerUnit && newBounty.total && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400">Total budget</span>
                    <span className="text-2xl font-bold text-amber-400">
                      ${(Number(newBounty.pricePerUnit) * Number(newBounty.total)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Requirements for approval</label>
                <div className="space-y-2">
                  {newBounty.requirements.map((req, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={req}
                        onChange={(e) => updateRequirement(i, e.target.value)}
                        placeholder="e.g., Calendar invite must be sent"
                        className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                      {newBounty.requirements.length > 1 && (
                        <button
                          onClick={() => removeRequirement(i)}
                          className="px-3 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addRequirement}
                    className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add requirement
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  onClick={handleCreateBounty}
                  disabled={creating || !newBounty.title || !newBounty.description || !newBounty.pricePerUnit || !newBounty.total}
                  className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create bounty'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cashout Modal */}
      {showCashoutModal && cashoutBounty && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setShowCashoutModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-2xl font-bold">Cash out bounty</h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-zinc-400 mb-2">You're about to cash out</p>
                <p className="text-4xl font-bold text-emerald-400 mb-2">
                  ${((cashoutBounty.approved || 0) * cashoutBounty.pricePerUnit).toLocaleString()}
                </p>
                <p className="text-sm text-zinc-500">
                  for {cashoutBounty.approved || 0} approved completions
                </p>
              </div>

              <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Price per unit</span>
                  <span>${cashoutBounty.pricePerUnit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Approved units</span>
                  <span>{cashoutBounty.approved || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Platform fee (10%)</span>
                  <span className="text-red-400">-${Math.round((cashoutBounty.approved || 0) * cashoutBounty.pricePerUnit * 0.1)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmCashout}
                  disabled={cashingOut}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  {cashingOut ? 'Processing...' : 'Confirm cashout'}
                </button>
                <button
                  onClick={() => setShowCashoutModal(false)}
                  className="px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

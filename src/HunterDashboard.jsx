import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { 
  useBounties, 
  useClaimBounty, 
  useMyActiveBounties, 
  useUserStats,
  useCreateSubmission 
} from './useFirestore';

const categories = ['All', 'Sales', 'Lead Gen', 'Content', 'Research', 'Data', 'Design', 'Automation'];

export default function HunterDashboard() {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useAuth();
  const { stats } = useUserStats(user?.uid);
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedBounty, setSelectedBounty] = useState(null);
  const [activeTab, setActiveTab] = useState('browse');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitBounty, setSubmitBounty] = useState(null);
  const [proof, setProof] = useState('');
  const [proofLink, setProofLink] = useState('');

  // Firebase hooks
  const { bounties, loading: bountiesLoading } = useBounties({ 
    status: 'active',
    category: selectedCategory !== 'All' ? selectedCategory : undefined
  });
  const { activeBounties, loading: activeLoading } = useMyActiveBounties();
  const { claimBounty, loading: claiming } = useClaimBounty();
  const { createSubmission, loading: submitting } = useCreateSubmission();

  const filteredBounties = bounties
    .filter(b => b.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(b => !b.hunters?.includes(user?.uid)) // Don't show already claimed
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'payout-high') return b.pricePerUnit - a.pricePerUnit;
      if (sortBy === 'payout-low') return a.pricePerUnit - b.pricePerUnit;
      if (sortBy === 'deadline') return new Date(a.deadline) - new Date(b.deadline);
      return 0;
    });

  const handleClaim = async (bountyId) => {
    try {
      await claimBounty(bountyId);
      setSelectedBounty(null);
      setActiveTab('active');
    } catch (err) {
      alert('Error claiming bounty: ' + err.message);
    }
  };

  const handleSubmit = async () => {
    if (!proof.trim()) {
      alert('Please provide proof of completion');
      return;
    }
    try {
      await createSubmission(submitBounty.id, proof, proofLink);
      setShowSubmitModal(false);
      setSubmitBounty(null);
      setProof('');
      setProofLink('');
      alert('Submission sent for review!');
    } catch (err) {
      alert('Error submitting: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const totalEarned = stats?.totalEarned || 0;
  const completedBounties = stats?.completedBounties || 0;
  const pendingPayout = activeBounties.reduce((sum, b) => sum + (b.myPending * b.pricePerUnit), 0);

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
            onClick={() => setActiveTab('browse')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'browse' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Browse Bounties
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'active' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            My Bounties
            {activeBounties.length > 0 && (
              <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                {activeBounties.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('earnings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'earnings' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Earnings
          </button>

          <div className="pt-4 border-t border-zinc-800 mt-4">
            <button
              onClick={() => navigate('/post')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Switch to Poster
            </button>
          </div>
        </nav>

        {/* User profile */}
        <div className="border-t border-zinc-800 pt-6 mt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center font-semibold">
              {userProfile?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{userProfile?.displayName || user?.email}</p>
              <p className="text-xs text-zinc-500">Hunter</p>
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
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-500 text-sm">Total Earned</span>
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-emerald-400">${totalEarned.toLocaleString()}</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-500 text-sm">Pending Payout</span>
                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-amber-400">${pendingPayout.toLocaleString()}</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-500 text-sm">Completed</span>
                <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold">{completedBounties}</p>
            </div>
          </div>
        </div>

        {/* Browse bounties tab */}
        {activeTab === 'browse' && (
          <div className="p-6">
            {/* Search and filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <svg className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search bounties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="payout-high">Highest payout</option>
                <option value="payout-low">Lowest payout</option>
                <option value="deadline">Deadline soon</option>
              </select>
            </div>

            {/* Category pills */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Bounty grid */}
            {bountiesLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredBounties.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <p className="text-zinc-500">No bounties found. Check back soon!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredBounties.map(bounty => (
                  <div
                    key={bounty.id}
                    onClick={() => setSelectedBounty(bounty)}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2.5 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-400">{bounty.category}</span>
                        </div>
                        <h3 className="text-lg font-semibold group-hover:text-amber-400 transition-colors">{bounty.title}</h3>
                        <p className="text-zinc-500 text-sm mt-2 line-clamp-2">{bounty.description}</p>
                      </div>
                      <div className="text-right ml-6">
                        <p className="text-2xl font-bold text-amber-400">${bounty.pricePerUnit}</p>
                        <p className="text-xs text-zinc-500">per completion</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm text-zinc-500">{bounty.hunterCount || 0} hunters</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-500">{bounty.completed || 0}/{bounty.total} complete</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                            style={{ width: `${((bounty.completed || 0) / bounty.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500">{Math.round(((bounty.completed || 0) / bounty.total) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My bounties tab */}
        {activeTab === 'active' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">My Active Bounties</h2>
            
            {activeLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : activeBounties.length === 0 ? (
              <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No active bounties</h3>
                <p className="text-zinc-500 mb-6">Browse bounties and claim one to get started!</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
                >
                  Browse bounties
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeBounties.map(bounty => (
                  <div key={bounty.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold mb-2">{bounty.title}</h3>
                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs">
                          In Progress
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-400">${bounty.myEarned || 0}</p>
                        <p className="text-xs text-zinc-500">earned so far</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                      <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                        <p className="text-2xl font-bold">{bounty.mySubmissions || 0}</p>
                        <p className="text-xs text-zinc-500">Submitted</p>
                      </div>
                      <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                        <p className="text-2xl font-bold text-emerald-400">{bounty.myApproved || 0}</p>
                        <p className="text-xs text-zinc-500">Approved</p>
                      </div>
                      <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                        <p className="text-2xl font-bold text-amber-400">{bounty.myPending || 0}</p>
                        <p className="text-xs text-zinc-500">Pending</p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => {
                          setSubmitBounty(bounty);
                          setShowSubmitModal(true);
                        }}
                        className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
                      >
                        Submit work
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Earnings tab */}
        {activeTab === 'earnings' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Earnings</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-zinc-500 text-sm mb-2">Available to withdraw</h3>
                <p className="text-4xl font-bold text-emerald-400 mb-4">${totalEarned.toLocaleString()}</p>
                <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-colors">
                  Withdraw funds
                </button>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-zinc-500 text-sm mb-2">Pending review</h3>
                <p className="text-4xl font-bold text-amber-400 mb-4">${pendingPayout.toLocaleString()}</p>
                <p className="text-sm text-zinc-500">Waiting for poster approval</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bounty detail modal */}
      {selectedBounty && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setSelectedBounty(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2.5 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-400">{selectedBounty.category}</span>
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs">Active</span>
                  </div>
                  <h2 className="text-2xl font-bold">{selectedBounty.title}</h2>
                </div>
                <button onClick={() => setSelectedBounty(null)} className="text-zinc-500 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div>
                  <p className="text-amber-400 text-sm">Payout per completion</p>
                  <p className="text-3xl font-bold text-amber-400">${selectedBounty.pricePerUnit}</p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-400 text-sm">Total budget</p>
                  <p className="text-xl font-semibold">${selectedBounty.totalBudget?.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-zinc-400">{selectedBounty.description}</p>
              </div>

              {selectedBounty.requirements?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Requirements</h3>
                  <ul className="space-y-2">
                    {selectedBounty.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-zinc-300">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                  <p className="text-2xl font-bold">{selectedBounty.hunterCount || 0}</p>
                  <p className="text-xs text-zinc-500">Hunters</p>
                </div>
                <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                  <p className="text-2xl font-bold">{selectedBounty.total - (selectedBounty.completed || 0)}</p>
                  <p className="text-xs text-zinc-500">Remaining</p>
                </div>
                <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                  <p className="text-2xl font-bold">{selectedBounty.total}</p>
                  <p className="text-xs text-zinc-500">Total</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button 
                  onClick={() => handleClaim(selectedBounty.id)}
                  disabled={claiming}
                  className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  {claiming ? 'Claiming...' : 'Claim bounty'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit work modal */}
      {showSubmitModal && submitBounty && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setShowSubmitModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold">Submit work</h2>
              <p className="text-sm text-zinc-500">{submitBounty.title}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Proof of completion *</label>
                <textarea
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  placeholder="Describe what you completed and provide evidence..."
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Link (optional)</label>
                <input
                  type="url"
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !proof.trim()}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit for review'}
                </button>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
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
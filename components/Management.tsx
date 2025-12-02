
import React, { useState, useEffect } from 'react';
import { User, UserRole, Transaction, AccessLog, AttendanceRecord, ClassSettings, ExcuseRequest, AttendanceComplaint, Feedback, AlbumImage, Achievement, Campaign, RegistrationApplication, ApplicationStatus } from '../types';
import { getUsers, updateUser, getTransactions, addTransaction, getLogs, logAccess, getAttendance, saveAttendance, getSettings, updateSettings, getExcuseRequests, addExcuseRequest, updateExcuseStatus, getComplaints, fileComplaint, resolveComplaint, getAttendanceByStudent, updateAttendanceRecord, getFeedbacks, getAlbum, saveAlbum, getAchievements, saveAchievements, getCampaigns, saveCampaign, deleteTransaction, getApplications, updateApplicationStatus, deleteApplication } from '../services/dataService';
import { PERMISSIONS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Shield, UserX, UserCheck, DollarSign, QrCode, Settings, Save, Search, Camera, FileText, CheckCircle, XCircle, AlertTriangle, Filter, Edit3, Plus, Trash2, ArrowRight, RefreshCcw, LayoutGrid, List, Clock, Eye, UserPlus, ChevronDown, ChevronUp, Phone, Mail, MapPin, School, Heart, Globe } from 'lucide-react';
import { useToast } from './ui/Toast';
import { Modal } from './ui/Modal';
import { FileUploader } from './ui/FileUploader';
import { CustomSelect } from './ui/CustomSelect';

// ==================== APPLICATION MANAGEMENT (Admin Only) ====================

export const ApplicationManagement: React.FC<{ user: User }> = ({ user }) => {
    const { showToast } = useToast();
    const [applications, setApplications] = useState<RegistrationApplication[]>([]);
    const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'all'>('all');
    const [selectedApp, setSelectedApp] = useState<RegistrationApplication | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [reviewNotes, setReviewNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        loadApplications();
    }, []);

    const loadApplications = () => {
        setApplications(getApplications());
    };

    const filteredApplications = filterStatus === 'all' 
        ? applications 
        : applications.filter(app => app.status === filterStatus);

    const getStatusBadge = (status: ApplicationStatus) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
            verifying: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        };
        const icons = {
            pending: <Clock size={12} />,
            verifying: <Eye size={12} />,
            approved: <CheckCircle size={12} />,
            rejected: <XCircle size={12} />
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase ${styles[status]}`}>
                {icons[status]} {status}
            </span>
        );
    };

    const handleViewDetails = (app: RegistrationApplication) => {
        setSelectedApp(app);
        setReviewNotes(app.reviewNotes || '');
        setRejectionReason(app.rejectionReason || '');
        setShowDetailModal(true);
    };

    const handleUpdateStatus = async (newStatus: ApplicationStatus) => {
        if (!selectedApp) return;
        
        if (newStatus === 'rejected' && !rejectionReason.trim()) {
            showToast('Please provide a rejection reason', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            const updated = updateApplicationStatus(
                selectedApp.id,
                newStatus,
                user.id,
                reviewNotes,
                newStatus === 'rejected' ? rejectionReason : undefined
            );

            if (updated) {
                showToast(
                    newStatus === 'approved' 
                        ? `Application approved! Account created for ${selectedApp.fullName}` 
                        : `Application ${newStatus}`,
                    newStatus === 'approved' ? 'success' : 'info'
                );
                logAccess(user.id, 'APPLICATION_MGMT', `Changed application ${selectedApp.id} status to ${newStatus}`);
                loadApplications();
                setShowDetailModal(false);
            }
        } catch (error) {
            showToast('Failed to update application status', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = (appId: string) => {
        if (!confirm('Are you sure you want to delete this application?')) return;
        
        if (deleteApplication(appId)) {
            showToast('Application deleted', 'info');
            logAccess(user.id, 'APPLICATION_MGMT', `Deleted application ${appId}`);
            loadApplications();
        }
    };

    const statusCounts = {
        all: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        verifying: applications.filter(a => a.status === 'verifying').length,
        approved: applications.filter(a => a.status === 'approved').length,
        rejected: applications.filter(a => a.status === 'rejected').length
    };

    // Only Admin can access this
    if (user.role !== UserRole.ADMIN) {
        return (
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-8 text-center">
                <Shield size={48} className="mx-auto text-red-400 mb-4" />
                <h3 className="text-lg font-bold text-stone-800 dark:text-white mb-2">Access Denied</h3>
                <p className="text-stone-500 dark:text-stone-400">Only administrators can manage applications.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="p-6 border-b border-stone-200 dark:border-stone-800">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                                <UserPlus size={24} className="text-amber-600" />
                                Registration Applications
                            </h2>
                            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                                Review and approve student registration requests
                            </p>
                        </div>
                        <button 
                            onClick={loadApplications}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-100 dark:bg-stone-800 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-sm font-medium"
                        >
                            <RefreshCcw size={16} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Status Tabs */}
                <div className="flex flex-wrap gap-2 p-4 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
                    {(['all', 'pending', 'verifying', 'approved', 'rejected'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                filterStatus === status
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-stone-600'
                            }`}
                        >
                            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                                filterStatus === status 
                                    ? 'bg-white/20' 
                                    : 'bg-stone-100 dark:bg-stone-600'
                            }`}>
                                {statusCounts[status]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Applications List */}
                <div className="overflow-x-auto">
                    {filteredApplications.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText size={48} className="mx-auto text-stone-300 dark:text-stone-600 mb-4" />
                            <p className="text-stone-500 dark:text-stone-400">No applications found</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-stone-600 dark:text-stone-300">
                            <thead className="bg-stone-50 dark:bg-stone-800 text-xs uppercase font-semibold text-stone-500">
                                <tr>
                                    <th className="p-4">Applicant</th>
                                    <th className="p-4">Student ID</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Section</th>
                                    <th className="p-4">Submitted</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                                {filteredApplications.map(app => (
                                    <tr key={app.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                                        <td className="p-4 font-medium text-stone-900 dark:text-white">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden flex items-center justify-center">
                                                    {app.avatar ? (
                                                        <img src={app.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-sm font-bold text-stone-500">{app.fullName.substring(0,2).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{app.fullName}</p>
                                                    <p className="text-xs text-stone-500">@{app.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-xs">{app.studentId}</td>
                                        <td className="p-4 text-xs">{app.universityEmail}</td>
                                        <td className="p-4 font-bold text-amber-600">{app.section}</td>
                                        <td className="p-4 text-xs text-stone-500">
                                            {new Date(app.submittedAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">{getStatusBadge(app.status)}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewDetails(app)}
                                                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {app.status !== 'approved' && (
                                                    <button
                                                        onClick={() => handleDelete(app.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedApp && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between bg-gradient-to-r from-amber-600 to-orange-600">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-white overflow-hidden border-4 border-white/30">
                                    {selectedApp.avatar ? (
                                        <img src={selectedApp.avatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-stone-200 flex items-center justify-center text-xl font-bold text-stone-500">
                                            {selectedApp.fullName.substring(0,2).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="text-white">
                                    <h3 className="text-xl font-bold">{selectedApp.fullName}</h3>
                                    <p className="text-white/80 text-sm">@{selectedApp.username} • {selectedApp.studentId}</p>
                                </div>
                            </div>
                            {getStatusBadge(selectedApp.status)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Contact Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-stone-50 dark:bg-stone-900 rounded-xl p-4">
                                    <h4 className="text-xs font-bold text-stone-500 uppercase mb-3 flex items-center gap-2">
                                        <Mail size={14} /> Contact Information
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="text-stone-500">University Email:</span> <span className="font-medium">{selectedApp.universityEmail}</span></p>
                                        {selectedApp.personalEmail && <p><span className="text-stone-500">Personal Email:</span> <span className="font-medium">{selectedApp.personalEmail}</span></p>}
                                        <p><span className="text-stone-500">Contact:</span> <span className="font-medium">{selectedApp.contactNumber}</span></p>
                                    </div>
                                </div>
                                
                                <div className="bg-stone-50 dark:bg-stone-900 rounded-xl p-4">
                                    <h4 className="text-xs font-bold text-stone-500 uppercase mb-3 flex items-center gap-2">
                                        <MapPin size={14} /> Location
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="text-stone-500">Province:</span> <span className="font-medium">{selectedApp.province}</span></p>
                                        <p><span className="text-stone-500">City:</span> <span className="font-medium">{selectedApp.city}</span></p>
                                        <p><span className="text-stone-500">Barangay:</span> <span className="font-medium">{selectedApp.barangay}</span></p>
                                        {selectedApp.purokHouseNumber && <p><span className="text-stone-500">Purok/House:</span> <span className="font-medium">{selectedApp.purokHouseNumber}</span></p>}
                                    </div>
                                </div>
                            </div>

                            {/* School Info */}
                            <div className="bg-stone-50 dark:bg-stone-900 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-stone-500 uppercase mb-3 flex items-center gap-2">
                                    <School size={14} /> School Information
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    <p><span className="text-stone-500">School:</span> <span className="font-medium">{selectedApp.school}</span></p>
                                    <p><span className="text-stone-500">College:</span> <span className="font-medium">{selectedApp.college}</span></p>
                                    <p><span className="text-stone-500">Program:</span> <span className="font-medium">{selectedApp.program}</span></p>
                                    {selectedApp.major && <p><span className="text-stone-500">Major:</span> <span className="font-medium">{selectedApp.major}</span></p>}
                                    <p><span className="text-stone-500">Year Level:</span> <span className="font-medium">{selectedApp.yearLevel}</span></p>
                                    <p><span className="text-stone-500">Section:</span> <span className="font-bold text-amber-600">{selectedApp.section}</span></p>
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-3 flex items-center gap-2">
                                    <Heart size={14} /> Emergency Contact
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <p><span className="text-stone-500">Contact Person:</span> <span className="font-medium">{selectedApp.emergencyPerson}</span></p>
                                    <p><span className="text-stone-500">Contact Number:</span> <span className="font-medium">{selectedApp.emergencyContact}</span></p>
                                </div>
                            </div>

                            {/* Social Links */}
                            {selectedApp.socialLinks && selectedApp.socialLinks.length > 0 && (
                                <div className="bg-stone-50 dark:bg-stone-900 rounded-xl p-4">
                                    <h4 className="text-xs font-bold text-stone-500 uppercase mb-3 flex items-center gap-2">
                                        <Globe size={14} /> Social Links
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedApp.socialLinks.map(link => (
                                            <a 
                                                key={link.id} 
                                                href={link.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 bg-white dark:bg-stone-800 rounded-full text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            >
                                                {link.platform}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Review Section */}
                            {selectedApp.status !== 'approved' && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                                    <h4 className="text-xs font-bold text-amber-600 uppercase mb-3">Admin Review</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Review Notes (Optional)</label>
                                            <textarea
                                                value={reviewNotes}
                                                onChange={e => setReviewNotes(e.target.value)}
                                                placeholder="Add any notes about this application..."
                                                className="w-full p-3 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-sm"
                                                rows={2}
                                            />
                                        </div>
                                        
                                        {selectedApp.status !== 'rejected' && (
                                            <div>
                                                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Rejection Reason (Required if rejecting)</label>
                                                <textarea
                                                    value={rejectionReason}
                                                    onChange={e => setRejectionReason(e.target.value)}
                                                    placeholder="Provide a reason if rejecting this application..."
                                                    className="w-full p-3 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-sm"
                                                    rows={2}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Previous Review Info */}
                            {selectedApp.reviewedAt && (
                                <div className="bg-stone-100 dark:bg-stone-900 rounded-xl p-4 text-sm">
                                    <p className="text-stone-500">
                                        Reviewed on {new Date(selectedApp.reviewedAt).toLocaleString()} by {selectedApp.reviewedBy}
                                    </p>
                                    {selectedApp.reviewNotes && <p className="mt-2 text-stone-700 dark:text-stone-300">Notes: {selectedApp.reviewNotes}</p>}
                                    {selectedApp.rejectionReason && <p className="mt-2 text-red-600">Rejection Reason: {selectedApp.rejectionReason}</p>}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
                            <div className="flex flex-wrap gap-3 justify-end">
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="px-4 py-2 bg-stone-200 dark:bg-stone-700 rounded-lg font-medium hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
                                >
                                    Close
                                </button>
                                
                                {selectedApp.status === 'pending' && (
                                    <button
                                        onClick={() => handleUpdateStatus('verifying')}
                                        disabled={isProcessing}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        <Eye size={16} /> Mark as Verifying
                                    </button>
                                )}
                                
                                {selectedApp.status !== 'approved' && selectedApp.status !== 'rejected' && (
                                    <>
                                        <button
                                            onClick={() => handleUpdateStatus('rejected')}
                                            disabled={isProcessing}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                                        >
                                            <XCircle size={16} /> Reject
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus('approved')}
                                            disabled={isProcessing}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                                        >
                                            <CheckCircle size={16} /> Approve & Create Account
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Member Management ---

export const MemberManagement: React.FC<{ user: User }> = ({ user }) => {
    const { showToast } = useToast();
    const [members, setMembers] = useState<User[]>([]);
    const [selectedMember, setSelectedMember] = useState<User | null>(null);
    const [showMemberDetail, setShowMemberDetail] = useState(false);

    useEffect(() => {
        loadMembers();
    }, []);

    const loadMembers = () => {
        let allMembers = getUsers();
        
        // Mayor can only see members within their section
        if (user.role === UserRole.MAYOR) {
            const userSection = user.section || '1SF';
            allMembers = allMembers.filter(m => m.section === userSection || !m.section);
        }
        
        setMembers(allMembers);
    };

    const toggleStatus = (targetUser: User) => {
        if (!PERMISSIONS.CAN_MANAGE_USERS.includes(user.role)) return;
        const newStatus: 'active' | 'suspended' = targetUser.status === 'active' ? 'suspended' : 'active';
        const updated: User = { ...targetUser, status: newStatus };
        updateUser(updated);
        logAccess(user.id, 'USER_MGMT', `Changed status of ${targetUser.username} to ${newStatus}`);
        loadMembers();
        showToast(`User ${targetUser.username} is now ${newStatus}`, 'info');
    };

    const changeRole = (targetUser: User, newRole: UserRole) => {
        if (!PERMISSIONS.CAN_MANAGE_USERS.includes(user.role)) return;
        const updated: User = { ...targetUser, role: newRole };
        updateUser(updated);
        logAccess(user.id, 'USER_MGMT', `Changed role of ${targetUser.username} to ${newRole}`);
        loadMembers();
        showToast(`Role updated for ${targetUser.username}`, 'success');
    };
    
    const canEdit = PERMISSIONS.CAN_MANAGE_USERS.includes(user.role);
    const isAdmin = user.role === UserRole.ADMIN;

    // View member details - Admin only for full info
    const handleViewMember = (member: User) => {
        setSelectedMember(member);
        setShowMemberDetail(true);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-stone-800 dark:text-white">Member Management</h2>
                        {user.role === UserRole.MAYOR && (
                            <p className="text-sm text-stone-500 mt-1">Showing members in section: <span className="font-bold text-amber-600">{user.section || '1SF'}</span></p>
                        )}
                    </div>
                    <button 
                        onClick={loadMembers}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-100 dark:bg-stone-800 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-sm font-medium"
                    >
                        <RefreshCcw size={16} /> Refresh
                    </button>
                </div>
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left text-sm text-stone-600 dark:text-stone-300">
                        <thead className="bg-stone-50 dark:bg-stone-800 text-xs uppercase font-semibold text-stone-500">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">ID Code</th>
                                <th className="p-4">Email</th>
                                {isAdmin && <th className="p-4">Section</th>}
                                <th className="p-4 w-48">Role</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {members.map(m => (
                                <tr key={m.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                                    <td className="p-4 font-medium text-stone-900 dark:text-white flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden flex items-center justify-center text-xs font-bold text-stone-500 dark:text-stone-300">
                                            {m.avatar ? <img src={m.avatar} alt="avatar" className="w-full h-full object-cover"/> : m.username.substring(0,2).toUpperCase()}
                                        </div>
                                        {m.fullName}
                                    </td>
                                    <td className="p-4 font-mono text-xs">{m.id}</td>
                                    <td className="p-4">{m.email}</td>
                                    {isAdmin && <td className="p-4 font-bold text-amber-600">{m.section || '-'}</td>}
                                    <td className="p-4">
                                        {canEdit ? (
                                            <CustomSelect 
                                                value={m.role} 
                                                onChange={(val) => changeRole(m, val as UserRole)}
                                                options={Object.values(UserRole).map(r => ({ value: r, label: r }))}
                                            />
                                        ) : <span className="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded text-xs">{m.role}</span>}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${m.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                            {m.status.toUpperCase()}
                                        </span>
                                    </td>
                                    {canEdit && (
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => toggleStatus(m)}
                                                className={`p-2 rounded-lg transition-colors ${m.status === 'active' ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                                                title={m.status === 'active' ? "Suspend User" : "Activate User"}
                                            >
                                                {m.status === 'active' ? <UserX size={18}/> : <UserCheck size={18}/>}
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Public Portal Management ---
export const PublicPortalManagement: React.FC<{ user: User }> = ({ user }) => {
    // ... [Logic Unchanged]
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'INBOX' | 'ALBUM' | 'HALL_OF_FAME' | 'SETTINGS'>('INBOX');
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [album, setAlbum] = useState<AlbumImage[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [settings, setSettingsState] = useState<ClassSettings>(getSettings());
    const [logoInput, setLogoInput] = useState(settings.logoUrl);
    const [imgUrl, setImgUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [achTitle, setAchTitle] = useState('');
    const [achDesc, setAchDesc] = useState('');
    const [achDate, setAchDate] = useState('');
    const [achIcon, setAchIcon] = useState('🏆');

    useEffect(() => {
        setFeedbacks(getFeedbacks());
        setAlbum(getAlbum());
        setAchievements(getAchievements());
    }, []);

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        const newSettings = { ...settings, logoUrl: logoInput };
        updateSettings(newSettings);
        setSettingsState(newSettings);
        showToast('Class settings updated!', 'success');
        window.dispatchEvent(new Event('settingsUpdated'));
    };

    const handleAddImage = (e: React.FormEvent) => {
        e.preventDefault();
        if(!imgUrl) { showToast('Please upload an image first', 'error'); return; }
        const newImg: AlbumImage = { id: Date.now().toString(), url: imgUrl, caption: caption, date: Date.now() };
        const updated = [...album, newImg];
        saveAlbum(updated);
        setAlbum(updated);
        setImgUrl(''); setCaption('');
        showToast('Image added to gallery', 'success');
    };

    const handleDeleteImage = (id: string) => {
        if(confirm('Delete this image?')) {
            const updated = album.filter(i => i.id !== id);
            saveAlbum(updated);
            setAlbum(updated);
            showToast('Image removed', 'info');
        }
    };

    const handleAddAchievement = (e: React.FormEvent) => {
        e.preventDefault();
        const newAch: Achievement = { id: Date.now().toString(), title: achTitle, description: achDesc, date: achDate, icon: achIcon };
        const updated = [...achievements, newAch];
        saveAchievements(updated);
        setAchievements(updated);
        setAchTitle(''); setAchDesc(''); setAchDate(''); setAchIcon('🏆');
        showToast('Achievement added', 'success');
    };

    const handleDeleteAchievement = (id: string) => {
        if(confirm('Delete this achievement?')) {
            const updated = achievements.filter(a => a.id !== id);
            saveAchievements(updated);
            setAchievements(updated);
            showToast('Achievement removed', 'info');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex space-x-2 border-b border-stone-200 dark:border-stone-800 pb-1">
                {['INBOX', 'ALBUM', 'HALL_OF_FAME', 'SETTINGS'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)} 
                        className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center ${activeTab === tab ? 'bg-amber-600 text-white' : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 dark:text-stone-400'}`}
                    >
                       {tab.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 animate-in">
                {activeTab === 'INBOX' && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-stone-800 dark:text-white">Feedback & Messages</h3>
                        {feedbacks.length === 0 ? <p className="text-stone-400 italic">No messages received yet.</p> :
                        feedbacks.map(msg => (
                            <div key={msg.id} className="p-4 border border-stone-100 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800/50">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-stone-800 dark:text-white">{msg.name || 'Anonymous'}</h4>
                                    <span className="text-xs text-stone-500">{new Date(msg.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-stone-600 dark:text-stone-300">"{msg.message}"</p>
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 'ALBUM' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="font-bold text-stone-800 dark:text-white mb-4">Add New Image</h3>
                            <form onSubmit={handleAddImage} className="space-y-4 bg-stone-50 dark:bg-stone-800 p-4 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FileUploader label="Upload Photo" initialUrl={imgUrl} onUpload={setImgUrl} />
                                    <div className="flex flex-col gap-4">
                                        <input type="text" required placeholder="Caption" className="input-field text-sm" value={caption} onChange={e => setCaption(e.target.value)} />
                                        <button type="submit" className="btn-primary text-sm h-10 mt-auto">Add to Gallery</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {album.map(img => (
                                <div key={img.id} className="relative group rounded-lg overflow-hidden h-32">
                                    <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center text-white p-2 text-center">
                                        <p className="text-xs font-bold truncate w-full">{img.caption}</p>
                                        <button onClick={() => handleDeleteImage(img.id)} className="mt-2 text-red-400 hover:text-red-300"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'HALL_OF_FAME' && (
                     <div className="space-y-8">
                        <form onSubmit={handleAddAchievement} className="bg-stone-50 dark:bg-stone-800 p-4 rounded-lg space-y-4">
                            <h3 className="font-bold text-stone-800 dark:text-white">Add Achievement</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" required placeholder="Title" className="input-field text-sm" value={achTitle} onChange={e => setAchTitle(e.target.value)} />
                                <input type="text" required placeholder="Description" className="input-field text-sm" value={achDesc} onChange={e => setAchDesc(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <input type="text" required placeholder="Date string" className="input-field text-sm" value={achDate} onChange={e => setAchDate(e.target.value)} />
                                <CustomSelect 
                                    value={achIcon}
                                    onChange={setAchIcon}
                                    options={[
                                        {value: '🏆', label: 'Trophy'},
                                        {value: '🥇', label: '1st'},
                                        {value: '🥈', label: '2nd'},
                                        {value: '🥉', label: '3rd'},
                                        {value: '🏅', label: 'Medal'},
                                    ]}
                                />
                                <button type="submit" className="btn-primary text-sm">Add Entry</button>
                            </div>
                        </form>
                        <div className="space-y-2">
                            {achievements.map(ach => (
                                <div key={ach.id} className="flex items-center justify-between p-3 border border-stone-200 dark:border-stone-700 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{ach.icon}</span>
                                        <div>
                                            <p className="font-bold text-sm text-stone-900 dark:text-white">{ach.title}</p>
                                            <p className="text-xs text-stone-500">{ach.description}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteAchievement(ach.id)} className="text-stone-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'SETTINGS' && (
                    <form onSubmit={handleSaveSettings} className="bg-stone-50 dark:bg-stone-800 p-4 rounded-lg flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Class Logo URL</label>
                            <input type="text" className="input-field w-full" value={logoInput} onChange={e => setLogoInput(e.target.value)} />
                        </div>
                        <img src={logoInput} alt="Preview" className="w-12 h-12 rounded-full border border-stone-200 object-cover" onError={(e) => (e.currentTarget.src='https://via.placeholder.com/150')} />
                        <button type="submit" className="btn-primary flex items-center px-4 py-2"><Save size={16} className="mr-2" /> Save</button>
                    </form>
                )}
            </div>
        </div>
    );
};

// --- Finance Transparency & Campaigns ---

export const FinanceModule: React.FC<{ user: User }> = ({ user }) => {
    // ... [Previous finance logic largely same, just updating liquidation form]
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'TRANSPARENCY' | 'CAMPAIGNS' | 'STUDENTS'>('TRANSPARENCY');
    const [txs, setTxs] = useState<Transaction[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    
    // Create Campaign Form
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [cName, setCName] = useState('');
    const [cDesc, setCDesc] = useState('');
    const [cTarget, setCTarget] = useState('');
    const [cPerStudent, setCPerStudent] = useState('');
    const [cProof, setCProof] = useState('');

    // Liquidation Form
    const [isLiquidationOpen, setIsLiquidationOpen] = useState(false);
    const [liqAmount, setLiqAmount] = useState('');
    const [liqDesc, setLiqDesc] = useState('');
    const [liqProof, setLiqProof] = useState('');
    const [liqCategory, setLiqCategory] = useState('Materials');

    const canManage = PERMISSIONS.CAN_MANAGE_FINANCE.includes(user.role);
    const isAuditor = user.role === UserRole.AUDITOR || user.role === UserRole.ADMIN;

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        setTxs(getTransactions());
        setCampaigns(getCampaigns());
    };

    const handleCreateCampaign = (e: React.FormEvent) => {
        e.preventDefault();
        const newCamp: Campaign = {
            id: Date.now().toString(),
            title: cName,
            description: cDesc,
            targetAmount: parseFloat(cTarget),
            amountPerStudent: parseFloat(cPerStudent) || 0,
            letterUrl: cProof,
            status: 'ACTIVE',
            createdBy: user.id,
            dateCreated: Date.now()
        };
        saveCampaign(newCamp);
        setIsCreateOpen(false);
        setCName(''); setCDesc(''); setCTarget(''); setCPerStudent(''); setCProof('');
        refreshData();
        showToast('Campaign created successfully', 'success');
    };

    const handleLiquidation = (e: React.FormEvent) => {
        e.preventDefault();
        const tx: Transaction = {
            id: Date.now().toString(),
            type: 'EXPENSE',
            amount: parseFloat(liqAmount),
            category: liqCategory,
            description: liqDesc,
            date: Date.now(),
            recordedBy: user.id,
            verified: true,
            proofUrl: liqProof
        };
        addTransaction(tx);
        setIsLiquidationOpen(false);
        setLiqAmount(''); setLiqDesc(''); setLiqProof('');
        refreshData();
        showToast('Expense liquidated and deducted from records.', 'success');
    }

    // Calculate Financials
    const totalCollection = txs.filter(t => t.type === 'COLLECTION').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = txs.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalCollection - totalExpense;
    const myContributions = txs.filter(t => t.type === 'COLLECTION' && t.studentId === user.id).reduce((acc, curr) => acc + curr.amount, 0);

    const data = [
        { name: 'Collections', value: totalCollection, color: '#10b981' }, 
        { name: 'Expenses', value: totalExpense, color: '#ef4444' }     
    ];
    
    return (
        <div className="space-y-6">
            <div className="flex space-x-2 border-b border-stone-200 dark:border-stone-800 pb-1">
                {['TRANSPARENCY', 'CAMPAIGNS', 'STUDENTS'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)} 
                        className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === tab ? 'bg-amber-600 text-white' : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 dark:text-stone-400'}`}
                    >
                        {tab === 'TRANSPARENCY' ? 'Transparency' : tab === 'CAMPAIGNS' ? 'Campaigns' : 'Student Accounts'}
                    </button>
                ))}
            </div>

            {activeTab === 'TRANSPARENCY' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in">
                    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6">
                        <div className="flex justify-between items-start mb-4">
                             <h2 className="text-xl font-bold font-display text-stone-800 dark:text-white flex items-center">
                                <DollarSign className="mr-2 text-emerald-600" /> Class Funds
                            </h2>
                            {isAuditor && (
                                <button onClick={() => setIsLiquidationOpen(true)} className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                                    Liquidate Funds
                                </button>
                            )}
                        </div>
                       
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                <p className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold tracking-wider">Collected</p>
                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">₱{totalCollection}</p>
                            </div>
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                <p className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold tracking-wider">Spent</p>
                                <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-1">₱{totalExpense}</p>
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                <p className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold tracking-wider">Balance</p>
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">₱{balance}</p>
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                                <p className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold tracking-wider">My Contrib.</p>
                                <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">₱{myContributions}</p>
                            </div>
                        </div>
                        
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `₱${value}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 flex flex-col">
                         <h3 className="font-bold text-stone-800 dark:text-white mb-4">Transaction History</h3>
                         <div className="flex-1 overflow-y-auto max-h-[400px] space-y-2 pr-2 custom-scrollbar">
                             {txs.slice().reverse().map(t => (
                                <div key={t.id} className="flex justify-between items-center p-3 border border-stone-100 dark:border-stone-700 rounded-lg bg-stone-50/50 dark:bg-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                                    <div>
                                        <p className="font-medium text-stone-800 dark:text-stone-200 text-sm">{t.description}</p>
                                        <p className="text-xs text-stone-400">{new Date(t.date).toLocaleDateString()} • {t.category}</p>
                                        {t.proofUrl && (
                                            <a href={t.proofUrl} target="_blank" className="text-[10px] text-indigo-500 hover:underline flex items-center mt-1">
                                                <FileText size={10} className="mr-1" /> View Proof
                                            </a>
                                        )}
                                    </div>
                                    <span className={`font-bold text-sm ${t.type === 'COLLECTION' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {t.type === 'COLLECTION' ? '+' : '-'}₱{t.amount}
                                    </span>
                                </div>
                            ))}
                            {txs.length === 0 && <p className="text-center text-stone-400 text-sm py-4">No transactions yet.</p>}
                         </div>
                    </div>
                </div>
            )}

            {activeTab === 'CAMPAIGNS' && (
                <div className="animate-in">
                     <div className="flex justify-between items-center mb-6">
                         <h2 className="text-xl font-bold font-display text-stone-800 dark:text-white">Active Campaigns</h2>
                         {canManage && (
                             <button onClick={() => setIsCreateOpen(true)} className="btn-primary flex items-center text-xs px-4 py-2">
                                 <Plus size={16} className="mr-1" /> New Campaign
                             </button>
                         )}
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {campaigns.map(camp => (
                             <CampaignCard key={camp.id} campaign={camp} user={user} txs={txs} canManage={canManage} onRefresh={refreshData} />
                         ))}
                         {campaigns.length === 0 && <p className="col-span-3 text-center text-stone-400 italic">No active campaigns.</p>}
                     </div>
                </div>
            )}

            {activeTab === 'STUDENTS' && (
                <StudentAccountsView 
                    currentUser={user} 
                    transactions={txs} 
                    campaigns={campaigns} 
                    onRefresh={refreshData} 
                    canManage={canManage} 
                />
            )}

            {/* Create Campaign Modal */}
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Campaign">
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Campaign Name</label>
                        <input type="text" required className="input-field w-full" value={cName} onChange={e => setCName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Description</label>
                        <textarea required className="input-field w-full" rows={3} value={cDesc} onChange={e => setCDesc(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Total Target</label>
                            <input type="number" required className="input-field w-full" value={cTarget} onChange={e => setCTarget(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Per Student (Opt)</label>
                            <input type="number" className="input-field w-full" value={cPerStudent} onChange={e => setCPerStudent(e.target.value)} />
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Auth Letter / Proof</label>
                         <FileUploader onUpload={setCProof} label="Upload Official Letter" />
                    </div>
                    <button type="submit" className="btn-primary w-full mt-4">Launch Campaign</button>
                </form>
            </Modal>

            {/* Liquidation Modal */}
            <Modal isOpen={isLiquidationOpen} onClose={() => setIsLiquidationOpen(false)} title="Liquidate Funds / Add Expense">
                <form onSubmit={handleLiquidation} className="space-y-4">
                     <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded text-xs text-amber-800 dark:text-amber-300 mb-2">
                         This will create an EXPENSE record and deduct from the class balance.
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Amount Deducted (₱)</label>
                        <input type="number" required className="input-field w-full" value={liqAmount} onChange={e => setLiqAmount(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Description</label>
                        <input type="text" required className="input-field w-full" value={liqDesc} onChange={e => setLiqDesc(e.target.value)} placeholder="e.g. Bought materials for..." />
                    </div>
                    <div>
                        <CustomSelect
                            label="Category"
                            value={liqCategory}
                            onChange={setLiqCategory}
                            options={[
                                {value: 'Materials', label: 'Materials'},
                                {value: 'Food', label: 'Food / Refreshments'},
                                {value: 'Transportation', label: 'Transportation'},
                                {value: 'Event', label: 'Event'},
                                {value: 'Refund', label: 'Refund'},
                                {value: 'Other', label: 'Other'},
                            ]}
                        />
                    </div>
                    <div>
                         <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Proof / Receipt (Required)</label>
                         <FileUploader onUpload={setLiqProof} label="Upload Receipt Image" />
                    </div>
                    <button type="submit" disabled={!liqProof} className="btn-primary w-full mt-4 disabled:opacity-50">Confirm Expense</button>
                </form>
            </Modal>
        </div>
    );
};

// ... [StudentAccountsView, StudentFinanceDetail, CampaignCard - No major selects here but safe to keep]
// Keeping previous implementations for those helper components to avoid truncation, as they didn't use <select> heavily or were simple.

const StudentAccountsView: React.FC<{ 
    currentUser: User, 
    transactions: Transaction[], 
    campaigns: Campaign[], 
    onRefresh: () => void,
    canManage: boolean
}> = ({ currentUser, transactions, campaigns, onRefresh, canManage }) => {
    // ... [Previous logic]
    const { showToast } = useToast();
    const [viewMode, setViewMode] = useState<'TABLE' | 'CARD'>('TABLE');
    const [students, setStudents] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        setStudents(getUsers().filter(u => u.role === UserRole.STUDENT));
    }, []);

    const visibleStudents = canManage 
        ? students.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
        : students.filter(s => s.id === currentUser.id);

    const getStudentSummary = (sId: string) => {
        const studentTxs = transactions.filter(t => t.studentId === sId && t.type === 'COLLECTION');
        const totalContributed = studentTxs.reduce((sum, t) => sum + t.amount, 0);
        const totalObligation = campaigns.reduce((sum, c) => sum + (c.amountPerStudent || 0), 0);
        let totalOverpaid = 0;
        campaigns.forEach(c => {
            const paidForC = transactions
                .filter(t => t.studentId === sId && t.campaignId === c.id && t.type === 'COLLECTION')
                .reduce((sum, t) => sum + t.amount, 0);
            if (c.amountPerStudent && paidForC > c.amountPerStudent) {
                totalOverpaid += (paidForC - c.amountPerStudent);
            }
        });
        return { totalContributed, totalObligation, totalOverpaid };
    };

    const handleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleMassRefund = () => {
        if (!confirm(`Process refunds for ${selectedIds.size} students?`)) return;
        let refundCount = 0;
        selectedIds.forEach(sId => {
            const { totalOverpaid } = getStudentSummary(sId);
            if (totalOverpaid > 0) {
                const tx: Transaction = {
                    id: Date.now().toString() + Math.random(),
                    type: 'EXPENSE',
                    amount: totalOverpaid,
                    category: 'REFUND',
                    description: 'Mass Refund for overpayments',
                    date: Date.now(),
                    recordedBy: currentUser.id,
                    verified: true,
                    studentId: sId
                };
                addTransaction(tx);
                refundCount++;
            }
        });
        if (refundCount > 0) {
            showToast(`Processed refunds for ${refundCount} students.`, 'success');
            onRefresh();
            setSelectedIds(new Set());
        } else {
            showToast('No overpayments found.', 'info');
        }
    };

    return (
        <div className="space-y-4 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 text-stone-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search student..." 
                        className="input-field w-full pl-9 text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex gap-2">
                    {canManage && selectedIds.size > 0 && (
                        <button onClick={handleMassRefund} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-bold flex items-center transition-colors">
                            <RefreshCcw size={14} className="mr-2" /> Refund Selected
                        </button>
                    )}
                    <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                        <button onClick={() => setViewMode('TABLE')} className={`p-1.5 rounded ${viewMode === 'TABLE' ? 'bg-white dark:bg-stone-700 shadow text-stone-900 dark:text-white' : 'text-stone-400'}`}><List size={16}/></button>
                        <button onClick={() => setViewMode('CARD')} className={`p-1.5 rounded ${viewMode === 'CARD' ? 'bg-white dark:bg-stone-700 shadow text-stone-900 dark:text-white' : 'text-stone-400'}`}><LayoutGrid size={16}/></button>
                    </div>
                </div>
            </div>

            {viewMode === 'TABLE' ? (
                <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-stone-50 dark:bg-stone-800 text-xs uppercase text-stone-500 sticky top-0">
                                <tr>
                                    {canManage && <th className="p-4 w-10"><input type="checkbox" onChange={(e) => {
                                        if(e.target.checked) setSelectedIds(new Set(visibleStudents.map(s => s.id)));
                                        else setSelectedIds(new Set());
                                    }}/></th>}
                                    <th className="p-4">Student</th>
                                    <th className="p-4 text-right">Contributed</th>
                                    <th className="p-4 text-right">Overpaid</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                                {visibleStudents.map(s => {
                                    const { totalContributed, totalOverpaid } = getStudentSummary(s.id);
                                    return (
                                        <tr key={s.id} onClick={() => setSelectedStudent(s)} className="cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                                            {canManage && <td className="p-4" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => handleSelect(s.id)} />
                                            </td>}
                                            <td className="p-4 font-medium flex items-center gap-3">
                                                 <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-bold text-xs">{s.username.substring(0,2).toUpperCase()}</div>
                                                 {s.fullName}
                                            </td>
                                            <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400">₱{totalContributed}</td>
                                            <td className="p-4 text-right font-mono text-red-500">{totalOverpaid > 0 ? `₱${totalOverpaid}` : '-'}</td>
                                            <td className="p-4 text-right text-stone-400"><ArrowRight size={16} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleStudents.map(s => {
                        const { totalContributed, totalOverpaid } = getStudentSummary(s.id);
                        return (
                            <div key={s.id} onClick={() => setSelectedStudent(s)} className={`p-5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 cursor-pointer hover:shadow-lg transition-all relative overflow-hidden ${selectedIds.has(s.id) ? 'ring-2 ring-amber-500' : ''}`}>
                                {totalOverpaid > 0 && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl">Overpaid</div>}
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-bold text-lg">{s.username.substring(0,2).toUpperCase()}</div>
                                    <div>
                                        <p className="font-bold text-stone-800 dark:text-white">{s.fullName}</p>
                                        <p className="text-xs text-stone-500">{s.id}</p>
                                    </div>
                                </div>
                                <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-3 flex justify-between items-center">
                                    <span className="text-xs font-bold text-stone-500 uppercase">Contribution</span>
                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₱{totalContributed}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title="Student Financial Record">
                {selectedStudent && (
                    <StudentFinanceDetail 
                        student={selectedStudent} 
                        transactions={transactions} 
                        campaigns={campaigns} 
                        onRefresh={onRefresh}
                        canManage={canManage}
                        currentUser={currentUser}
                    />
                )}
            </Modal>
        </div>
    );
};

// StudentFinanceDetail and CampaignCard are helpers - same logic as before.
const StudentFinanceDetail: React.FC<{ 
    student: User, 
    transactions: Transaction[], 
    campaigns: Campaign[], 
    onRefresh: () => void,
    canManage: boolean,
    currentUser: User
}> = ({ student, transactions, campaigns, onRefresh, canManage, currentUser }) => {
    // ... [Same logic]
    const { showToast } = useToast();
    const [history, setHistory] = useState<Transaction[]>([]);

    useEffect(() => {
        setHistory(transactions.filter(t => t.studentId === student.id));
    }, [transactions, student.id]);

    const handleDeleteTx = (id: string) => {
        if (!canManage) return;
        if(confirm('Delete this transaction record?')) {
            deleteTransaction(id);
            onRefresh();
            showToast('Transaction deleted', 'info');
        }
    };

    const handleReturn = (campaignId: string, overpaidAmount: number) => {
        if (!canManage) return;
        const amount = prompt(`Enter refund amount (Max ₱${overpaidAmount}):`, overpaidAmount.toString());
        if (amount) {
            const val = parseFloat(amount);
            if (val > 0) {
                const tx: Transaction = {
                    id: Date.now().toString(),
                    type: 'EXPENSE',
                    amount: val,
                    category: 'REFUND',
                    description: `Return overpayment for campaign`,
                    date: Date.now(),
                    recordedBy: currentUser.id,
                    verified: true,
                    studentId: student.id,
                    campaignId
                };
                addTransaction(tx);
                onRefresh();
                showToast(`Refunded ₱${val}`, 'success');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-lg">
                     {student.username.substring(0,2).toUpperCase()}
                </div>
                <div>
                     <h3 className="text-lg font-bold text-stone-800 dark:text-white">{student.fullName}</h3>
                     <p className="text-sm text-stone-500 font-mono">{student.id}</p>
                </div>
            </div>

            {/* Campaign Cards */}
            <div>
                <h4 className="font-bold text-stone-800 dark:text-white mb-3 text-sm uppercase">Campaign Breakdown</h4>
                <div className="grid grid-cols-1 gap-3">
                    {campaigns.map(c => {
                        const paid = history.filter(t => t.campaignId === c.id && t.type === 'COLLECTION').reduce((sum, t) => sum + t.amount, 0);
                        const required = c.amountPerStudent || 0;
                        const overpaid = paid > required ? paid - required : 0;
                        
                        return (
                            <div key={c.id} className="p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm text-stone-800 dark:text-white">{c.title}</p>
                                    <p className="text-xs text-stone-500">Required: ₱{required}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${paid >= required ? 'text-green-600' : 'text-stone-600'}`}>
                                        Paid: ₱{paid}
                                    </p>
                                    {overpaid > 0 && canManage && (
                                        <button onClick={() => handleReturn(c.id, overpaid)} className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-bold hover:bg-red-200 mt-1">
                                            Return ₱{overpaid}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Transaction History */}
            <div>
                 <h4 className="font-bold text-stone-800 dark:text-white mb-3 text-sm uppercase">History</h4>
                 <div className="max-h-40 overflow-y-auto space-y-2">
                     {history.slice().reverse().map(t => (
                         <div key={t.id} className="flex justify-between items-center p-2 rounded bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800">
                             <div>
                                 <p className="text-xs font-bold text-stone-700 dark:text-stone-300">{t.description}</p>
                                 <p className="text-[10px] text-stone-500">{new Date(t.date).toLocaleDateString()}</p>
                             </div>
                             <div className="flex items-center gap-3">
                                 <span className={`text-sm font-bold ${t.type === 'COLLECTION' ? 'text-emerald-600' : 'text-red-600'}`}>
                                     {t.type === 'COLLECTION' ? '+' : '-'}₱{t.amount}
                                 </span>
                                 {canManage && (
                                     <button onClick={() => handleDeleteTx(t.id)} className="text-stone-400 hover:text-red-500">
                                         <Trash2 size={12} />
                                     </button>
                                 )}
                             </div>
                         </div>
                     ))}
                 </div>
            </div>
        </div>
    );
};

const CampaignCard: React.FC<{ campaign: Campaign, user: User, txs: Transaction[], canManage: boolean, onRefresh: () => void }> = ({ campaign, user, txs, canManage, onRefresh }) => {
    // ... [Same logic]
    const { showToast } = useToast();
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const collected = txs.filter(t => t.campaignId === campaign.id && t.type === 'COLLECTION').reduce((acc, curr) => acc + curr.amount, 0);
    const progress = Math.min((collected / campaign.targetAmount) * 100, 100);
    const myContribution = txs.filter(t => t.campaignId === campaign.id && t.studentId === user.id && t.type === 'COLLECTION').reduce((acc, curr) => acc + curr.amount, 0);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [manualAmount, setManualAmount] = useState(campaign.amountPerStudent || '');
    const [scannedStudentId, setScannedStudentId] = useState('');
    const [scanning, setScanning] = useState(false);

    const handleCollect = (studentId: string) => {
        if(!manualAmount) return;
        const tx: Transaction = {
            id: Date.now().toString(),
            type: 'COLLECTION',
            amount: Number(manualAmount),
            category: 'Campaign',
            description: `Contribution for ${campaign.title}`,
            date: Date.now(),
            recordedBy: user.id,
            verified: true,
            campaignId: campaign.id,
            studentId: studentId
        };
        addTransaction(tx);
        showToast(`Collected ₱${manualAmount} from ${studentId}`, 'success');
        onRefresh();
        setScannedStudentId('');
        setIsScannerOpen(false);
    };
    
    const simulateScan = () => {
        setScanning(true);
        setTimeout(() => {
            const students = getUsers().filter(u => u.role === UserRole.STUDENT);
            const random = students[Math.floor(Math.random() * students.length)];
            setScanning(false);
            if(random) setScannedStudentId(random.id);
        }, 1500);
    };

    return (
        <>
        <div onClick={() => setIsDetailOpen(true)} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
             <div className="flex justify-between items-start mb-2 pl-2">
                 <h3 className="font-bold text-lg text-stone-800 dark:text-white group-hover:text-amber-600 transition-colors">{campaign.title}</h3>
                 <span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded">{campaign.status}</span>
             </div>
             <p className="text-sm text-stone-500 mb-4 pl-2 line-clamp-2">{campaign.description}</p>
             <div className="pl-2">
                 <div className="flex justify-between text-xs font-bold mb-1 text-stone-600 dark:text-stone-400">
                     <span>₱{collected} raised</span>
                     <span>₱{campaign.targetAmount} goal</span>
                 </div>
                 <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
                     <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                 </div>
                 <div className="mt-4 flex justify-between items-center text-xs">
                     <span className="text-stone-400">Ends soon</span>
                     {myContribution > 0 && <span className="text-green-600 font-bold flex items-center"><CheckCircle size={12} className="mr-1"/> Paid ₱{myContribution}</span>}
                 </div>
             </div>
        </div>

        <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={campaign.title}>
            <div className="space-y-6">
                {campaign.letterUrl && (
                    <div className="w-full h-40 bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 relative group">
                        <img src={campaign.letterUrl} alt="Letter" className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <a href={campaign.letterUrl} target="_blank" className="bg-black/50 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-black/70 flex items-center">
                                <FileText size={16} className="mr-2"/> View Official Letter
                            </a>
                        </div>
                    </div>
                )}
                <p className="text-stone-600 dark:text-stone-300">{campaign.description}</p>
                <div className="bg-stone-50 dark:bg-stone-800 p-4 rounded-lg border border-stone-200 dark:border-stone-700">
                     <div className="flex justify-between text-sm font-bold mb-2 text-stone-800 dark:text-white">
                         <span>Progress</span>
                         <span>{progress.toFixed(1)}%</span>
                     </div>
                     <div className="w-full bg-stone-200 dark:bg-stone-700 h-4 rounded-full overflow-hidden mb-2">
                         <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                     </div>
                     <div className="flex justify-between text-xs text-stone-500">
                         <span>Collected: ₱{collected}</span>
                         <span>Goal: ₱{campaign.targetAmount}</span>
                     </div>
                </div>
                {canManage ? (
                    <div className="border-t border-stone-100 dark:border-stone-800 pt-4">
                        <h4 className="font-bold text-stone-800 dark:text-white mb-3">Officer Actions</h4>
                        <button onClick={() => setIsScannerOpen(true)} className="w-full btn-primary py-3 flex items-center justify-center">
                            <QrCode size={20} className="mr-2"/> Scan to Collect
                        </button>
                    </div>
                ) : (
                    <div className="border-t border-stone-100 dark:border-stone-800 pt-4 text-center">
                        <h4 className="font-bold text-stone-800 dark:text-white mb-3">Your Contribution</h4>
                        {myContribution >= (campaign.amountPerStudent || 1) ? (
                            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-lg flex flex-col items-center">
                                <CheckCircle size={32} className="mb-2" />
                                <span className="font-bold">Fully Paid (₱{myContribution})</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center p-4 bg-stone-50 dark:bg-stone-800 rounded-lg">
                                <div className="bg-white p-2 rounded border border-stone-200 mb-2">
                                     <QrCode size={96} className="text-stone-900" />
                                </div>
                                <p className="text-xs text-stone-500 font-bold mb-1">Show this QR to Treasurer</p>
                                <p className="text-xs text-stone-400 font-mono">{user.id}</p>
                                <p className="text-sm font-bold text-amber-600 mt-2">Due: ₱{campaign.amountPerStudent || 'Any'}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>

        <Modal isOpen={isScannerOpen} onClose={() => {setIsScannerOpen(false); setScannedStudentId('');}} title="Record Contribution">
            <div className="space-y-6 text-center">
                {!scannedStudentId ? (
                    <div className="py-6">
                        {scanning ? (
                            <div className="w-32 h-32 mx-auto border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        ) : (
                             <Camera size={64} className="mx-auto text-stone-400 mb-4" />
                        )}
                        <p className="text-stone-500 text-sm mb-4">{scanning ? "Scanning..." : "Scan student QR Code"}</p>
                        <button onClick={simulateScan} disabled={scanning} className="btn-primary px-6 py-2 text-sm">
                            {scanning ? 'Wait...' : 'Simulate Scan'}
                        </button>
                    </div>
                ) : (
                    <div className="animate-in text-left">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800 mb-4 flex items-center">
                            <CheckCircle className="text-green-600 mr-2" size={20} />
                            <div>
                                <p className="text-xs text-green-800 dark:text-green-300 font-bold">Student Identified</p>
                                <p className="text-sm font-mono text-green-700 dark:text-green-400">{scannedStudentId}</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Amount</label>
                            <input type="number" className="input-field w-full" value={manualAmount} onChange={e => setManualAmount(e.target.value)} />
                        </div>
                        <button onClick={() => handleCollect(scannedStudentId)} className="btn-primary w-full mt-4">Confirm Collection</button>
                    </div>
                )}
            </div>
        </Modal>
        </>
    );
};

export const AttendanceModule: React.FC<{ user: User }> = ({ user }) => {
    // ... [Logic same]
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'PERSONAL' | 'TOOLS' | 'RECORDS'>('PERSONAL');
    
    const canAccessTools = PERMISSIONS.CAN_TAKE_ATTENDANCE.includes(user.role);

    return (
        <div className="space-y-6">
            <div className="flex space-x-2 border-b border-stone-200 dark:border-stone-800 pb-1">
                <button 
                    onClick={() => setActiveTab('PERSONAL')} 
                    className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'PERSONAL' ? 'bg-amber-600 text-white' : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 dark:text-stone-400'}`}
                >
                    Personal
                </button>
                {canAccessTools && (
                    <button 
                        onClick={() => setActiveTab('TOOLS')} 
                        className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'TOOLS' ? 'bg-amber-600 text-white' : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 dark:text-stone-400'}`}
                    >
                        Officer Tools
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('RECORDS')} 
                    className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'RECORDS' ? 'bg-amber-600 text-white' : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 dark:text-stone-400'}`}
                >
                    Transparency
                </button>
            </div>

            {activeTab === 'PERSONAL' && <PersonalAttendanceView user={user} showToast={showToast} />}
            {activeTab === 'TOOLS' && canAccessTools && <OfficerAttendanceView user={user} showToast={showToast} />}
            {activeTab === 'RECORDS' && <TransparencyView user={user} showToast={showToast} />}
        </div>
    );
};

const PersonalAttendanceView: React.FC<{ user: User, showToast: any }> = ({ user, showToast }) => {
    // ... [Logic same]
    const [excuses, setExcuses] = useState<ExcuseRequest[]>([]);
    const [showExcuseForm, setShowExcuseForm] = useState(false);
    
    const [reason, setReason] = useState('');
    const [contact, setContact] = useState('');
    const [type, setType] = useState<'DATE_SPAN' | 'SPECIFIC_TIME'>('DATE_SPAN');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [proof, setProof] = useState<string>('');

    useEffect(() => {
        setExcuses(getExcuseRequests().filter(e => e.studentId === user.id));
    }, [user.id]);

    const submitExcuse = (e: React.FormEvent) => {
        e.preventDefault();
        const req: ExcuseRequest = {
            id: Date.now().toString(),
            studentId: user.id,
            reason,
            validationContact: contact,
            type,
            startDate,
            endDate: type === 'DATE_SPAN' ? endDate : startDate,
            startTime: type === 'SPECIFIC_TIME' ? startTime : undefined,
            endTime: type === 'SPECIFIC_TIME' ? endTime : undefined,
            proofUrl: proof,
            status: 'PENDING',
            dateFiled: Date.now()
        };
        addExcuseRequest(req);
        setExcuses(getExcuseRequests().filter(e => e.studentId === user.id));
        setShowExcuseForm(false);
        showToast('Excuse request submitted for approval.', 'success');
        setReason(''); setContact(''); setStartDate(''); setEndDate(''); setProof('');
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in">
            <div className="bg-white dark:bg-stone-900 p-6 rounded-xl border border-stone-200 dark:border-stone-800 text-center">
                 <h3 className="text-lg font-bold text-stone-800 dark:text-white mb-6">My QR Code</h3>
                 <div className="bg-white p-4 rounded-xl shadow-xl border-4 border-stone-100 dark:border-stone-700 mb-6 inline-block relative group">
                    <div className="w-56 h-56 bg-stone-900 flex items-center justify-center text-white rounded-lg relative overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-stone-500/20"></div>
                         <QrCode size={140} className="relative z-10" />
                    </div>
                    <div className="absolute -bottom-3 -right-3 bg-amber-600 text-white p-2 rounded-full border-4 border-white shadow-lg">
                        <UserCheck size={20} />
                    </div>
                 </div>
                 <p className="text-xl font-bold text-stone-800 dark:text-white">{user.fullName}</p>
                 <p className="text-stone-500 dark:text-stone-400 font-mono bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded mt-2 inline-block text-sm">{user.id}</p>
            </div>

            <div className="space-y-6">
                <div className="bg-white dark:bg-stone-900 p-6 rounded-xl border border-stone-200 dark:border-stone-800">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-stone-800 dark:text-white">Excuse Applications</h3>
                        <button onClick={() => setShowExcuseForm(!showExcuseForm)} className="text-xs font-bold bg-stone-100 dark:bg-stone-800 px-3 py-2 rounded hover:bg-stone-200 transition-colors">
                            {showExcuseForm ? 'Cancel' : 'Apply for Excuse'}
                        </button>
                    </div>

                    {showExcuseForm && (
                        <form onSubmit={submitExcuse} className="space-y-3 mb-6 bg-stone-50 dark:bg-stone-800/50 p-4 rounded-lg animate-in">
                            <input type="text" placeholder="Reason (Required)" required className="input-field w-full text-sm" value={reason} onChange={e => setReason(e.target.value)} />
                            <input type="text" placeholder="Validation Contact (Optional - Parent/Guardian)" className="input-field w-full text-sm" value={contact} onChange={e => setContact(e.target.value)} />
                            
                            <div className="flex gap-2 text-xs font-medium text-stone-500 bg-white dark:bg-stone-800 p-1 rounded border border-stone-200 dark:border-stone-700">
                                <button type="button" onClick={() => setType('DATE_SPAN')} className={`flex-1 py-1 rounded ${type === 'DATE_SPAN' ? 'bg-amber-100 text-amber-700' : ''}`}>Date Span</button>
                                <button type="button" onClick={() => setType('SPECIFIC_TIME')} className={`flex-1 py-1 rounded ${type === 'SPECIFIC_TIME' ? 'bg-amber-100 text-amber-700' : ''}`}>Specific Time</button>
                            </div>

                            {type === 'DATE_SPAN' ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-stone-500">From</label>
                                        <input type="date" required className="input-field w-full text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-500">To</label>
                                        <input type="date" required className="input-field w-full text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-stone-500">Date</label>
                                        <input type="date" required className="input-field w-full text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-stone-500">Start Time</label>
                                            <input type="time" required className="input-field w-full text-sm" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-stone-500">End Time</label>
                                            <input type="time" required className="input-field w-full text-sm" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <FileUploader label="Attach Proof (Image/PDF)" accept="image/*,application/pdf" onUpload={setProof} />
                            <button type="submit" className="btn-primary w-full text-sm">Submit Application</button>
                        </form>
                    )}

                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {excuses.map(ex => (
                            <div key={ex.id} className="p-3 border border-stone-100 dark:border-stone-700 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm text-stone-800 dark:text-stone-200">{ex.reason}</p>
                                    <p className="text-xs text-stone-500">
                                        {ex.type === 'DATE_SPAN' ? `${ex.startDate} to ${ex.endDate}` : `${ex.startDate} (${ex.startTime}-${ex.endTime})`}
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                    ex.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    ex.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {ex.status}
                                </span>
                            </div>
                        ))}
                        {excuses.length === 0 && <p className="text-stone-400 text-sm text-center italic">No applications history.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const OfficerAttendanceView: React.FC<{ user: User, showToast: any }> = ({ user, showToast }) => {
    // ... [Same logic]
    const [subTab, setSubTab] = useState<'SCANNER' | 'CHECKLIST' | 'EXCUSES'>('CHECKLIST');
    const [students, setStudents] = useState<User[]>([]);
    const [scanning, setScanning] = useState(false);
    const [viewMode, setViewMode] = useState<'TABLE' | 'CARD'>('TABLE');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [pendingExcuses, setPendingExcuses] = useState<ExcuseRequest[]>([]);

    useEffect(() => {
        setStudents(getUsers().filter(u => u.role === UserRole.STUDENT));
        setPendingExcuses(getExcuseRequests().filter(e => e.status === 'PENDING'));
    }, []);

    const refreshData = () => {
         setStudents(getUsers().filter(u => u.role === UserRole.STUDENT));
         setPendingExcuses(getExcuseRequests().filter(e => e.status === 'PENDING'));
    };

    const startScan = () => {
        setScanning(true);
        setTimeout(() => {
            setScanning(false);
            const randomStudent = students[Math.floor(Math.random() * students.length)];
            if(randomStudent) {
                setSelectedStudent(randomStudent);
                showToast(`Scanned: ${randomStudent.fullName}`, "success");
            } else {
                showToast("No student found (Mock)", "error");
            }
        }, 2000);
    };

    const handleExcuseDecision = (req: ExcuseRequest, approved: boolean) => {
        updateExcuseStatus(req.id, approved ? 'APPROVED' : 'REJECTED');
        if (approved) {
            const record: AttendanceRecord = {
                id: `${req.startDate}-${req.studentId}`,
                date: req.startDate,
                timeIn: '-',
                studentId: req.studentId,
                status: 'EXCUSED',
                recordedBy: user.id,
                proofUrl: req.proofUrl,
                remarks: `Excuse Approved: ${req.reason}`
            };
            saveAttendance([record]);
        }
        refreshData();
        showToast(`Request ${approved ? 'Approved' : 'Rejected'}`, approved ? 'success' : 'info');
    };

    return (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
                {['CHECKLIST', 'SCANNER', 'EXCUSES'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setSubTab(tab as any)} 
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${subTab === tab ? 'bg-amber-600 text-white' : 'text-stone-500 hover:text-amber-600'}`}
                    >
                        {tab === 'EXCUSES' ? `Excuse Review (${pendingExcuses.length})` : tab}
                    </button>
                ))}
            </div>

            <div className="p-6">
                {subTab === 'SCANNER' && (
                    <div className="text-center animate-in">
                        <div className="bg-black w-full max-w-sm mx-auto h-64 rounded-xl flex flex-col items-center justify-center relative overflow-hidden mb-6">
                            {scanning ? (
                                <>
                                    <div className="absolute inset-0 border-2 border-green-500 animate-pulse z-10"></div>
                                    <p className="text-green-500 font-mono animate-pulse z-20">SCANNING...</p>
                                    <div className="w-full h-1 bg-green-500 absolute top-0 animate-[scan_2s_infinite]"></div>
                                </>
                            ) : (
                                <Camera size={48} className="text-stone-600" />
                            )}
                        </div>
                        {!scanning && (
                            <button onClick={startScan} className="btn-primary px-8 py-3 rounded-full shadow-xl">
                                Open Scanner / Simulate Scan
                            </button>
                        )}
                        <p className="mt-4 text-xs text-stone-500">Scan QR to open Student Profile & Record</p>
                    </div>
                )}

                {subTab === 'CHECKLIST' && (
                    <div className="space-y-4 animate-in">
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-2.5 text-stone-400 w-4 h-4" />
                                <input 
                                    type="text" 
                                    placeholder="Search student..." 
                                    className="input-field w-full pl-9 text-sm"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                                <button onClick={() => setViewMode('TABLE')} className={`p-1.5 rounded ${viewMode === 'TABLE' ? 'bg-white dark:bg-stone-700 shadow text-stone-900 dark:text-white' : 'text-stone-400'}`}><Filter size={16}/></button>
                                <button onClick={() => setViewMode('CARD')} className={`p-1.5 rounded ${viewMode === 'CARD' ? 'bg-white dark:bg-stone-700 shadow text-stone-900 dark:text-white' : 'text-stone-400'}`}><UserCheck size={16}/></button>
                            </div>
                        </div>

                        {viewMode === 'TABLE' ? (
                            <div className="overflow-x-auto max-h-[500px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-stone-50 dark:bg-stone-800 text-xs uppercase text-stone-500 sticky top-0">
                                        <tr>
                                            <th className="p-3">Student</th>
                                            <th className="p-3">ID</th>
                                            <th className="p-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                                        {students.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                                            <tr key={s.id} onClick={() => setSelectedStudent(s)} className="cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                                                <td className="p-3 font-medium">{s.fullName}</td>
                                                <td className="p-3 font-mono text-xs">{s.id}</td>
                                                <td className="p-3 text-right text-stone-400 hover:text-amber-600"><Settings size={16} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {students.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                                    <div key={s.id} onClick={() => setSelectedStudent(s)} className="p-4 rounded-lg border border-stone-200 dark:border-stone-700 hover:shadow-md cursor-pointer bg-stone-50 dark:bg-stone-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-bold text-xs">{s.username.substring(0,2).toUpperCase()}</div>
                                            <div>
                                                <p className="font-bold text-sm text-stone-800 dark:text-white">{s.fullName}</p>
                                                <p className="text-xs text-stone-500">{s.id}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {subTab === 'EXCUSES' && (
                    <div className="space-y-4 animate-in">
                        {pendingExcuses.length === 0 ? (
                            <div className="text-center py-10 text-stone-400 italic">No pending requests.</div>
                        ) : (
                            pendingExcuses.map(ex => (
                                <div key={ex.id} className="p-4 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-stone-800 dark:text-white">{students.find(s => s.id === ex.studentId)?.fullName || ex.studentId}</h4>
                                        <span className="text-xs font-mono text-stone-500">
                                            {ex.type === 'DATE_SPAN' ? `${ex.startDate} - ${ex.endDate}` : `${ex.startDate} ${ex.startTime}-${ex.endTime}`}
                                        </span>
                                    </div>
                                    <p className="text-sm text-stone-600 dark:text-stone-300 mb-2">"{ex.reason}"</p>
                                    <p className="text-xs text-stone-500 mb-4">Verified by: {ex.validationContact || 'Self'}</p>
                                    {ex.proofUrl && <a href={ex.proofUrl} target="_blank" className="text-xs text-indigo-500 mb-2 flex items-center cursor-pointer hover:underline"><FileText size={12} className="mr-1"/> View Proof Attachment</a>}
                                    
                                    <div className="flex gap-2">
                                        <button onClick={() => handleExcuseDecision(ex, true)} className="flex-1 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded text-xs font-bold hover:bg-green-200">Approve</button>
                                        <button onClick={() => handleExcuseDecision(ex, false)} className="flex-1 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded text-xs font-bold hover:bg-red-200">Reject</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title="Student Attendance Record">
                {selectedStudent && <StudentRecordView student={selectedStudent} currentUser={user} showToast={showToast} />}
            </Modal>
        </div>
    );
};

// Sub-component: Student Attendance Record Modal View
const StudentRecordView: React.FC<{ student: User, currentUser: User, showToast: any }> = ({ student, currentUser, showToast }) => {
    // ... [Logic same]
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newStatus, setNewStatus] = useState<'PRESENT'|'LATE'|'ABSENT'|'EXCUSED'>('PRESENT');

    useEffect(() => {
        setHistory(getAttendanceByStudent(student.id));
    }, [student.id]);

    const handleCreate = () => {
        const record: AttendanceRecord = {
            id: `${newDate}-${student.id}`,
            date: newDate,
            timeIn: newStatus === 'ABSENT' ? '-' : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            studentId: student.id,
            status: newStatus,
            recordedBy: currentUser.id
        };
        saveAttendance([record]);
        setHistory(getAttendanceByStudent(student.id));
        setIsCreating(false);
        showToast('Record created successfully', 'success');
    };

    const handleStatusUpdate = (record: AttendanceRecord, status: 'PRESENT'|'LATE'|'ABSENT'|'EXCUSED') => {
        const updated = { ...record, status };
        updateAttendanceRecord(updated);
        setHistory(getAttendanceByStudent(student.id));
        showToast('Record updated', 'success');
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
                <div className="w-16 h-16 bg-stone-200 dark:bg-stone-700 rounded-full flex items-center justify-center text-xl font-bold">
                     {student.username.substring(0,2).toUpperCase()}
                </div>
                <div>
                     <h3 className="text-xl font-bold text-stone-800 dark:text-white">{student.fullName}</h3>
                     <p className="text-sm text-stone-500 font-mono">{student.id}</p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                 <div className="relative flex-1 mr-2">
                     <Search className="absolute left-2 top-2 text-stone-400 w-3 h-3" />
                     <input 
                        type="text" 
                        placeholder="Search dates..." 
                        className="input-field py-1 pl-7 text-xs w-full"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                 </div>
                 <button onClick={() => setIsCreating(true)} className="btn-primary py-1 px-3 text-xs flex items-center">
                     <Plus size={14} className="mr-1" /> Add Record
                 </button>
            </div>

            {isCreating && (
                <div className="bg-stone-50 dark:bg-stone-800 p-3 rounded-lg border border-stone-200 dark:border-stone-700 animate-in">
                    <p className="text-xs font-bold text-stone-600 mb-2">New Entry</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                         <input type="date" className="input-field text-xs" value={newDate} onChange={e => setNewDate(e.target.value)} />
                         <CustomSelect 
                            value={newStatus}
                            onChange={(v) => setNewStatus(v as any)}
                            options={['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'].map(s => ({value: s, label: s}))}
                         />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleCreate} className="bg-green-600 text-white flex-1 py-1 rounded text-xs font-bold">Confirm</button>
                        <button onClick={() => setIsCreating(false)} className="bg-stone-400 text-white flex-1 py-1 rounded text-xs font-bold">Cancel</button>
                    </div>
                </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-2">
                 {history.length === 0 ? <p className="text-center text-xs text-stone-400 italic">No records found.</p> : 
                 history.filter(r => r.date.includes(searchTerm)).slice().reverse().map(record => (
                     <div key={record.id} className="flex justify-between items-center p-3 border border-stone-100 dark:border-stone-700 rounded-lg bg-stone-50/50 dark:bg-stone-900">
                         <div>
                             <p className="font-bold text-xs text-stone-800 dark:text-stone-300">{record.date}</p>
                             <p className="text-[10px] text-stone-500">In: {record.timeIn}</p>
                         </div>
                         <div className="w-24">
                            <CustomSelect 
                                value={record.status} 
                                onChange={(val) => handleStatusUpdate(record, val as any)}
                                options={['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'].map(s => ({ value: s, label: s }))}
                            />
                         </div>
                     </div>
                 ))}
            </div>
        </div>
    );
};

// TransparencyView and AccessLogs are read-only, no selects needed to change there except perhaps filtering if requested later.
const TransparencyView: React.FC<{ user: User, showToast: any }> = ({ user, showToast }) => {
    // ... [Same logic]
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [complaints, setComplaints] = useState<AttendanceComplaint[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    useEffect(() => {
        setRecords(getAttendance());
        setComplaints(getComplaints());
        setAllUsers(getUsers());
    }, []);

    const getName = (id: string) => allUsers.find(u => u.id === id)?.fullName || id;

    const handleComplaint = (record: AttendanceRecord) => {
        const reason = prompt("State your reason for contesting this record:");
        if (reason) {
            const comp: AttendanceComplaint = {
                id: Date.now().toString(),
                recordId: record.id,
                studentId: user.id,
                reason,
                status: 'PENDING',
                dateFiled: Date.now()
            };
            fileComplaint(comp);
            showToast('Complaint filed. Officers will review it.', 'info');
        }
    };
    
    const canResolve = PERMISSIONS.CAN_TAKE_ATTENDANCE.includes(user.role);

    const handleResolve = (id: string, approve: boolean) => {
        resolveComplaint(id, approve ? 'APPROVED' : 'REJECTED');
        setComplaints(getComplaints()); // Refresh
        showToast(approve ? 'Complaint Validated' : 'Complaint Dismissed', 'info');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in">
            <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
                    <h3 className="font-bold text-stone-800 dark:text-white">Daily Records</h3>
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-stone-100 dark:bg-stone-800 text-xs uppercase sticky top-0">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Time In</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Recorder</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                            {records.slice().reverse().map(r => (
                                <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                    <td className="p-3 whitespace-nowrap">{r.date}</td>
                                    <td className="p-3 font-medium">{getName(r.studentId)}</td>
                                    <td className="p-3 font-mono text-xs">{r.timeIn || '-'}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            r.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                                            r.status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                                            r.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-xs text-stone-500">{getName(r.recordedBy)}</td>
                                    <td className="p-3">
                                        <button onClick={() => handleComplaint(r)} className="text-xs text-stone-400 hover:text-red-500 underline">Report</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
                <h3 className="font-bold text-stone-800 dark:text-white mb-4 flex items-center">
                    <AlertTriangle className="mr-2 text-amber-500" /> Recent Complaints
                </h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {complaints.length === 0 ? <p className="text-stone-400 text-sm italic">No complaints filed.</p> : 
                    complaints.map(c => (
                        <div key={c.id} className="p-3 rounded-lg border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
                            <p className="font-bold text-xs text-stone-800 dark:text-white mb-1">{getName(c.studentId)}</p>
                            <p className="text-sm text-stone-600 dark:text-stone-300 italic mb-2">"{c.reason}"</p>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase bg-stone-200 dark:bg-stone-700 px-2 py-0.5 rounded text-stone-600 dark:text-stone-300">{c.status}</span>
                                {canResolve && c.status === 'PENDING' && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleResolve(c.id, true)} className="text-green-600 hover:bg-green-100 p-1 rounded"><CheckCircle size={14}/></button>
                                        <button onClick={() => handleResolve(c.id, false)} className="text-red-600 hover:bg-red-100 p-1 rounded"><XCircle size={14}/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const AccessLogs: React.FC = () => {
    const [logs, setLogs] = useState<AccessLog[]>([]);

    useEffect(() => {
        setLogs(getLogs());
    }, []);

    return (
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6">
            <h2 className="text-xl font-bold font-display text-stone-800 dark:text-white mb-4 flex items-center">
                <Shield className="mr-2 text-indigo-600" /> System Access Logs
            </h2>
            <div className="overflow-y-auto max-h-[500px] custom-scrollbar rounded-lg border border-stone-100 dark:border-stone-800">
                <table className="w-full text-sm text-left">
                    <thead className="bg-stone-100 dark:bg-stone-800 text-xs uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-3 font-semibold text-stone-600 dark:text-stone-300">Time</th>
                            <th className="p-3 font-semibold text-stone-600 dark:text-stone-300">User ID</th>
                            <th className="p-3 font-semibold text-stone-600 dark:text-stone-300">Action</th>
                            <th className="p-3 font-semibold text-stone-600 dark:text-stone-300">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono text-xs bg-stone-50/50 dark:bg-stone-900/50">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-white dark:hover:bg-stone-800 transition-colors">
                                <td className="p-3 text-stone-500 dark:text-stone-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{log.userId}</td>
                                <td className="p-3 text-stone-800 dark:text-stone-200 font-semibold">{log.action}</td>
                                <td className="p-3 text-stone-600 dark:text-stone-400">{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

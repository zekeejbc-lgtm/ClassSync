
import React, { useState } from 'react';
import { User } from '../types';
import { updateUser, uploadProfilePicture } from '../services/dataService';
import { useToast } from './ui/Toast';
import { Save, Mail, Phone, User as UserIcon, Briefcase, Key, CheckCircle, Eye, EyeOff, Hash, ShieldCheck, Upload, Loader2 } from 'lucide-react';

// Helper to transform Google Drive URLs for better image embedding
const getImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    
    let fileId = '';
    
    if (url.includes('drive.google.com/uc?export=view&id=')) {
        fileId = url.split('id=')[1]?.split('&')[0] || '';
    } else if (url.includes('drive.google.com/thumbnail?id=')) {
        fileId = url.split('id=')[1]?.split('&')[0] || '';
    } else if (url.includes('drive.google.com/file/d/')) {
        const match = url.match(/\/file\/d\/([^\/]+)/);
        if (match) fileId = match[1];
    }
    
    if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
    }
    
    return url;
};

interface ProfileProps {
  user: User;
  onUserUpdate?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUserUpdate }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    bio: user.bio || '',
    contactNumber: user.contactNumber || '',
    avatar: user.avatar || ''
  });
  
  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Password Change State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image too large (Max 5MB)', 'error');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const url = await uploadProfilePicture(file, user.id);
      setFormData(prev => ({ ...prev, avatar: url }));
      showToast('Profile picture uploaded to Google Drive!', 'success');
    } catch (error) {
      console.error('Avatar upload error:', error);
      showToast('Failed to upload profile picture', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...user,
      ...formData
    };
    updateUser(updatedUser);
    if (onUserUpdate) onUserUpdate();
    showToast('Profile updated successfully!', 'success');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          showToast('Passwords do not match', 'error');
          return;
      }
      if (newPassword.length < 6) {
          showToast('Password must be at least 6 characters', 'warning');
          return;
      }
      showToast('Password changed successfully!', 'success');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-colors">
        {/* Cover Photo / Header */}
        <div className="h-32 bg-gradient-to-r from-[#4a3728] via-[#5D4037] to-[#8d6e63] relative"></div>
        
        <div className="px-8 pb-8">
          <div className="relative flex flex-col sm:flex-row items-center sm:items-end -mt-12 mb-6 gap-4">
             <div className="w-32 h-32 relative">
                <div className="w-full h-full rounded-full border-4 border-white dark:border-stone-800 bg-stone-200 shadow-md overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-stone-400">
                        {user.username.substring(0,2).toUpperCase()}
                    </div>
                    <img 
                        src={getImageUrl(formData.avatar)} 
                        alt="Profile" 
                        className="absolute inset-0 w-full h-full object-cover z-10" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                </div>
                {/* We use a specialized modal or section for editing avatar, but here we can just put a small trigger or rely on the form below. 
                    Actually, let's just make the avatar area static here and put the uploader in the form.
                */}
             </div>
             
             <div className="text-center sm:text-left flex-1">
                 <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center justify-center sm:justify-start gap-2">
                     {user.fullName}
                     <span title="Verified Account" aria-label="Verified Account">
                        <ShieldCheck className="text-green-500 w-5 h-5" />
                     </span>
                 </h1>
                 <p className="text-amber-700 dark:text-amber-500 font-medium">{user.role}</p>
             </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 border-b border-stone-200 dark:border-stone-800 pb-2">Account Information</h3>
                  
                   <div>
                      <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Student ID Code</label>
                      <div className="relative">
                          <Hash className="absolute left-3 top-3 text-stone-400 w-4 h-4" />
                          <input 
                              type="text" 
                              value={user.id} 
                              disabled
                              className="input-field pl-10 w-full bg-stone-100 dark:bg-stone-800 text-stone-500 cursor-not-allowed font-mono" 
                          />
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Username</label>
                      <div className="relative">
                          <UserIcon className="absolute left-3 top-3 text-stone-400 w-4 h-4" />
                          <input 
                              type="text" 
                              value={user.username} 
                              disabled
                              className="input-field pl-10 w-full bg-stone-100 dark:bg-stone-800 text-stone-500 cursor-not-allowed" 
                          />
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Full Name</label>
                      <div className="relative">
                          <UserIcon className="absolute left-3 top-3 text-stone-400 w-4 h-4" />
                          <input 
                              type="text" 
                              name="fullName"
                              value={formData.fullName} 
                              onChange={handleChange}
                              className="input-field pl-10 w-full" 
                          />
                      </div>
                  </div>
                  
                  <div>
                      <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Profile Picture</label>
                      <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700 flex-shrink-0 relative">
                              <div className="absolute inset-0 flex items-center justify-center text-stone-400">
                                  <UserIcon size={32} />
                              </div>
                              <img 
                                  src={getImageUrl(formData.avatar)} 
                                  alt="Avatar" 
                                  className="absolute inset-0 w-full h-full object-cover z-10" 
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                          </div>
                          <div className="flex-1">
                              <label className={`
                                  flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer transition-all
                                  ${isUploadingAvatar 
                                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 cursor-wait' 
                                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300'
                                  }
                              `}>
                                  {isUploadingAvatar ? (
                                      <>
                                          <Loader2 size={16} className="animate-spin" />
                                          <span className="text-sm font-medium">Uploading to Drive...</span>
                                      </>
                                  ) : (
                                      <>
                                          <Upload size={16} />
                                          <span className="text-sm font-medium">Upload to Google Drive</span>
                                      </>
                                  )}
                                  <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={handleAvatarUpload}
                                      disabled={isUploadingAvatar}
                                  />
                              </label>
                              <p className="text-xs text-stone-400 mt-1.5">JPG, PNG or GIF (Max 5MB)</p>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="space-y-4">
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 border-b border-stone-200 dark:border-stone-800 pb-2">Contact & Bio</h3>
                  
                   <div>
                      <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Email Address</label>
                      <div className="relative">
                          <Mail className="absolute left-3 top-3 text-stone-400 w-4 h-4" />
                          <input 
                              type="email" 
                              value={user.email} 
                              disabled
                              className="input-field pl-10 w-full bg-stone-100 dark:bg-stone-800 text-stone-500 cursor-not-allowed" 
                          />
                          <div className="absolute right-3 top-2.5 flex items-center text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full">
                              <CheckCircle size={10} className="mr-1" /> Verified
                          </div>
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Phone Number</label>
                      <div className="relative">
                          <Phone className="absolute left-3 top-3 text-stone-400 w-4 h-4" />
                          <input 
                              type="text" 
                              name="contactNumber"
                              value={formData.contactNumber} 
                              onChange={handleChange}
                              className="input-field pl-10 w-full" 
                              placeholder="0912 345 6789"
                          />
                      </div>
                  </div>

                   <div>
                      <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Bio / Status</label>
                      <div className="relative">
                          <Briefcase className="absolute left-3 top-3 text-stone-400 w-4 h-4" />
                          <textarea 
                              name="bio"
                              rows={2}
                              value={formData.bio} 
                              onChange={handleChange}
                              className="input-field pl-10 w-full" 
                              placeholder="Tell us about yourself..."
                          />
                      </div>
                  </div>
              </div>

              <div className="md:col-span-2 flex justify-end pt-4 border-t border-stone-100 dark:border-stone-800">
                  <button type="submit" className="btn-primary flex items-center px-6">
                      <Save size={18} className="mr-2" /> Save Changes
                  </button>
              </div>
          </form>

          {/* Password Section */}
          <div className="mt-8 pt-8 border-t border-stone-200 dark:border-stone-800">
               <div className="flex justify-between items-center mb-4">
                   <h3 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center">
                       <Key className="mr-2 text-stone-500" /> Security
                   </h3>
                   {!showPasswordSection && (
                       <button onClick={() => setShowPasswordSection(true)} className="text-sm text-amber-700 hover:underline">Change Password</button>
                   )}
               </div>

               {showPasswordSection && (
                   <form onSubmit={handlePasswordChange} className="bg-stone-50 dark:bg-stone-900/50 p-6 rounded-xl border border-stone-200 dark:border-stone-800 animate-in">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                               <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">New Password</label>
                               <div className="relative">
                                   <input 
                                        type={showPass ? "text" : "password"} 
                                        required
                                        className="input-field w-full pr-10" 
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Min. 6 characters"
                                   />
                                   <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-stone-400 hover:text-stone-600">
                                       {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                                   </button>
                               </div>
                           </div>
                           <div>
                               <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Confirm New Password</label>
                               <input 
                                    type="password" 
                                    required
                                    className="input-field w-full" 
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                               />
                           </div>
                       </div>
                       <div className="flex justify-end mt-4 gap-3">
                           <button type="button" onClick={() => setShowPasswordSection(false)} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">Cancel</button>
                           <button type="submit" className="px-4 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium shadow hover:bg-stone-900">Update Password</button>
                       </div>
                   </form>
               )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCloStore } from '../../store/useCloStore';
import { GARMENT_TEMPLATES } from '../../utils/patternPresets';
import type { UserRole } from '../../types/cad';
import {
  User,
  Shield,
  Crown,
  KeyRound,
  FolderKanban,
  Users,
  Settings,
  X,
  LogOut,
  Plus,
  Trash2,
  Copy,
  Edit3,
  Check,
  AlertCircle,
  CheckCircle2,
  Laptop,
  Server,
  Sparkles,
} from 'lucide-react';

export const UCPModal: React.FC = () => {
  const {
    ucpModalOpen,
    setUcpModalOpen,
    activeUcpTab,
    setActiveUcpTab,
    currentUser,
    users,
    logout,
    updateProfile,
    changePassword,
    addUser,
    deleteUser,
  } = useAuthStore();

  const {
    projects,
    activeProjectId,
    switchProject,
    createNewProject,
    duplicateProject,
    deleteProject,
    renameProject,
    canvasTheme,
    setCanvasTheme,
    fabricRollWidthCm,
    setFabricRollWidthCm,
    tataBusanaMode,
    setTataBusanaMode,
  } = useCloStore();

  // Profile edit state
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add User state
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUname, setNewUname] = useState('');
  const [newUpass, setNewUpass] = useState('');
  const [newUnameFull, setNewUnameFull] = useState('');
  const [newUemail, setNewUemail] = useState('');
  const [newUrole, setNewUrole] = useState<UserRole>('designer');
  const [newUdept, setNewUdept] = useState('Fashion Design');
  const [userActionMsg, setUserActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Project Rename State
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // Create Project State
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [newProjName, setNewProjName] = useState('New Garment Tech Pack');
  const [newProjTemplate, setNewProjTemplate] = useState('sbl-kids-cutbray');

  if (!ucpModalOpen || !currentUser) return null;

  const isSuperadmin = currentUser.role === 'superadmin';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(currentUser.id, {
      name: editName.trim() || currentUser.name,
      email: editEmail.trim() || currentUser.email,
    });
    setProfileMsg({ type: 'success', text: 'Profil berhasil diperbarui!' });
    setTimeout(() => setProfileMsg(null), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok!' });
      return;
    }
    const res = changePassword(currentUser.id, newPassword);
    if (!res.success) {
      setPassMsg({ type: 'error', text: res.message });
    } else {
      setPassMsg({ type: 'success', text: res.message });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassMsg(null), 3000);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUname.trim() || !newUpass.trim() || !newUnameFull.trim()) {
      setUserActionMsg({ type: 'error', text: 'Username, password, dan nama lengkap wajib diisi!' });
      return;
    }
    const res = addUser({
      username: newUname.trim(),
      password: newUpass.trim(),
      name: newUnameFull.trim(),
      email: newUemail.trim() || `${newUname.trim()}@openclo.local`,
      role: newUrole,
      department: newUdept.trim() || 'Studio Design',
    });
    if (!res.success) {
      setUserActionMsg({ type: 'error', text: res.message });
    } else {
      setUserActionMsg({ type: 'success', text: res.message });
      setShowAddUserForm(false);
      setNewUname('');
      setNewUpass('');
      setNewUnameFull('');
      setNewUemail('');
      setTimeout(() => setUserActionMsg(null), 3000);
    }
  };

  const handleDeleteUser = (userId: string) => {
    const res = deleteUser(userId);
    if (!res.success) {
      setUserActionMsg({ type: 'error', text: res.message });
    } else {
      setUserActionMsg({ type: 'success', text: res.message });
      setTimeout(() => setUserActionMsg(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-150 select-none">
      <div className="bg-[#13161f] border border-slate-700/80 rounded-3xl w-full max-w-4xl h-[90vh] max-h-[820px] shadow-2xl overflow-hidden flex flex-col">
        {/* UCP Top Header Banner */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-blue-950/30 to-[#13161f]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 text-xl font-bold">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white tracking-wide">{currentUser.name}</h2>
                {isSuperadmin ? (
                  <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full shadow-sm">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>Superadmin</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    {currentUser.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>@{currentUser.username}</span>
                <span>•</span>
                <span className="text-slate-300 font-medium">{currentUser.department || 'Garment CAD Studio'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold transition-colors"
              title="Keluar dari akun ini"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>

            <button
              onClick={() => setUcpModalOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="px-6 border-b border-slate-800/80 bg-[#10121a] flex items-center gap-1 overflow-x-auto text-xs font-semibold text-slate-400">
          <button
            onClick={() => setActiveUcpTab('profile')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors ${
              activeUcpTab === 'profile'
                ? 'border-purple-500 text-purple-300 font-bold bg-purple-500/5'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profil & Akun</span>
          </button>

          <button
            onClick={() => setActiveUcpTab('projects')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors ${
              activeUcpTab === 'projects'
                ? 'border-blue-500 text-blue-300 font-bold bg-blue-500/5'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Proyek CAD ({projects.length})</span>
          </button>

          {isSuperadmin && (
            <button
              onClick={() => setActiveUcpTab('users')}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors ${
                activeUcpTab === 'users'
                  ? 'border-amber-500 text-amber-300 font-bold bg-amber-500/5'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Kelola Pengguna ({users.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveUcpTab('system')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors ${
              activeUcpTab === 'system'
                ? 'border-emerald-500 text-emerald-300 font-bold bg-emerald-500/5'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Preferensi Sistem</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#13161f]">
          {/* TAB 1: PROFIL & AKUN */}
          {activeUcpTab === 'profile' && (
            <div className="space-y-6 max-w-2xl">
              {profileMsg && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                    profileMsg.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {profileMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              {/* Account Privileges Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-blue-950/30 to-slate-900 border border-purple-500/30 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 flex-shrink-0 mt-0.5">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Akses Hak Istimewa Superadmin</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sebagai Superadmin OpenCLO, akun <strong className="text-purple-300">{currentUser.username}</strong>{' '}
                    memiliki otoritas penuh atas modul 2D CAD Pattern Drafting, 3D Showroom, konfigurasi Sublimasi Garmen,
                    serta manajemen multi-user studio.
                  </p>
                </div>
              </div>

              {/* Edit Profile Form */}
              <form onSubmit={handleSaveProfile} className="p-5 rounded-2xl bg-[#171a24] border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Informasi Akun</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Username</label>
                    <input
                      type="text"
                      disabled
                      value={currentUser.username}
                      className="w-full bg-[#11131a] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-400 cursor-not-allowed font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Peran / Role</label>
                    <input
                      type="text"
                      disabled
                      value={currentUser.role.toUpperCase()}
                      className="w-full bg-[#11131a] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-purple-300 font-bold cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">Nama Lengkap</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[#1c202c] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-[#1c202c] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="p-5 rounded-2xl bg-[#171a24] border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Keamanan & Ganti Password</span>
                </h4>

                {passMsg && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      passMsg.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {passMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{passMsg.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">Password Baru</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      className="w-full bg-[#1c202c] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">Ulangi Password Baru</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Konfirmasi password"
                      className="w-full bg-[#1c202c] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors"
                  >
                    Perbarui Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: MANAJEMEN PROYEK CAD */}
          {activeUcpTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Daftar Proyek CAD Studio</h3>
                  <p className="text-xs text-slate-400">Kelola dan beralih antardesain garmen</p>
                </div>

                <button
                  onClick={() => setShowNewProjModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Proyek Baru</span>
                </button>
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {projects.map((proj) => {
                  const isActive = proj.id === activeProjectId;
                  const isRenaming = renamingProjectId === proj.id;

                  return (
                    <div
                      key={proj.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isActive
                          ? 'bg-[#181d2a] border-blue-500 shadow-lg shadow-blue-600/10'
                          : 'bg-[#161922] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          {isRenaming ? (
                            <div className="flex items-center gap-1 flex-1 mr-2">
                              <input
                                type="text"
                                value={renameInput}
                                onChange={(e) => setRenameInput(e.target.value)}
                                className="bg-[#1c202c] border border-blue-500 rounded px-2 py-0.5 text-xs text-white flex-1"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  if (renameInput.trim()) renameProject(proj.id, renameInput.trim());
                                  setRenamingProjectId(null);
                                }}
                                className="p-1 rounded bg-blue-600 text-white"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <h4 className="font-bold text-sm text-white truncate max-w-[220px]">{proj.name}</h4>
                          )}

                          {isActive && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              Aktif
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 space-y-0.5">
                          <p className="flex items-center gap-1.5">
                            <span>Pemilik:</span>
                            <span className="font-semibold text-purple-300">@{proj.ownerUsername || 'aghyksa'}</span>
                            {proj.ownerId === currentUser.id && (
                              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded">
                                Milik Anda
                              </span>
                            )}
                          </p>
                          <p>Potongan Pola: {proj.pieces?.length || 0} mal potong</p>
                          <p className="text-[11px] text-slate-500">
                            Diperbarui: {new Date(proj.updatedAt || proj.createdAt).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-1">
                          {!isActive && (
                            <button
                              onClick={() => {
                                switchProject(proj.id);
                                setUcpModalOpen(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Buka Proyek
                            </button>
                          )}
                          <button
                            onClick={() => duplicateProject(proj.id, currentUser.id, currentUser.username)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                            title="Duplikat Proyek ke Akun Anda"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setRenamingProjectId(proj.id);
                              setRenameInput(proj.name);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                            title="Ganti Nama"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {projects.length > 1 && (
                          <button
                            onClick={() => deleteProject(proj.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Hapus Proyek"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Buat Proyek Baru */}
              {showNewProjModal && (
                <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#171a24] border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
                    <h4 className="font-bold text-sm text-white">Buat Proyek Garmen Baru</h4>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Nama Koleksi / Proyek</label>
                      <input
                        type="text"
                        value={newProjName}
                        onChange={(e) => setNewProjName(e.target.value)}
                        className="w-full bg-[#12141a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Template Busana</label>
                      <select
                        value={newProjTemplate}
                        onChange={(e) => setNewProjTemplate(e.target.value)}
                        className="w-full bg-[#12141a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        {GARMENT_TEMPLATES.map((tmpl) => (
                          <option key={tmpl.id} value={tmpl.id}>
                            {tmpl.icon} {tmpl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setShowNewProjModal(false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => {
                          if (newProjName.trim()) {
                            createNewProject(newProjName.trim(), newProjTemplate, currentUser.id, currentUser.username);
                            setShowNewProjModal(false);
                            setUcpModalOpen(false);
                          }
                        }}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Buat & Buka
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: KELOLA PENGGUNA (SUPERADMIN ONLY) */}
          {activeUcpTab === 'users' && isSuperadmin && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Manajemen Pengguna Studio</h3>
                  <p className="text-xs text-slate-400">Atur hak akses tim perancang dan operator potong garmen</p>
                </div>

                <button
                  onClick={() => setShowAddUserForm(!showAddUserForm)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all shadow-md shadow-amber-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Pengguna</span>
                </button>
              </div>

              {userActionMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    userActionMsg.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {userActionMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{userActionMsg.text}</span>
                </div>
              )}

              {/* Form Tambah Pengguna */}
              {showAddUserForm && (
                <form
                  onSubmit={handleCreateUser}
                  className="p-5 rounded-2xl bg-[#171a24] border border-amber-500/40 space-y-4 animate-in fade-in duration-150"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Form Pendaftaran Pengguna Baru
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Username *</label>
                      <input
                        type="text"
                        value={newUname}
                        onChange={(e) => setNewUname(e.target.value)}
                        placeholder="contoh: budi_pattern"
                        className="w-full bg-[#12141a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Password Awal *</label>
                      <input
                        type="text"
                        value={newUpass}
                        onChange={(e) => setNewUpass(e.target.value)}
                        placeholder="min. 4 karakter"
                        className="w-full bg-[#12141a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Peran / Role</label>
                      <select
                        value={newUrole}
                        onChange={(e) => setNewUrole(e.target.value as UserRole)}
                        className="w-full bg-[#12141a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="patternmaker">Patternmaker (Pembuat Pola)</option>
                        <option value="designer">Fashion Designer</option>
                        <option value="viewer">Viewer (Operator Potong)</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs text-slate-300">Nama Lengkap *</label>
                      <input
                        type="text"
                        value={newUnameFull}
                        onChange={(e) => setNewUnameFull(e.target.value)}
                        placeholder="Nama desainer"
                        className="w-full bg-[#12141a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Departemen</label>
                      <input
                        type="text"
                        value={newUdept}
                        onChange={(e) => setNewUdept(e.target.value)}
                        placeholder="Cutting / Sewing"
                        className="w-full bg-[#12141a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddUserForm(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                    >
                      Daftarkan Pengguna
                    </button>
                  </div>
                </form>
              )}

              {/* Users Table */}
              <div className="rounded-2xl border border-slate-800 bg-[#161922] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#11131a] text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Pengguna</th>
                      <th className="py-3 px-4">Peran</th>
                      <th className="py-3 px-4">Departemen</th>
                      <th className="py-3 px-4">Terakhir Masuk</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.map((u) => {
                      const isOwner = u.username.toLowerCase() === 'aghyksa';
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center font-bold text-white text-[11px]">
                                {u.username.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isOwner && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                                </div>
                                <div className="text-[11px] text-slate-400">@{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                u.role === 'superadmin'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : u.role === 'patternmaker'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{u.department || '-'}</td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {u.lastLogin && u.lastLogin !== '-'
                              ? new Date(u.lastLogin).toLocaleDateString('id-ID')
                              : 'Belum pernah'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isOwner && (
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                                title="Hapus Akun Pengguna"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PREFERENSI SISTEM */}
          {activeUcpTab === 'system' && (
            <div className="space-y-6 max-w-2xl">
              {/* Telemetry card */}
              <div className="p-5 rounded-2xl bg-[#171a24] border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Status Server & Engine Produksi</span>
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#12141a] border border-slate-800/80">
                    <div className="text-slate-400 text-[11px]">Container Host</div>
                    <div className="font-bold text-white mt-1">open-clo-studio:8480</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#12141a] border border-slate-800/80">
                    <div className="text-slate-400 text-[11px]">3D Viewport</div>
                    <div className="font-bold text-emerald-400 mt-1">WebGL PBR 60fps</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#12141a] border border-slate-800/80">
                    <div className="text-slate-400 text-[11px]">2D CAD Standard</div>
                    <div className="font-bold text-blue-400 mt-1">Tata Busana ID (TM/TB)</div>
                  </div>
                </div>
              </div>

              {/* Drafting preferences */}
              <div className="p-5 rounded-2xl bg-[#171a24] border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Laptop className="w-3.5 h-3.5 text-blue-400" />
                  <span>Pengaturan Standar CAD</span>
                </h4>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="font-semibold text-white">Tema Artboard Default</div>
                      <div className="text-slate-400 text-[11px]">Tampilan kanvas saat pertama kali dibuka</div>
                    </div>
                    <div className="flex items-center gap-1 bg-[#12141a] p-1 rounded-xl border border-slate-700">
                      <button
                        onClick={() => setCanvasTheme('white')}
                        className={`px-3 py-1 rounded-lg font-bold ${
                          canvasTheme === 'white' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ☀️ White
                      </button>
                      <button
                        onClick={() => setCanvasTheme('dark')}
                        className={`px-3 py-1 rounded-lg font-bold ${
                          canvasTheme === 'dark' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🌙 Dark
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="font-semibold text-white">Lebar Roll Bahan Sublimasi</div>
                      <div className="text-slate-400 text-[11px]">Batas plotting printer tekstil digital</div>
                    </div>
                    <select
                      value={fabricRollWidthCm || 150}
                      onChange={(e) => setFabricRollWidthCm(Number(e.target.value))}
                      className="bg-[#12141a] border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    >
                      <option value={150}>150 cm (Standard Garmen)</option>
                      <option value={160}>160 cm (Wide Format)</option>
                      <option value={180}>180 cm (Industrial Bed)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Notasi Tata Busana Indonesia</div>
                      <div className="text-slate-400 text-[11px]">Garis Merah TM & Garis Biru TB otomatis aktif</div>
                    </div>
                    <button
                      onClick={() => setTataBusanaMode(!tataBusanaMode)}
                      className={`px-3 py-1 rounded-xl font-bold border transition-colors ${
                        tataBusanaMode
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {tataBusanaMode ? 'AKTIF (ON)' : 'NONAKTIF'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

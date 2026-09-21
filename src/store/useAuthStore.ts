import { create } from 'zustand';
import type { UserAccount } from '../types/cad';

const USERS_STORAGE_KEY = 'openclo_auth_users_v2';
const SESSION_STORAGE_KEY = 'openclo_auth_session_user_v2';

export const SEEDED_USERS: UserAccount[] = [
  {
    id: 'user-superadmin',
    username: 'aghyksa',
    password: 'aduhlupa',
    name: 'Lyon (Aghyksa)',
    email: 'liony244@gmail.com',
    role: 'superadmin',
    department: 'Owner & Lead Architecture',
    createdAt: '2026-09-01T08:00:00Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'user-diana',
    username: 'diana',
    password: 'pattern123',
    name: 'Diana P.',
    email: 'diana@maxxbrother.id',
    role: 'patternmaker',
    department: 'Pattern Development & Sublimasi',
    createdAt: '2026-09-10T09:30:00Z',
    lastLogin: '2026-09-20T14:15:00Z',
  },
  {
    id: 'user-maxxbrother',
    username: 'maxxbrother',
    password: 'garment2026',
    name: 'PT. Maxxbrother Production',
    email: 'factory@maxxbrother.id',
    role: 'designer',
    department: 'Garment Cutting & Printing',
    createdAt: '2026-09-15T11:00:00Z',
    lastLogin: '2026-09-19T16:45:00Z',
  },
];

function loadStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure superadmin aghyksa always exists with password aduhlupa
        const hasAghyksa = parsed.some((u: UserAccount) => u.username.toLowerCase() === 'aghyksa');
        if (!hasAghyksa) {
          return [SEEDED_USERS[0], ...parsed];
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load users from localStorage:', err);
  }
  return SEEDED_USERS;
}

function loadInitialSession(users: UserAccount[]): UserAccount | null {
  try {
    const savedUserId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedUserId) {
      const found = users.find((u) => u.id === savedUserId || u.username.toLowerCase() === savedUserId.toLowerCase());
      if (found) return found;
    }
  } catch (err) {
    console.warn('Failed to load initial session:', err);
  }
  return null; // Guest by default: never auto-login!
}

interface AuthState {
  users: UserAccount[];
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  loginModalOpen: boolean;
  ucpModalOpen: boolean;
  activeUcpTab: 'profile' | 'projects' | 'users' | 'system';

  // Actions
  login: (username: string, pass: string) => { success: boolean; message?: string };
  logout: () => void;
  updateProfile: (userId: string, data: Partial<UserAccount>) => void;
  changePassword: (userId: string, newPass: string) => { success: boolean; message: string };
  addUser: (user: Omit<UserAccount, 'id' | 'createdAt' | 'lastLogin'>) => { success: boolean; message: string };
  deleteUser: (userId: string) => { success: boolean; message: string };
  setLoginModalOpen: (open: boolean) => void;
  setUcpModalOpen: (open: boolean, tab?: 'profile' | 'projects' | 'users' | 'system') => void;
  setActiveUcpTab: (tab: 'profile' | 'projects' | 'users' | 'system') => void;
}

const initialUsers = loadStoredUsers();
const initialUser = loadInitialSession(initialUsers);

export const useAuthStore = create<AuthState>((set, get) => ({
  users: initialUsers,
  currentUser: initialUser,
  isAuthenticated: initialUser !== null,
  loginModalOpen: false,
  ucpModalOpen: false,
  activeUcpTab: 'profile',

  login: (username: string, pass: string) => {
    const trimmed = username.trim().toLowerCase();
    const user = get().users.find((u) => u.username.toLowerCase() === trimmed);
    if (!user) {
      return { success: false, message: 'Username tidak ditemukan!' };
    }
    if (user.password !== pass) {
      return { success: false, message: 'Password salah!' };
    }

    const updatedUser: UserAccount = {
      ...user,
      lastLogin: new Date().toISOString(),
    };

    const updatedUsers = get().users.map((u) => (u.id === user.id ? updatedUser : u));

    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
      localStorage.setItem(SESSION_STORAGE_KEY, updatedUser.id);
    } catch {
      // ignore storage quota errors
    }

    set({
      users: updatedUsers,
      currentUser: updatedUser,
      isAuthenticated: true,
      loginModalOpen: false,
    });

    return { success: true };
  },

  logout: () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    set({
      currentUser: null,
      isAuthenticated: false,
      ucpModalOpen: false,
    });
  },

  updateProfile: (userId: string, data: Partial<UserAccount>) => {
    const updatedUsers = get().users.map((u) => {
      if (u.id === userId) {
        return { ...u, ...data };
      }
      return u;
    });

    const current = get().currentUser;
    const updatedCurrent = current && current.id === userId ? { ...current, ...data } : current;

    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    } catch {
      // ignore
    }

    set({
      users: updatedUsers,
      currentUser: updatedCurrent,
    });
  },

  changePassword: (userId: string, newPass: string) => {
    if (!newPass || newPass.trim().length < 4) {
      return { success: false, message: 'Password minimal 4 karakter!' };
    }
    const updatedUsers = get().users.map((u) => {
      if (u.id === userId) {
        return { ...u, password: newPass };
      }
      return u;
    });

    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    } catch {
      // ignore
    }

    set({ users: updatedUsers });
    return { success: true, message: 'Password berhasil diperbarui!' };
  },

  addUser: (data) => {
    const existing = get().users.find((u) => u.username.toLowerCase() === data.username.toLowerCase().trim());
    if (existing) {
      return { success: false, message: `Username "${data.username}" sudah digunakan!` };
    }

    const newUser: UserAccount = {
      ...data,
      id: `user-${Date.now()}`,
      username: data.username.trim(),
      createdAt: new Date().toISOString(),
      lastLogin: '-',
    };

    const updated = [...get().users, newUser];
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    set({ users: updated });
    return { success: true, message: `Pengguna ${newUser.name} berhasil ditambahkan!` };
  },

  deleteUser: (userId: string) => {
    const userToDelete = get().users.find((u) => u.id === userId);
    if (!userToDelete) return { success: false, message: 'User tidak ditemukan' };
    if (userToDelete.username.toLowerCase() === 'aghyksa') {
      return { success: false, message: 'Superadmin utama tidak dapat dihapus!' };
    }

    const updated = get().users.filter((u) => u.id !== userId);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    set({ users: updated });
    return { success: true, message: `User ${userToDelete.name} berhasil dihapus!` };
  },

  setLoginModalOpen: (open: boolean) => set({ loginModalOpen: open }),
  setUcpModalOpen: (open: boolean, tab?: 'profile' | 'projects' | 'users' | 'system') =>
    set((state) => ({
      ucpModalOpen: open,
      activeUcpTab: tab || state.activeUcpTab,
    })),
  setActiveUcpTab: (tab) => set({ activeUcpTab: tab }),
}));

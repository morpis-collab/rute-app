import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,

  login: (role) => {
    const users = {
      owner: { id: 1, name: 'Owner RUTE', email: 'owner@rute.coffee', role: 'owner' },
      partner: { id: 2, name: 'Partner Malinau', email: 'partner@rute.coffee', role: 'partner' },
    };
    set({ user: users[role], isAuthenticated: true });
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  switchRole: (role) => {
    const users = {
      owner: { id: 1, name: 'Owner RUTE', email: 'owner@rute.coffee', role: 'owner' },
      partner: { id: 2, name: 'Partner Malinau', email: 'partner@rute.coffee', role: 'partner' },
    };
    set({ user: users[role] });
  },
}));

export default useAuthStore;

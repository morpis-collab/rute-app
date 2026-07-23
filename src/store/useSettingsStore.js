import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function getInitialTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) return savedTheme;
  return 'light';
}

const useSettingsStore = create(
  persist(
    (set) => ({
      receiptHeaderName: 'ruang.tengah',
      receiptAddress: 'Jl. Tun Abdul Razak, Gowa',
      receiptPhone: '0812-3456-7890',
      receiptFooter: 'TERIMA KASIH\nRUTE Coffee Management System',
      receiptPaperSize: '58mm',
      theme: getInitialTheme(),
      allocationRawOps: 70,
      allocationProfit: 30,
      sidebarCollapsed: false,

      updateSettings: (newSettings) => {
        set((state) => ({ ...state, ...newSettings }));
      },
    }),
    {
      name: 'rute-settings-storage',
      version: 3,
      migrate: (persistedState) => ({
        ...persistedState,
        allocationRawOps: persistedState?.allocationRawOps ?? 70,
        allocationProfit: persistedState?.allocationProfit ?? 30,
        theme: 'light',
      }),
    }
  )
);

export default useSettingsStore;

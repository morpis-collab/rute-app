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
      allocationRawMaterials: 50,
      allocationOperations: 20,
      allocationProfit: 30,
      sidebarCollapsed: false,

      updateSettings: (newSettings) => {
        set((state) => ({ ...state, ...newSettings }));
      },
    }),
    {
      name: 'rute-settings-storage',
      version: 2,
      migrate: (persistedState) => ({
        ...persistedState,
        theme: 'light',
      }),
    }
  )
);

export default useSettingsStore;

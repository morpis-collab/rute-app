import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
  persist(
    (set) => ({
      receiptHeaderName: 'ruang.tengah',
      receiptAddress: 'Jl. Tun Abdul Razak, Gowa',
      receiptPhone: '0812-3456-7890',
      receiptFooter: 'TERIMA KASIH\nRUTE Coffee Management System',
      receiptPaperSize: '58mm',
      theme: localStorage.getItem('theme') || 'light',
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
    }
  )
);

export default useSettingsStore;

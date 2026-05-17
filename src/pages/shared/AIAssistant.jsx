import { useState, useEffect, useRef } from 'react';
import { Send, Zap, ChevronRight } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAuthStore from '../../store/useAuthStore';

// Mock hybrid feed insights
const ownerInsights = [
  { id: 1, type: 'alert', text: 'Stok Susu UHT tersisa 2 liter (kritis).', action: 'Order Supplier' },
  { id: 2, type: 'info', text: 'Profit minggu ini turun 5% karena harga cup naik.', action: 'Lihat HPP' },
  { id: 3, type: 'warning', text: '3 resi pengeluaran partner belum disetujui.', action: 'Review Resi' },
];

const partnerInsights = [
  { id: 1, type: 'alert', text: 'Stok Susu UHT sisa 2L. Cukup untuk 10 cup.', action: 'Info Owner' },
  { id: 2, type: 'info', text: 'Penjualan Kopi Susu RUTE meningkat di jam ini.', action: 'Siapkan Bahan' },
];

export default function AIAssistant() {
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [chat, setChat] = useState([]);
  const endRef = useRef(null);
  
  const insights = user?.role === 'owner' ? ownerInsights : partnerInsights;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleSend = () => {
    if (!query.trim()) return;
    setChat(prev => [...prev, { role: 'user', text: query }]);
    setQuery('');
    setTimeout(() => {
      setChat(prev => [...prev, { role: 'ai', text: 'Menganalisa data...' }]);
    }, 500);
  };

  return (
    <PageWrapper title="Business Copilot" subtitle="AI Insights & Assistant">
      <div className="flex flex-col h-[calc(100vh-140px)]">
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-4 space-y-4">
          
          {/* Actionable Insights Feed (Default View) */}
          {chat.length === 0 && (
            <div className="space-y-4 fade-in">
              <h3 className="text-[13px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Automated Insights</h3>
              {insights.map(item => (
                <div key={item.id} className="bg-white border border-[var(--color-coffee-latte)] rounded-[var(--radius-lg)] p-4 flex flex-col gap-3 shadow-sm hover:-translate-y-1 transition-all">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.type === 'alert' ? 'bg-[#fae8e0] text-[#c4705a]' : item.type === 'warning' ? 'bg-[#f5efe0] text-[#c4955a]' : 'bg-[#e0ecf5] text-[#5a7a8f]'}`}>
                      <Zap size={14} />
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed font-medium">{item.text}</p>
                  </div>
                  <div className="pl-11">
                    <button className="text-[13px] font-bold text-[var(--color-band-2)] hover:text-[var(--color-band-1)] hover:translate-x-1 transition-transform flex items-center gap-1">
                      {item.action} <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chat History */}
          {chat.length > 0 && (
            <div className="space-y-4 fade-in">
              {chat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-[var(--radius-md)] text-sm shadow-sm ${msg.role === 'user' ? 'bg-[linear-gradient(135deg,var(--color-band-1),var(--color-band-2))] text-white rounded-br-sm' : 'bg-white border border-[var(--color-coffee-latte)] text-[var(--color-text-primary)] rounded-bl-sm'}`}>
                    {msg.text}
                    <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}>Baru saja</div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Text Input (Hybrid) */}
        <div className="mt-auto border-t border-[var(--color-coffee-latte)] pt-4 pb-2 bg-[var(--color-bg-primary)] sticky bottom-0">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Tanya copilot... (Cth: Berapa profit hari ini?)"
              className="flex-1 px-4 py-3 border-2 border-[var(--color-coffee-latte)] rounded-full font-sans text-sm outline-none transition-all focus:border-[var(--color-band-2)] focus:shadow-[0_0_0_3px_rgba(150,133,94,0.1)] bg-white"
            />
            <button onClick={handleSend} className="w-11 h-11 shrink-0 rounded-full bg-[linear-gradient(135deg,var(--color-band-1),var(--color-band-2))] text-white flex items-center justify-center hover:scale-110 shadow-[0_2px_8px_rgba(122,110,79,0.3)] transition-all border-none cursor-pointer">
              <Send size={16} />
            </button>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}

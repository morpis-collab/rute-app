import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Zap, ChevronRight, Loader2, Bot, AlertTriangle } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import { getCopilotInsights, postCopilotChat } from '../../services/apiClient';
import useAuthStore from '../../store/useAuthStore';

export default function AIAssistant() {
  const [query, setQuery] = useState('');
  const [chat, setChat] = useState([]);
  const [insights, setInsights] = useState([]);
  const [source, setSource] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  
  const endRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    async function loadInsights() {
      try {
        setLoadingInsights(true);
        const data = await getCopilotInsights();
        setInsights(data.insights || []);
        setSource(data.source);
      } catch (err) {
        console.error('Failed to load copilot insights', err);
      } finally {
        setLoadingInsights(false);
      }
    }
    loadInsights();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, isTyping]);

  const handleSend = async () => {
    if (!query.trim()) return;
    const currentQuery = query;
    const history = chat.map((message) => ({
      role: message.role === 'ai' ? 'assistant' : message.role,
      text: message.text,
    }));
    setChat(prev => [...prev, { role: 'user', text: currentQuery }]);
    setQuery('');
    setIsTyping(true);

    try {
      const data = await postCopilotChat({ prompt: currentQuery, history });
      setChat(prev => [...prev, {
        role: 'ai',
        text: data.message?.text || data.message || 'Copilot belum mengembalikan jawaban.',
        source: data.source,
        providerError: data.providerError
      }]);
      if (data.insights && data.insights.length > 0) {
        setInsights(data.insights);
      }
      setSource(data.source);
    } catch {
      setChat(prev => [...prev, { role: 'ai', text: 'Maaf, terjadi kesalahan saat menghubungi Copilot.', source: 'system' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAction = (actionText) => {
    if (!actionText) return;
    const text = actionText.toLowerCase();
    if (text.includes('stok')) {
      navigate(user?.role === 'owner' ? '/owner/stock' : '/partner/stock');
    } else if (text.includes('kas')) {
      navigate(user?.role === 'owner' ? '/owner/cash' : '/partner/close-cash');
    } else if (text.includes('pengeluaran') || text.includes('resi') || text.includes('approval') || text.includes('review')) {
      navigate(user?.role === 'owner' ? '/owner/approval' : '/partner/expenses');
    } else if (text.includes('hpp') || text.includes('menu')) {
      navigate('/owner/menu-hpp');
    } else {
      navigate(user?.role === 'owner' ? '/owner/dashboard' : '/partner/sales');
    }
  };

  return (
    <PageWrapper title="Business Copilot" subtitle={`AI Insights & Assistant ${source === 'local' ? '(Rule-Based Mode)' : source === 'ai' ? '(AI Mode)' : ''}`}>
      <div className="flex flex-col h-[calc(100vh-140px)]">
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-4 space-y-4">
          
          {/* Actionable Insights Feed (Default View) */}
          {chat.length === 0 && (
            <div className="space-y-4 fade-in">
              <h3 className="text-[13px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                Automated Insights {loadingInsights && <Loader2 size={12} className="inline animate-spin ml-1" />}
              </h3>
              
              {!loadingInsights && insights.length === 0 && (
                <div className="text-center p-6 text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-xl">
                  Belum ada insight harian
                </div>
              )}

              {insights.map((item, idx) => (
                <div key={item.id || idx} className="bg-white border border-[var(--color-coffee-latte)] rounded-[var(--radius-lg)] p-4 flex flex-col gap-3 shadow-sm hover:-translate-y-1 transition-all">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.type === 'alert' ? 'bg-[#fae8e0] text-[#c4705a]' : item.type === 'warning' ? 'bg-[#f5efe0] text-[#c4955a]' : 'bg-[#e0ecf5] text-[#5a7a8f]'}`}>
                      <Zap size={14} />
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed font-medium">{item.text}</p>
                  </div>
                  {item.action && (
                    <div className="pl-11">
                      <button onClick={() => handleAction(item.action)} className="text-[13px] font-bold text-[var(--color-band-2)] hover:text-[var(--color-band-1)] hover:translate-x-1 transition-transform flex items-center gap-1">
                        {item.action} <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Chat History */}
          {chat.length > 0 && (
            <div className="space-y-4 fade-in">
              {chat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 mr-2 rounded-full bg-[var(--color-band-4)] text-[var(--color-band-1)] flex items-center justify-center shrink-0">
                      <Bot size={16} />
                    </div>
                  )}
                  <div className={`max-w-[80%] p-3.5 rounded-[var(--radius-md)] text-sm shadow-sm ${msg.role === 'user' ? 'bg-[linear-gradient(135deg,var(--color-band-1),var(--color-band-2))] text-white rounded-br-sm' : 'bg-white border border-[var(--color-coffee-latte)] text-[var(--color-text-primary)] rounded-bl-sm'}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    <div className={`text-[10px] mt-2 flex items-center gap-1 ${msg.role === 'user' ? 'text-white/70 justify-end' : 'text-[var(--color-text-muted)]'}`}>
                      {msg.role === 'ai' && msg.source && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">{msg.source}</span>}
                      {msg.role === 'ai' && msg.providerError && <span className="text-[var(--color-accent-red)] flex items-center gap-0.5" title="AI Provider Error - Menggunakan Local Fallback"><AlertTriangle size={10} /></span>}
                      Baru saja
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 mr-2 rounded-full bg-[var(--color-band-4)] text-[var(--color-band-1)] flex items-center justify-center shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white border border-[var(--color-coffee-latte)] rounded-[var(--radius-md)] rounded-bl-sm p-3.5 shadow-sm flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
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
            <button 
              onClick={handleSend} 
              disabled={isTyping || !query.trim()}
              className="w-11 h-11 shrink-0 rounded-full bg-[linear-gradient(135deg,var(--color-band-1),var(--color-band-2))] disabled:opacity-50 text-white flex items-center justify-center hover:scale-110 shadow-[0_2px_8px_rgba(122,110,79,0.3)] transition-all border-none cursor-pointer"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}

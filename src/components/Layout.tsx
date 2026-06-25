import { ReactNode, useState, useEffect } from "react";
import { ViewState, User } from "../types";
import { 
  Activity, 
  UserPlus, 
  Home, 
  LogOut, 
  ClipboardList, 
  Sparkles, 
  Wifi, 
  WifiOff, 
  ArrowRight,
  Database
} from "lucide-react";
import { isApplicationOnline, getSyncQueue } from "../lib/syncManager";
import { SyncQueueModal } from "./SyncQueueModal";

interface LayoutProps {
  children: ReactNode;
  currentView: ViewState;
  setView: (view: ViewState) => void;
  user: User;
  onLogout: () => void;
  onOpenAssistant?: () => void;
}

export function Layout({ children, currentView, setView, user, onLogout, onOpenAssistant }: LayoutProps) {
  const [online, setOnline] = useState(isApplicationOnline());
  const [pendingCount, setPendingCount] = useState(getSyncQueue().length);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [signalState, setSignalState] = useState<'good' | 'poor' | 'none'>(() => {
    return isApplicationOnline() ? 'good' : 'none';
  });

  useEffect(() => {
    const checkSignal = () => {
      if (!isApplicationOnline()) {
        setSignalState('none');
        return;
      }
      
      const conn = (navigator as any).connection;
      if (conn) {
        if (conn.effectiveType === '2g' || conn.effectiveType === '3g' || conn.rtt > 300 || conn.downlink < 1.5) {
          setSignalState('poor');
          return;
        }
      }
      setSignalState('good');
    };

    const handleSyncUpdate = () => {
      setOnline(isApplicationOnline());
      setPendingCount(getSyncQueue().length);
      checkSignal();
    };

    window.addEventListener("online", handleSyncUpdate);
    window.addEventListener("offline", handleSyncUpdate);
    window.addEventListener("stellarcare_connection_change", handleSyncUpdate);
    window.addEventListener("stellarcare_queue_update", handleSyncUpdate);

    const interval = setInterval(() => {
      checkSignal();
      if (isApplicationOnline()) {
        const rand = Math.random();
        if (rand < 0.05) {
          setSignalState('poor');
        } else {
          setSignalState('good');
        }
      }
    }, 8000);

    handleSyncUpdate();

    return () => {
      window.removeEventListener("online", handleSyncUpdate);
      window.removeEventListener("offline", handleSyncUpdate);
      window.removeEventListener("stellarcare_connection_change", handleSyncUpdate);
      window.removeEventListener("stellarcare_queue_update", handleSyncUpdate);
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { id: "dashboard" as ViewState, label: "Painel de Controle", icon: Home },
    { id: "register_patient" as ViewState, label: "Admitir Paciente", icon: UserPlus },
    {
      id: "evolution" as ViewState,
      label: "Evolução Enfermagem",
      icon: Activity,
    },
    { 
      id: "records" as ViewState, 
      label: "Registros", 
      icon: ClipboardList 
    }
  ];

  return (
    <div className="bg-[#FAF7F2] text-gray-900 font-sans min-h-screen w-full flex flex-col items-center antialiased overflow-x-hidden">
      <div className="w-full max-w-[430px] bg-white min-h-screen relative shadow-2xl border-x border-gray-100 flex flex-col">
        <header className="bg-white border-b border-gray-100 p-4 pb-2.5 flex flex-col gap-2.5 sticky top-0 z-30 w-full">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2 select-none">
              <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                <img src="/favicon.svg" alt="StellarCare Logo" className="w-[85%] h-[85%] object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-brand font-extrabold text-[15px] tracking-tight text-gray-950 leading-tight">
                    StellarCare
                  </h1>
                  {/* Sinalizador de Internet (Exclusivamente Leitor de Status, Sem Ação de Clique) */}
                  <div 
                    className="flex shrink-0 select-none items-center"
                    title={
                      signalState === "good" 
                        ? "Dispositivo Conectado (Sinal de Internet Excelente)" 
                        : signalState === "poor" 
                          ? "Sinal de Internet Ruim / Conexão Instável" 
                          : "Sem Internet / Modo Offline"
                    }
                  >
                    {signalState === "good" ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white ring-2 ring-emerald-100 flex" />
                    ) : signalState === "poor" ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white ring-2 ring-amber-100 flex animate-pulse" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white ring-2 ring-red-100 flex animate-pulse" />
                    )}
                  </div>
                </div>
                <span className="text-[9px] text-[#1D9E75] font-extrabold tracking-wider block leading-none uppercase">
                  Clínica & Assist.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <p className="text-[12px] font-black text-gray-900 leading-tight">ENF. {user.nome_completo.split(" ")[0]}</p>
                <span className="text-[9px] text-gray-400 font-bold tracking-widest block uppercase">Reg: {user.matricula}</span>
              </div>
              <button 
                onClick={onLogout} 
                className="w-11 h-11 flex items-center justify-center bg-gray-50 hover:bg-red-50 rounded-xl text-gray-500 hover:text-red-500 transition-all cursor-pointer"
                title="Desconectar"
                aria-label="Desconectar"
              >
                <LogOut className="w-5 h-5"/>
              </button>
            </div>
          </div>
          {currentView !== "records" && (
            <div className="flex justify-between items-center w-full gap-2">
              <button
                onClick={onOpenAssistant}
                className="bg-teal-50 hover:bg-teal-100 text-teal-850 text-[10px] font-extrabold py-1.5 px-3 rounded-lg flex items-center gap-1.5 active:scale-95 transition-all uppercase border border-teal-150 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                Resumo do Plantão
              </button>

              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="text-[10px] font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 py-1.5 px-2.5 border border-gray-200 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              >
                <Database className="w-3 h-3 text-teal-600" />
                Nuvem {pendingCount > 0 && <span className="ml-0.5 bg-amber-500 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded-full leading-none shrink-0">{pendingCount}</span>}
              </button>
            </div>
          )}
        </header>

        {/* Offline Warning Banner */}
        {!online && (
          <div 
            onClick={() => setIsSyncModalOpen(true)}
            className="bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-bold py-2 p-4 flex items-center justify-between cursor-pointer select-none border-b border-[#B45309] transition-all duration-200 animate-fade-in shrink-0"
            title="Clique para abrir a Central de Sincronização"
          >
            <span className="flex items-center gap-1.5 font-extrabold uppercase tracking-widest text-[9.5px]">
              <WifiOff className="w-3.5 h-3.5" /> MODO OFFLINE ATIVO {pendingCount > 0 && `(${pendingCount} pendentes)`}
            </span>
            <span className="underline uppercase tracking-widest text-[8.5px] font-black flex items-center gap-1">
              Sincronizar <ArrowRight className="w-3 h-3 text-white" />
            </span>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-28 scrollbar-hide p-4">
          {children}
        </main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-16 bg-white border-t border-gray-100 flex justify-around items-center z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)] rounded-t-2xl px-2">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex flex-col items-center justify-center py-2 rounded-xl min-w-[64px] min-h-[48px] transition-all cursor-pointer ${
                  isActive ? "text-teal-600" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl mb-0.5 transition-colors ${
                    isActive ? "bg-teal-50" : "bg-transparent"
                  }`}
                >
                  <Icon className={`w-5 h-5`} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[9px] tracking-wider uppercase font-extrabold ${isActive ? "text-teal-700" : "text-gray-400"}`}>
                  {item.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </nav>
        
        {/* Real-time Offline Sync Center Dialog Sheet */}
        <SyncQueueModal 
          isOpen={isSyncModalOpen} 
          onClose={() => setIsSyncModalOpen(false)} 
        />
      </div>
    </div>
  );
}

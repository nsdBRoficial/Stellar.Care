import { useState, useEffect } from "react";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  X,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Layers
} from "lucide-react";
import { 
  isApplicationOnline, 
  isSimulatedOffline, 
  setSimulatedOffline, 
  getSyncQueue, 
  synchronizeOfflineData,
  SyncItem,
  getSyncStatusInfo,
  resetSyncStats,
  SyncStatusDetails,
  clearAllPatientsAndMetricsFromFirestore
} from "../lib/syncManager";
import { AnimatePresence, motion } from "motion/react";

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (count: number) => void;
}

export function SyncQueueModal({ isOpen, onClose, onSyncComplete }: SyncQueueModalProps) {
  const [online, setOnline] = useState(isApplicationOnline());
  const [simulatedOffline, setSimulatedOfflineState] = useState(isSimulatedOffline());
  const [queue, setQueue] = useState<SyncItem[]>(getSyncQueue());
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [syncedCount, setSyncedCount] = useState(0);
  const [syncDetails, setSyncDetails] = useState<SyncStatusDetails>(getSyncStatusInfo());
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [adminClicks, setAdminClicks] = useState(0);
  const [showDangerZone, setShowDangerZone] = useState(false);

  const handleTitleClick = () => {
    setAdminClicks(prev => {
      const nextVal = prev + 1;
      if (nextVal >= 5) {
        setShowDangerZone(true);
      }
      return nextVal;
    });
  };

  // Poll connection state & sync queue & backoff stats in real time
  useEffect(() => {
    const handleUpdate = () => {
      setOnline(isApplicationOnline());
      setSimulatedOfflineState(isSimulatedOffline());
      setQueue(getSyncQueue());
      setSyncDetails(getSyncStatusInfo());
    };

    window.addEventListener("online", handleUpdate);
    window.addEventListener("offline", handleUpdate);
    window.addEventListener("stellarcare_connection_change", handleUpdate);
    window.addEventListener("stellarcare_queue_update", handleUpdate);
    window.addEventListener("stellarcare_sync_status_change", handleUpdate);

    // Dynamic timer to tick countdown for backoff seconds
    const intervalId = setInterval(() => {
      const details = getSyncStatusInfo();
      setSyncDetails(details);
    }, 1000);

    // Initial load
    handleUpdate();

    return () => {
      window.removeEventListener("online", handleUpdate);
      window.removeEventListener("offline", handleUpdate);
      window.removeEventListener("stellarcare_connection_change", handleUpdate);
      window.removeEventListener("stellarcare_queue_update", handleUpdate);
      window.removeEventListener("stellarcare_sync_status_change", handleUpdate);
      clearInterval(intervalId);
    };
  }, []);

  const handleSimulateToggle = () => {
    const nextVal = !simulatedOffline;
    setSimulatedOffline(nextVal);
    setSimulatedOfflineState(nextVal);
    setOnline(isApplicationOnline());
  };

  const handleForceSync = async () => {
    if (!online) {
      setSyncStatus("error");
      setErrorMessage("Não é possível sincronizar sem sinal de rede. Restabeleça a conexão primeiro.");
      return;
    }

    setSyncing(true);
    setSyncStatus("idle");
    setErrorMessage("");

    const success = await synchronizeOfflineData(
      (count) => {
        setSyncedCount(count);
        setSyncStatus("success");
        setQueue([]);
        if (onSyncComplete) {
          onSyncComplete(count);
        }
      },
      (err) => {
        setSyncStatus("error");
        setErrorMessage(err);
      }
    );

    setSyncing(false);
  };

  const handleClearDatabase = async () => {
    setIsCleaning(true);
    setSyncStatus("idle");
    setErrorMessage("");

    try {
      if (!online) {
        localStorage.removeItem("stellarcare_patients");
        localStorage.removeItem("stellarcare_metrics");
        localStorage.removeItem("stellarcare_sync_queue");
        window.location.reload();
        return;
      }

      await clearAllPatientsAndMetricsFromFirestore();
      setSyncStatus("success");
      setQueue([]);
      setShowConfirmClear(false);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setSyncStatus("error");
      setErrorMessage(err?.message || "Erro ao tentar limpar banco de dados remoto.");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center touch-none p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div 
            className="bg-[#FAF9F5] w-full max-w-[400px] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] text-gray-900 border border-gray-100 select-none overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 400 }}
          >
            
            {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200/60 p-4 bg-white pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Database className="w-4 h-4" />
            </div>
            <div onClick={handleTitleClick} className="cursor-pointer select-none group">
              <h3 className="text-sm font-black tracking-tight text-gray-900 group-hover:text-teal-700 transition-colors">Central de Sincronização</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Modo Offline & Resiliência</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Connection Overview */}
          <div className="bg-white border border-gray-100 rounded-xl p-3.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500">Status da Rede:</span>
              <div className="flex items-center gap-1.5">
                {online ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase">
                    <Wifi className="w-3.5 h-3.5 animate-pulse" /> Conectado (Online)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#D97706] bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 uppercase">
                    <WifiOff className="w-3.5 h-3.5" /> Sem Sinal (Offline)
                  </span>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg cursor-not-allowed opacity-60 mt-4">
              <input 
                type="checkbox" 
                checked={simulatedOffline} 
                onChange={() => {}} 
                disabled
                className="w-4 h-4 text-teal-600 rounded mr-1 cursor-not-allowed"
              />
              <span className="text-xs font-bold text-gray-700 tracking-tight leading-tight">
                Forçar Modo de Redundância Local (Offline)
                <span className="block text-[10px] text-gray-500 font-medium">Força o aplicativo a salvar dados localmente para redundância.</span>
              </span>
            </label>
          </div>

          {/* Active Backoff / 404 Protection Detailed Banners */}
          {syncDetails.isClientOnlyFirebaseFallback && (
            <div className="bg-sky-50 text-sky-800 border border-sky-200 p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-semibold animate-fade-in space-y-1 flex-col">
              <div className="flex gap-2.5 items-start">
                <Sparkles className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase tracking-wider text-[10px] text-sky-900 leading-tight">Modo Estático Ativo (Netlify)</p>
                  <p className="text-[11px] font-medium text-sky-700 mt-1">
                    Como o aplicativo está hospedado no Netlify (sem servidor Node), a sincronização do StellarCare opera enviando seus prontuários diretamente para o Firebase Firestore no cliente. Tudo funcionando perfeitamente!
                  </p>
                </div>
              </div>
            </div>
          )}

          {!syncDetails.endpointExists && (
            <div className="bg-red-50 text-red-800 border border-red-200 p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-semibold animate-fade-in space-y-2 flex-col">
              <div className="flex gap-2.5 items-start">
                <AlertTriangle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase tracking-wider text-[10px] text-red-900 leading-tight">AutoSync Pausado (Erro de Endpoint)</p>
                  <p className="text-[11px] font-medium text-red-700 mt-1">
                    Detectado que o endpoint /api/clinical-assistant retornou 404 (Não Encontrado). O loop de sincronização automática foi bloqueado por segurança para poupar CPU e tráfego.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetSyncStats();
                  setSyncStatus("idle");
                  setErrorMessage("");
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-lg uppercase tracking-wider self-center transition-all cursor-pointer"
              >
                Tentar Forçar Sincronização (Resetar Sinais)
              </button>
            </div>
          )}

          {syncDetails.endpointExists && syncDetails.isBackoffActive && syncDetails.backoffSecondsLeft > 0 && (
            <div className="bg-amber-50 text-amber-800 border border-amber-250 p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-semibold animate-fade-in space-y-2 flex-col">
              <div className="flex gap-2.5 items-start">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="font-extrabold uppercase tracking-wider text-[10px] text-amber-900 leading-tight">Backoff Exponencial Ativo</p>
                  <p className="text-[11px] font-medium text-amber-700 mt-1">
                    Aguardando intervalo de segurança clínica. Próxima tentativa automática regulada em <strong className="text-amber-950 font-black">{syncDetails.backoffSecondsLeft}s</strong>. (Falhar repetidamente aciona um atraso de 5 minutos).
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetSyncStats();
                  setSyncStatus("idle");
                  setErrorMessage("");
                }}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-lg uppercase tracking-wider self-center transition-all cursor-pointer"
              >
                Resetar Intervalo (Ignorar Backoff)
              </button>
            </div>
          )}

          {/* Sync Status Banner response */}
          {syncStatus === "success" && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-250 p-3 rounded-xl flex items-start gap-2.5 text-xs font-semibold animate-fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold">Sincronização concluída!</p>
                <p className="text-[11px] font-medium text-emerald-700 mt-1">
                  Enviados {syncedCount} prontuários do plantão com sucesso para a nuvem.
                </p>
              </div>
            </div>
          )}

          {syncStatus === "error" && !syncDetails.isBackoffActive && (
            <div className="bg-red-50 text-red-800 border border-red-200 p-3 rounded-xl flex items-start gap-2.5 text-xs font-semibold animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold">Falha de Comunicação</p>
                <p className="text-[11px] font-medium text-red-700 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Queue Title */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-extrabold tracking-wider text-gray-400 uppercase flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Fila de Envio ({queue.length})
              </span>
              {queue.length > 0 && (
                <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md animate-pulse">
                  Salvo Local (Offline)
                </span>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-6 text-center text-gray-400 space-y-1">
                <CheckCircle className="w-8 h-8 text-gray-200 mx-auto" />
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Tudo Sincronizado</p>
                <p className="text-[10px] font-medium text-gray-400">Nenhum registro ou evolução pendente localmente.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {queue.map((item) => (
                  <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-2.5 flex items-start gap-2.5 text-left shadow-xs">
                    <div className="p-1 px-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider shrink-0 mt-0.5 bg-amber-50 text-amber-700 border border-amber-100">
                      OFF
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-gray-800 leading-tight block truncate">
                        {item.description}
                      </p>
                      <span className="text-[9px] text-gray-400 font-bold block mt-1 uppercase flex items-center gap-1 leading-none">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zona de Perigo - Limpeza de Pacientes - Oculta, apenas para admin */}
          {showDangerZone && (
            <div className="bg-red-50/60 border border-red-150 rounded-xl p-3.5 space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
              <div>
                <p className="text-[10px] font-black uppercase text-red-800 tracking-wider">Zona de Manutenção / Perigo</p>
                <p className="text-[11px] text-red-700 font-medium leading-relaxed">
                  Apaga permanentemente todos os prontuários de pacientes e evoluções de sinais vitais, tanto do dispositivo local quanto do banco de dados remoto (Firestore).
                </p>
              </div>
              
              {!showConfirmClear ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] py-2.5 border border-red-700 rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Limpar Todo o Banco de Dados
                </button>
              ) : (
                <div className="border border-red-200 bg-red-100/50 p-2.5 rounded-lg space-y-2 animate-pulse">
                  <p className="text-[10px] font-black text-red-900 uppercase tracking-widest leading-tight text-center">
                    Tem certeza absoluta? Esta ação é irreversível!
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmClear(false)}
                      disabled={isCleaning}
                      className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-extrabold text-[10px] py-2 rounded-lg border border-gray-300 uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleClearDatabase}
                      disabled={isCleaning}
                      className="flex-1 bg-red-650 hover:bg-red-700 text-white font-extrabold text-[10px] py-2 rounded-lg border border-red-800 uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 animate-shimmer"
                    >
                      {isCleaning ? "Limpando..." : "Confirmar Exclusão"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Action Button Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 min-h-[44px] border border-gray-250 text-gray-700 font-bold hover:bg-gray-50 rounded-xl transition cursor-pointer text-xs uppercase"
          >
            Fechar
          </button>
          
          <button
            onClick={handleForceSync}
            disabled={syncing || queue.length === 0}
            className="flex-1 bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-3 min-h-[44px] font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sincronizar
              </>
            )}
          </button>
        </div>

      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}

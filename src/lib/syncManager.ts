import { Patient, MetricPoint, PatientStatus } from "../types";
// Importar referências, métodos de criação, listagem e atualização de documentos do Firestore
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
// Importar a instância ativa de banco de dados Cloud Firestore e o auth configurado do projeto
import { db, auth, handleFirestoreError, OperationType } from "./firebase";

export interface SyncItem {
  id: string;
  type: "ADD_PATIENT" | "ADD_EVOLUTION" | "DISCHARGE_PATIENT";
  description: string;
  data: any;
  timestamp: string;
  synced: boolean;
}

// Check real network status
const getRealOnlineStatus = (): boolean => {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
};

// Simulated connection state
export const isSimulatedOffline = (): boolean => {
  return false;
};

export const setSimulatedOffline = (offline: boolean) => {
  localStorage.setItem("stellarcare_simulated_offline", "false");
  // Dispatch a custom event to notify listeners instantly
  window.dispatchEvent(new Event("stellarcare_connection_change"));
};

// Computed active connection state
export const isApplicationOnline = (): boolean => {
  return getRealOnlineStatus();
};

// -- Patients & Metrics Store with localStorage --
export const getLocalPatients = (initial: Patient[]): Patient[] => {
  try {
    const item = localStorage.getItem("stellarcare_patients");
    if (!item) return initial;
    const loaded: Patient[] = JSON.parse(item);
    const loadedIds = new Set(loaded.map((p) => p.id));
    const missing = initial.filter((p) => !loadedIds.has(p.id));
    if (missing.length > 0) {
      const merged = [...loaded, ...missing];
      localStorage.setItem("stellarcare_patients", JSON.stringify(merged));
      return merged;
    }
    return loaded;
  } catch {
    return initial;
  }
};

export const saveLocalPatients = (patients: Patient[]) => {
  localStorage.setItem("stellarcare_patients", JSON.stringify(patients));
};

export const getLocalMetrics = (
  initial: Record<string, MetricPoint[]>,
): Record<string, MetricPoint[]> => {
  try {
    const item = localStorage.getItem("stellarcare_metrics");
    if (!item) return initial;
    const loaded: Record<string, MetricPoint[]> = JSON.parse(item);
    let changed = false;
    for (const key in initial) {
      if (!loaded[key]) {
        loaded[key] = initial[key];
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem("stellarcare_metrics", JSON.stringify(loaded));
    }
    return loaded;
  } catch {
    return initial;
  }
};

export const saveLocalMetrics = (metrics: Record<string, MetricPoint[]>) => {
  localStorage.setItem("stellarcare_metrics", JSON.stringify(metrics));
};

// -- Sync Queue Management --
export const getSyncQueue = (): SyncItem[] => {
  try {
    const item = localStorage.getItem("stellarcare_sync_queue");
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
};

export const saveSyncQueue = (queue: SyncItem[]) => {
  localStorage.setItem("stellarcare_sync_queue", JSON.stringify(queue));
  window.dispatchEvent(new Event("stellarcare_queue_update"));
};

export const addToSyncQueue = (
  type: "ADD_PATIENT" | "ADD_EVOLUTION" | "DISCHARGE_PATIENT",
  description: string,
  data: any,
) => {
  const queue = getSyncQueue();
  const newItem: SyncItem = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    description,
    data,
    timestamp: new Date().toISOString(),
    synced: false,
  };
  queue.push(newItem);
  saveSyncQueue(queue);
};

export const clearSyncedQueueItems = (syncedIds: string[]) => {
  const queue = getSyncQueue();
  const updated = queue.filter((item) => !syncedIds.includes(item.id));
  saveSyncQueue(updated);
};

// --- Exponential Backoff & Retry State for Resilient AutoSync ---
let retryCount = 0;
const MAX_RETRIES = 3;
let isBackoffActive = false;
let backoffUntil: number | null = null;
let endpointExists = true; // Caches whether the endpoint is functional or a 404
export let isClientOnlyFirebaseFallback =
  localStorage.getItem("stellarcare_client_only_firebase_fallback") === "true";

export interface SyncStatusDetails {
  retryCount: number;
  isBackoffActive: boolean;
  backoffSecondsLeft: number;
  endpointExists: boolean;
  isClientOnlyFirebaseFallback: boolean;
  lastError: string | null;
}

export const getSyncStatusInfo = (): SyncStatusDetails => {
  const now = Date.now();
  let backoffSecondsLeft = 0;
  if (backoffUntil && backoffUntil > now) {
    backoffSecondsLeft = Math.ceil((backoffUntil - now) / 1000);
  }
  return {
    retryCount,
    isBackoffActive:
      isBackoffActive || (backoffUntil !== null && backoffUntil > now),
    backoffSecondsLeft,
    endpointExists,
    isClientOnlyFirebaseFallback,
    lastError: localStorage.getItem("stellarcare_last_sync_error"),
  };
};

export const resetSyncStats = () => {
  retryCount = 0;
  isBackoffActive = false;
  backoffUntil = null;
  endpointExists = true;
  isClientOnlyFirebaseFallback = false;
  localStorage.removeItem("stellarcare_client_only_firebase_fallback");
  localStorage.removeItem("stellarcare_last_sync_error");
  window.dispatchEvent(new Event("stellarcare_sync_status_change"));
};

// Realiza a chamada de sincronização offline real para salvar pacientes e evoluções no banco do Cloud Firestore
export const synchronizeOfflineData = async (
  // Callback disparado em caso de sucesso absoluto enviando a contagem de registros integrados
  onSuccess: (syncedCount: number) => void,
  // Callback disparado em caso de falha de conexão ou rede recebendo a mensagem descritiva
  onFailure: (error: string) => void,
  // Flag para background sync
  isBackground: boolean = false,
): Promise<boolean> => {
  // Coleta a fila pendente de registros de ações capturadas em modo offline
  const queue = getSyncQueue();
  // Se não houver itens pendentes para processar, finaliza sem realizar operações
  if (queue.length === 0) {
    // Retorna falso indicando que não houve sincronização necessária
    return false;
  }

  if (!isApplicationOnline()) {
    onFailure("Sem conexão de rede disponível");
    return false;
  }

  try {
    console.log(
      `[FirestoreSync] Iniciando sincronização real de ${queue.length} registros offline...`,
    );
    const syncedIds: string[] = [];

    // processamento sequencial para assegurar a ordem cronológica
    for (const item of queue) {
      if (item.type === "ADD_PATIENT") {
        const patient = item.data;
        const cleanPatient = {
          id: patient.id,
          nome_ficticio: patient.nome_ficticio || "",
          data_nascimento: patient.data_nascimento || "",
          idade_aparente: Number(patient.idade_aparente || 0),
          sexo: patient.sexo || "M",
          numero_leito: String(patient.numero_leito || ""),
          setor: patient.setor || "",
          diagnostico_principal: patient.diagnostico_principal || "",
          data_internacao: patient.data_internacao || new Date().toISOString(),
          medico_responsavel: patient.medico_responsavel || "",
          tecnico_responsavel: patient.tecnico_responsavel || null,
          tecnicos_adicionais: patient.tecnicos_adicionais || [],
          alergias: patient.alergias || "",
          convenio: patient.convenio || "",
          observacoes: patient.observacoes || "",
          status: patient.status || "internado",
          criado_em: patient.criado_em || new Date().toISOString(),
        };

        Object.keys(cleanPatient).forEach((key) => {
          if (
            (cleanPatient as any)[key] === undefined ||
            (cleanPatient as any)[key] === null
          ) {
            delete (cleanPatient as any)[key];
          }
        });

        const docRef = doc(db, "patients", patient.id);
        try {
          await setDoc(docRef, cleanPatient);
          syncedIds.push(item.id);
        } catch (err: any) {
          console.error(
            `Erro ao sincronizar admissão de paciente ${patient.id}:`,
            err,
          );
          handleFirestoreError(
            err,
            OperationType.WRITE,
            `patients/${patient.id}`,
          );
        }
      } else if (item.type === "ADD_EVOLUTION") {
        const { patientId, metric } = item.data;
        const metricId =
          metric.id ||
          `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const cleanMetric = {
          id: metricId,
          paciente_id: patientId,
          time: String(metric.time || "").slice(0, 5),
          temp: Math.max(30.0, Math.min(45.0, Number(metric.temp) || 36.5)),
          spo2: Math.max(0, Math.min(100, Number(metric.spo2) || 98)),
          pain: Math.max(0, Math.min(10, Number(metric.pain) || 0)),
          sys: Math.max(0, Math.min(300, Number(metric.sys) || 120)),
          dia: Math.max(0, Math.min(200, Number(metric.dia) || 80)),
          fc:
            metric.fc !== undefined
              ? Math.max(0, Math.min(300, Number(metric.fc)))
              : 80,
          fr:
            metric.fr !== undefined
              ? Math.max(0, Math.min(100, Number(metric.fr)))
              : 16,
          diurese_anomalia: !!metric.diurese_anomalia,
          evolutionData: metric.evolutionData || {},
          timestamp: metric.timestamp || new Date().toISOString(),
        };

        Object.keys(cleanMetric).forEach((key) => {
          if ((cleanMetric as any)[key] === undefined) {
            delete (cleanMetric as any)[key];
          }
        });

        const docRef = doc(db, "patients", patientId, "metrics", metricId);
        try {
          await setDoc(docRef, cleanMetric);
          syncedIds.push(item.id);
        } catch (err: any) {
          console.error(
            `Erro ao sincronizar evolução do paciente ${patientId}:`,
            err,
          );
          handleFirestoreError(
            err,
            OperationType.WRITE,
            `patients/${patientId}/metrics/${metricId}`,
          );
        }
      } else if (item.type === "DISCHARGE_PATIENT") {
        const {
          patientId,
          status,
          medicoAlta,
          observacoesAlta,
          unidadeTransferencia,
        } = item.data;
        const patientRef = doc(db, "patients", patientId);

        try {
          await updateDoc(patientRef, {
            status,
            medico_alta: medicoAlta || "",
            observacoes_alta: observacoesAlta || "",
            unidade_transferencia: unidadeTransferencia || "",
          });
          syncedIds.push(item.id);
        } catch (err: any) {
          console.error(
            `Erro ao sincronizar alta de paciente ${patientId}:`,
            err,
          );
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `patients/${patientId}`,
          );
        }
      }
    }

    if (syncedIds.length > 0) {
      clearSyncedQueueItems(syncedIds);
    }

    // Reseta todas as estatísticas de erro
    retryCount = 0;
    isBackoffActive = false;
    backoffUntil = null;
    endpointExists = true;
    localStorage.removeItem("stellarcare_last_sync_error");
    window.dispatchEvent(new Event("stellarcare_sync_status_change"));

    console.log(
      `[FirestoreSync] Sincronização offline real concluída com sucesso. ${syncedIds.length}/${queue.length} registros integrados.`,
    );
    // Dispara o callback informando o sucesso absoluto
    onSuccess(syncedIds.length);
    // Retorna verdadeiro consolidando o ciclo completo
    return true;
  } catch (error: any) {
    console.error("Real firestore sync failed:", error);
    onFailure(error?.message || "Sem conexão de rede disponível");
    return false;
  }
};

// Recuperar todos os pacientes e subsequentes prontuários do Firestore para reconciliar o estado online
export const fetchPatientsAndMetricsFromFirestore = async (): Promise<{
  // Lista de pacientes completos sincronizados
  patients: Patient[];
  // Dicionário de listagem de pontos métricos agrupados por ID de paciente
  metricsByPatient: Record<string, MetricPoint[]>;
} | null> => {
  // Se o aplicativo estiver simuladamente offline ou de fato desconectado, cancela a sincronização remota
  if (!isApplicationOnline()) return null;

  try {
    // Busca a coleção completa de prontuários de pacientes ativos do Firestore
    const patientsSnap = await getDocs(collection(db, "patients"));
    // Inicializa a lista de compilação
    const patientsList: Patient[] = [];
    // Inicializa o dicionário de aferições
    const metricsMap: Record<string, MetricPoint[]> = {};

    // Itera sequencialmente sobre cada prontuário resgatado do Cloud
    for (const patientDoc of patientsSnap.docs) {
      // Coage os atributos do documento
      const pData = patientDoc.data();
      // Constrói o objeto Patient estritamente tipado
      const patient: Patient = {
        // ID atribuído no Firestore
        id: patientDoc.id,
        // Nome resguardado de dados sensíveis
        nome_ficticio: pData.nome_ficticio || "",
        // Data de nascimento
        data_nascimento: pData.data_nascimento || "",
        // Idade estimada
        idade_aparente: Number(pData.idade_aparente || 0),
        // Sexo biológico
        sexo: pData.sexo || "M",
        // Leito hospitalar designado para monitoração
        numero_leito: pData.numero_leito || "",
        // Ala correspondente do hospital
        setor: pData.setor || "",
        // Diagnóstico principal do paciente
        diagnostico_principal: pData.diagnostico_principal || "",
        // Check-in inicial
        data_internacao: pData.data_internacao || new Date().toISOString(),
        // Médico signatário
        medico_responsavel: pData.medico_responsavel || "Dra. Helena",
        // Profissional de enfermagem atado
        tecnico_responsavel: pData.tecnico_responsavel || {
          nome: "Posto",
          matricula: "",
        },
        // Registro de restrições ou alergias medicamentosas
        alergias: pData.alergias || "",
        // Convênio ativo correspondente
        convenio: pData.convenio || "",
        // Notas clínicas complementares
        observacoes: pData.observacoes || "",
        // Situação corrente da internação
        status: pData.status || "internado",
        // Campos de desfecho / alta
        medico_alta: pData.medico_alta || "",
        observacoes_alta: pData.observacoes_alta || "",
        unidade_transferencia: pData.unidade_transferencia || "",
        // Técnicos adicionais responsáveis do plantão
        tecnicos_adicionais: pData.tecnicos_adicionais || [],
      };
      // Compila o paciente na lista de retorno
      patientsList.push(patient);

      // Instancia a listagem aninhada de relatórios evolutivos do prontuário deste paciente no Firestore
      const metricsSnap = await getDocs(
        collection(db, "patients", patientDoc.id, "metrics"),
      );
      // Cria a fila de pontos de aferições do paciente corrente
      const metricsList: MetricPoint[] = [];

      // Mapeia todas as evoluções físicas salvas na subcoleção do prontuário
      metricsSnap.docs.forEach((mDoc) => {
        // Resgata os campos da evolução
        const mData = mDoc.data();
        // Compila o recorde métrico estruturado
        metricsList.push({
          // Horário do aferimento
          time: mData.time,
          // Escala térmica
          temp: mData.temp,
          // Saturação
          spo2: mData.spo2,
          // Escala visual da dor
          pain: mData.pain,
          // Sistólica
          sys: mData.sys,
          // Diastólica
          dia: mData.dia,
          // Frequência cardíaca
          fc: mData.fc,
          // Frequência respiratória
          fr: mData.fr,
          // Anomalia de diurese detectada
          diurese_anomalia: mData.diurese_anomalia,
          // Relatório evolutivo complementar em texto livre
          evolutionData: mData.evolutionData,
          // Carimbo temporal
          timestamp: mData.timestamp,
        } as any);
      });
      // Atribui a lista compilada ao mapeamento do respectivo paciente
      metricsMap[patientDoc.id] = metricsList;
    }

    // Retorna a consolidação remota do prontuário geral do posto
    return { patients: patientsList, metricsByPatient: metricsMap };
  } catch (error: any) {
    // Trata e silencia rejeições de leitura (e.g. sem permissão de acesso ao prontuário ou rede instável)
    console.warn(
      "Falha de leitura direta do Firestore (utilizando LocalStorage integrado):",
      error,
    );
    if (
      error?.message?.includes("permissions") ||
      error?.code === "permission-denied"
    ) {
      handleFirestoreError(error, OperationType.LIST, "patients");
    }
    // Retorna nulo para engatilhar fallback local do LocalStorage
    return null;
  }
};

// Limpar todos os pacientes e suas evoluções de sinais vitais/métricas do Cloud Firestore e do LocalStorage
export const clearAllPatientsAndMetricsFromFirestore =
  async (): Promise<boolean> => {
    if (!isApplicationOnline()) {
      throw new Error(
        "Conexão com a internet necessária para limpar banco remoto.",
      );
    }

    try {
      console.log(
        "[FirestoreClear] Buscando todos os pacientes para deletar...",
      );
      const patientsSnap = await getDocs(collection(db, "patients"));

      for (const pDoc of patientsSnap.docs) {
        const patientId = pDoc.id;
        // Exclui subcoleções de métricas primeiro para manter a integridade
        const metricsSnap = await getDocs(
          collection(db, "patients", patientId, "metrics"),
        );
        for (const mDoc of metricsSnap.docs) {
          await deleteDoc(doc(db, "patients", patientId, "metrics", mDoc.id));
        }
        // Exclui o documento raiz do paciente
        await deleteDoc(doc(db, "patients", patientId));
      }

      // Limpar cache local de persistência
      localStorage.removeItem("stellarcare_patients");
      localStorage.removeItem("stellarcare_metrics");
      localStorage.removeItem("stellarcare_sync_queue");

      // Dispara sinalizadores para atualizar ouvintes de conexão ou sincronia
      window.dispatchEvent(new Event("stellarcare_connection_change"));
      window.dispatchEvent(new Event("stellarcare_queue_update"));

      console.log("[FirestoreClear] Limpeza total concluída com sucesso.");
      return true;
    } catch (error: any) {
      console.error("Falha ao limpar banco de dados Firestore:", error);
      if (
        error?.message?.includes("permissions") ||
        error?.code === "permission-denied"
      ) {
        handleFirestoreError(error, OperationType.DELETE, "patients");
      }
      throw error;
    }
  };

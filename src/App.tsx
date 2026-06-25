/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { EvolutionForm } from "./components/EvolutionForm";
import { PatientRegistration } from "./components/PatientRegistration";
import { Registros } from "./components/Registros";
import { LandingPage } from "./components/LandingPage";
import { CadastroUsuario } from "./components/CadastroUsuario";
import { Login } from "./components/Login";
import { AssistenteClinico } from "./components/AssistenteClinico";
import { ViewState, Patient, MetricPoint, User, PatientStatus } from "./types";
import { validateLocalSession, clearSession } from "./lib/session";
import { auth, db } from "./lib/firebase";
import { collection, onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { 
  getLocalPatients, 
  saveLocalPatients, 
  getLocalMetrics, 
  saveLocalMetrics, 
  addToSyncQueue,
  isApplicationOnline,
  synchronizeOfflineData
} from "./lib/syncManager";

const initialPatients: Patient[] = [];

const initialMetrics: Record<string, MetricPoint[]> = {};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>("landing" as any);
  const [patients, setPatients] = useState<Patient[]>(() => getLocalPatients(initialPatients));
  const [metrics, setMetrics] = useState<Record<string, MetricPoint[]>>(() => getLocalMetrics(initialMetrics));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Auto-sync trigger on reconnect
  useEffect(() => {
    const handleReconnected = () => {
      if (isApplicationOnline()) {
        synchronizeOfflineData(
          (count) => {
            console.log(`[AutoSync] Sincronização automática de ${count} registros realizada com sucesso.`);
          },
          (err) => {
            console.error(`[AutoSync] Falha ao sincronizar em segundo plano:`, err);
          },
          true
        );
      }
    };

    window.addEventListener("online", handleReconnected);
    window.addEventListener("stellarcare_connection_change", handleReconnected);

    // Check immediately on mount if we have connections and pending logs
    if (isApplicationOnline()) {
      handleReconnected();
    }

    return () => {
      window.removeEventListener("online", handleReconnected);
      window.removeEventListener("stellarcare_connection_change", handleReconnected);
    };
  }, []);

  useEffect(() => {
    // Carrega os dados persistidos na sessão do LocalStorage
    const user = validateLocalSession();
    // Se um usuário válido for encontrado
    if (user) {
      // Define como usuário ativo do painel
      setCurrentUser(user);
      // Redireciona para o dashboard operacional
      setCurrentView("dashboard");
    } else {
      // Caso contrário, encaminha o operador para a tela de autenticação unificada
      setCurrentView("login" as any);
    }
  }, []);

  // 1. Escuta em tempo real para a coleção de pacientes (onSnapshot)
  useEffect(() => {
    if (!currentUser || !isApplicationOnline()) return;

    console.log("[FirestoreSync] Ativando escuta em tempo real para pacientes...");
    const patientsQuery = collection(db, "patients");
    
    const unsubscribePatients = onSnapshot(patientsQuery, (snapshot) => {
      const updatedPatients: Patient[] = [];
      snapshot.forEach((docSnap) => {
        const pData = docSnap.data();
        const patient: Patient = {
          id: docSnap.id,
          nome_ficticio: pData.nome_ficticio || "",
          data_nascimento: pData.data_nascimento || "",
          idade_aparente: Number(pData.idade_aparente || 0),
          sexo: pData.sexo || "M",
          numero_leito: pData.numero_leito || "",
          setor: pData.setor || "",
          diagnostico_principal: pData.diagnostico_principal || "",
          data_internacao: pData.data_internacao || new Date().toISOString(),
          medico_responsavel: pData.medico_responsavel || "Dra. Helena",
          tecnico_responsavel: pData.tecnico_responsavel || {
            nome: "Posto",
            matricula: "",
          },
          alergias: pData.alergias || "",
          convenio: pData.convenio || "",
          observacoes: pData.observacoes || "",
          status: pData.status || "internado",
          medico_alta: pData.medico_alta || "",
          observacoes_alta: pData.observacoes_alta || "",
          unidade_transferencia: pData.unidade_transferencia || "",
          tecnicos_adicionais: pData.tecnicos_adicionais || [],
        };
        updatedPatients.push(patient);
      });

      setPatients(updatedPatients);
      saveLocalPatients(updatedPatients);
      console.log(`[FirestoreSync] Atualização real-time: ${updatedPatients.length} pacientes carregados.`);
    }, (error) => {
      console.error("[FirestoreSync] Erro na escuta em tempo real de pacientes:", error);
    });

    return () => {
      unsubscribePatients();
    };
  }, [currentUser]);

  // 2. Escuta em tempo real para as subcoleções de métricas de cada paciente carregado
  useEffect(() => {
    if (!currentUser || !isApplicationOnline() || patients.length === 0) return;

    console.log("[FirestoreSync] Ativando escuta em tempo real de métricas por paciente...");
    const unsubscribes: (() => void)[] = [];

    patients.forEach((patient) => {
      const metricsQuery = collection(db, "patients", patient.id, "metrics");
      const unsub = onSnapshot(metricsQuery, (snapshot) => {
        const patientMetrics: MetricPoint[] = [];
        snapshot.forEach((docSnap) => {
          const mData = docSnap.data();
          patientMetrics.push({
            id: docSnap.id,
            paciente_id: mData.paciente_id || patient.id,
            time: mData.time,
            temp: mData.temp,
            spo2: mData.spo2,
            pain: mData.pain,
            sys: mData.sys,
            dia: mData.dia,
            fc: mData.fc,
            fr: mData.fr,
            diurese_anomalia: mData.diurese_anomalia,
            evolutionData: mData.evolutionData,
            timestamp: mData.timestamp,
          } as any);
        });

        patientMetrics.sort((a, b) => {
          const tA = a.timestamp || "";
          const tB = b.timestamp || "";
          return tA.localeCompare(tB);
        });

        setMetrics((prevMetrics) => {
          const updated = { ...prevMetrics, [patient.id]: patientMetrics };
          saveLocalMetrics(updated);
          return updated;
        });
      }, (error) => {
        console.error(`[FirestoreSync] Erro na escuta de métricas do paciente ${patient.id}:`, error);
      });
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [currentUser, patients.map(p => p.id).join(",")]);

  const handleAddPatient = async (patient: Patient) => {
    const nextPatients = [...patients, patient];
    setPatients(nextPatients);
    saveLocalPatients(nextPatients);

    const nextMetrics = { ...metrics, [patient.id]: [] };
    setMetrics(nextMetrics);
    saveLocalMetrics(nextMetrics);

    addToSyncQueue(
      "ADD_PATIENT",
      `Cadastrado paciente: ${patient.nome_ficticio} (Leito ${patient.numero_leito})`,
      patient
    );

    setCurrentView("dashboard");

    // Salva individualmente no Firestore de forma imediata e direta se estiver online
    if (isApplicationOnline()) {
      try {
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
          if ((cleanPatient as any)[key] === undefined || (cleanPatient as any)[key] === null) {
            delete (cleanPatient as any)[key];
          }
        });

        await setDoc(doc(db, "patients", patient.id), cleanPatient);
        // Tenta sincronizar registros pendentes restantes da fila em segundo plano
        synchronizeOfflineData(() => {}, () => {}, true);
      } catch (err) {
        console.error("Erro ao salvar paciente individual no Firestore:", err);
      }
    }
  };

  const handleDischargePatient = async (
    patientId: string, 
    status: PatientStatus,
    details?: { medicoAlta?: string; observacoesAlta?: string; unidadeTransferencia?: string }
  ) => {
    const nextPatients = patients.map(p => p.id === patientId ? { 
      ...p, 
      status,
      medico_alta: details?.medicoAlta,
      observacoes_alta: details?.observacoesAlta,
      unidade_transferencia: details?.unidadeTransferencia
    } : p);
    setPatients(nextPatients);
    saveLocalPatients(nextPatients);

    const targetPatient = patients.find(p => p.id === patientId);
    addToSyncQueue(
      "DISCHARGE_PATIENT",
      `Registrada alta (${status}) para ${targetPatient?.nome_ficticio || "Paciente"}`,
      { 
        patientId, 
        status, 
        medicoAlta: details?.medicoAlta,
        observacoesAlta: details?.observacoesAlta,
        unidadeTransferencia: details?.unidadeTransferencia
      }
    );

    // Salva individualmente no Firestore de forma imediata e direta se estiver online
    if (isApplicationOnline()) {
      try {
        await updateDoc(doc(db, "patients", patientId), {
          status,
          medico_alta: details?.medicoAlta || "",
          observacoes_alta: details?.observacoesAlta || "",
          unidade_transferencia: details?.unidadeTransferencia || "",
        });
        synchronizeOfflineData(() => {}, () => {}, true);
      } catch (err) {
        console.error("Erro ao registrar alta individual do paciente no Firestore:", err);
      }
    }
  };

  const handleAddEvolution = async (patientId: string, metric: MetricPoint) => {
    const nextMetrics = {
      ...metrics,
      [patientId]: [...(metrics[patientId] || []), metric],
    };
    setMetrics(nextMetrics);
    saveLocalMetrics(nextMetrics);

    const targetPatient = patients.find(p => p.id === patientId);
    addToSyncQueue(
      "ADD_EVOLUTION",
      `Registrado sinais vitais/evolução para ${targetPatient?.nome_ficticio || "Paciente"} (Leito ${targetPatient?.numero_leito || "N/A"})`,
      { patientId, metric }
    );

    setCurrentView("dashboard");

    // Salva individualmente no Firestore de forma imediata e direta se estiver online
    if (isApplicationOnline()) {
      try {
        const metricId = metric.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const cleanMetric = {
          id: metricId,
          paciente_id: patientId,
          time: String(metric.time || "").slice(0, 5),
          temp: Math.max(30.0, Math.min(45.0, Number(metric.temp) || 36.5)),
          spo2: Math.max(0, Math.min(100, Number(metric.spo2) || 98)),
          pain: Math.max(0, Math.min(10, Number(metric.pain) || 0)),
          sys: Math.max(0, Math.min(300, Number(metric.sys) || 120)),
          dia: Math.max(0, Math.min(200, Number(metric.dia) || 80)),
          fc: metric.fc !== undefined ? Math.max(0, Math.min(300, Number(metric.fc))) : 80,
          fr: metric.fr !== undefined ? Math.max(0, Math.min(100, Number(metric.fr))) : 16,
          diurese_anomalia: !!metric.diurese_anomalia,
          evolutionData: metric.evolutionData || {},
          timestamp: metric.timestamp || new Date().toISOString(),
        };

        Object.keys(cleanMetric).forEach((key) => {
          if ((cleanMetric as any)[key] === undefined) {
            delete (cleanMetric as any)[key];
          }
        });

        await setDoc(doc(db, "patients", patientId, "metrics", metricId), cleanMetric);
        synchronizeOfflineData(() => {}, () => {}, true);
      } catch (err) {
        console.error("Erro ao adicionar evolução individual no Firestore:", err);
      }
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setCurrentView("login" as any);
  };

  if (!currentUser) {
    if (currentView === "register_user") {
      return <CadastroUsuario onSuccess={() => setCurrentView("login" as any)} onCancel={() => setCurrentView("login" as any)} />
    }
    // Landing/Login fallback
    return <Login onLogin={handleLoginSuccess} onGoRegister={() => setCurrentView("register_user")} />;
  }

  const activePatients = patients.filter(p => p.status !== "alta");

  return (
    <Layout currentView={currentView} setView={setCurrentView} onLogout={handleLogout} user={currentUser} onOpenAssistant={() => setIsAssistantOpen(true)}>
      <AnimatePresence mode="wait">
        {currentView === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="h-full"
          >
            <Dashboard patients={activePatients} metricsByPatient={metrics} user={currentUser} />
          </motion.div>
        )}
        {currentView === "register_patient" && (
          <motion.div
            key="register_patient"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="h-full"
          >
            <PatientRegistration onRegister={handleAddPatient} />
          </motion.div>
        )}
        {currentView === "evolution" && (
          <motion.div
            key="evolution"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="h-full"
          >
            <EvolutionForm patients={activePatients} onSign={handleAddEvolution} user={currentUser} onBack={() => setCurrentView("dashboard")} />
          </motion.div>
        )}
        {currentView === "records" && (
          <motion.div
            key="records"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="h-full"
          >
            <Registros 
              patients={patients} 
              metricsByPatient={metrics} 
              onDischargePatient={handleDischargePatient}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      <AssistenteClinico patients={activePatients} metricsByPatient={metrics} isOpen={isAssistantOpen} setIsOpen={setIsAssistantOpen} />
    </Layout>
  );
}

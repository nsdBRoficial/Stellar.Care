import React, { useState, useEffect } from "react";
import { Activity, CheckCircle2, ChevronRight, ChevronLeft, Save, Calendar, Clock, User as UserIcon } from "lucide-react";
import { Patient, MetricPoint, User } from "../types";
import { AnimatePresence, motion } from "motion/react";

import frontImg from "../assets/images/anatomy_front_1780095092416.png";
import backImg from "../assets/images/anatomy_back_1780095110783.png";

interface EvolutionFormProps {
  patients: Patient[];
  onSign: (patientId: string, metric: MetricPoint) => void;
  user: User;
  onBack?: () => void;
}

const STEPS = [
  "Identificação e Estado Geral",
  "Sinais Vitais",
  "Avaliação Respiratória",
  "Avaliação Cardiovascular",
  "Avaliação Gastrointestinal",
  "Eliminação Urinária",
  "Pele e Lesões",
  "Dispositivos",
  "Dor",
  "Cuidados Realizados",
  "Intercorrências",
  "Mapa Anatômico"
];

interface Marker {
  id: string;
  x: number;
  y: number;
  observations: string;
  intensity: number;
  type: "pain" | "wound" | "other";
  view: "front" | "back";
  bodyPart?: "MMSS" | "MMII" | "Tórax" | "Abdômen" | "Costas";
}


const CampoComContador = ({ label, maxLength, value, onChange, placeholder, minHeight = '80px' }: any) => {
  const porcentagem = value.length / maxLength;
  const corContador =
    porcentagem >= 0.95 ? 'text-red-600' :
    porcentagem >= 0.80 ? 'text-orange-500' :
    'text-gray-500';
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
      <textarea 
        maxLength={maxLength}
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight }}
        className="w-full bg-white border border-gray-200 rounded-[10px] p-3 text-[15px] focus:border-[#1D9E75] outline-none resize-y"
      />
      {value.length > 0 && (
        <span className={`text-[12px] font-semibold text-right ${corContador}`}>
          {value.length}/{maxLength} caracteres
        </span>
      )}
    </div>
  );
};

const fcOptions = Array.from({ length: 200 - 40 + 1 }, (_, i) => 40 + i);
// FEATURE NOVO: A pressão sistólica (SIS) nunca pode ser abaixo de 100, logo iniciamos as opções em 100.
const paSysOptions = Array.from({ length: 220 - 100 + 1 }, (_, i) => 100 + i);
const paDiaOptions = Array.from({ length: 130 - 40 + 1 }, (_, i) => 40 + i);
const frOptions = Array.from({ length: 40 - 10 + 1 }, (_, i) => 10 + i);
const tempOptions = Array.from({ length: Math.round((42.0 - 34.0) / 0.1) + 1 }, (_, i) => (34.0 + i * 0.1).toFixed(1));
const spo2Options = Array.from({ length: 100 - 80 + 1 }, (_, i) => 80 + i);
const hgtOptions = Array.from({ length: 600 - 20 + 1 }, (_, i) => 20 + i);

const isFCAlert = (val: string) => {
  const num = parseInt(val);
  return !isNaN(num) && (num < 50 || num > 120);
};

const isPASAlert = (val: string) => {
  const num = parseInt(val);
  return !isNaN(num) && (num < 90 || num > 140);
};

const isPADAlert = (val: string) => {
  const num = parseInt(val);
  return !isNaN(num) && (num < 60 || num > 90);
};

const isFRAlert = (val: string) => {
  const num = parseInt(val);
  return !isNaN(num) && (num < 12 || num > 22);
};

const isTempAlert = (val: string) => {
  const num = parseFloat(val);
  return !isNaN(num) && (num < 35.0 || num > 37.8);
};

const isSpO2Alert = (val: string) => {
  const num = parseInt(val);
  return !isNaN(num) && num < 94;
};

const isHGTAlert = (val: string) => {
  const num = parseInt(val);
  return !isNaN(num) && (num < 70 || num > 250);
};

export function EvolutionForm({ patients, onSign, user, onBack }: EvolutionFormProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const [selectedPatientId, setSelectedPatientId] = useState(
    patients[0]?.id || ""
  );

  const [modalAlert, setModalAlert] = useState<{ title: string; message: string } | null>(null);
  const [modalConfirm, setModalConfirm] = useState<{ title: string; message: string; onConfirm: () => void; onCancel?: () => void } | null>(null);
  const [confirmedSVEmpty, setConfirmedSVEmpty] = useState(false);
  const [confirmedCardioContrast, setConfirmedCardioContrast] = useState(false);

  const triggerAlert = (message: string, title: string = "Aviso") => {
    setModalAlert({ title, message });
  };

  const getPeriodoSugestao = (horaVal?: number) => {
    const hora = horaVal !== undefined ? horaVal : new Date().getHours();
    if (hora >= 7 && hora < 13) return "Manhã";
    if (hora >= 13 && hora < 19) return "Tarde";
    return "Noite";
  };

  const getHorarioAtualFormatado = () => {
    const d = new Date();
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const sugestao = getPeriodoSugestao(d.getHours());
    let shiftRange = "";
    if (sugestao === "Manhã") shiftRange = "07h00 às 13h00";
    else if (sugestao === "Tarde") shiftRange = "13h00 às 19h00";
    else shiftRange = "19h00 às 07h00";
    return `${sugestao} (${hrs}:${mins}) [${shiftRange}]`;
  };

  const getTimeFromPeriodo = (pStr: string | null) => {
    if (!pStr) return "";
    const match = pStr.match(/\((\d{2}:\d{2})\)/);
    if (match) return match[1];
    if (/^\d{2}:\d{2}$/.test(pStr)) return pStr;
    return "";
  };

  const formatTimeInput = (value: string) => {
    let digits = value.replace(/\D/g, "");
    if (digits.length > 4) {
      digits = digits.slice(0, 4);
    }
    if (digits.length > 2) {
      return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
    return digits;
  };

  const getPeriodoFromTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hrs, mins] = timeStr.split(":");
    const hNum = parseInt(hrs, 10);
    if (isNaN(hNum)) return timeStr;
    
    const sug = getPeriodoSugestao(hNum);
    let shiftRange = "";
    if (sug === "Manhã") shiftRange = "07h00 às 13h00";
    else if (sug === "Tarde") shiftRange = "13h00 às 19h00";
    else shiftRange = "19h00 às 07h00";
    
    const formattedMins = mins !== undefined ? mins : "";
    return `${sug} (${hrs}:${formattedMins}) [${shiftRange}]`;
  };

  const parsePeriodoDetails = (pStr: string | null) => {
    if (!pStr) return { title: "", range: "" };
    const rangeMatch = pStr.match(/\[(.*?)\]/);
    const range = rangeMatch ? `[${rangeMatch[1]}]` : "";
    const title = pStr.replace(/\s*\[.*?\]/, "").trim();
    return { title, range };
  };

  const isValidCompleteTime = (timeStr: string) => {
    if (!/^\d{2}:\d{2}$/.test(timeStr)) return false;
    const [hrsStr, minsStr] = timeStr.split(":");
    const hrs = parseInt(hrsStr, 10);
    const mins = parseInt(minsStr, 10);
    return hrs >= 0 && hrs <= 23 && mins >= 0 && mins <= 59;
  };

  const [periodo, setPeriodo] = useState<string | null>(getHorarioAtualFormatado());
  const [timeInputValue, setTimeInputValue] = useState<string>(() => {
    return getTimeFromPeriodo(getHorarioAtualFormatado());
  });

  useEffect(() => {
    if (periodo) {
      const extracted = getTimeFromPeriodo(periodo);
      if (extracted) {
        setTimeInputValue(extracted);
      }
    } else {
      setTimeInputValue("");
    }
  }, [periodo]);

  const [dataEvolucao, setDataEvolucao] = useState(new Date().toISOString().split("T")[0]);
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [procedimentos, setProcedimentos] = useState("");
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    const d = new Date();
    setDateStr(`${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", {hour: "2-digit", minute:"2-digit"})}`);
  }, []);

  // 2. ESTADO GERAL
  const [estadoGeral, setEstadoGeral] = useState("Bom estado geral");
  const [consciencia, setConsciencia] = useState<string | null>(null);
  const [orientacao, setOrientacao] = useState<string | null>(null);
  const handleConsciencia = (valor: string) => { setConsciencia(valor); if (valor !== "Consciente") setOrientacao(null); };
  const [mobilidade, setMobilidade] = useState<string | null>(null);
  const [mobilidadeOutro, setMobilidadeOutro] = useState("");

  // 3. SINAIS VITAIS
  const [paSys, setPaSys] = useState("");
  const [paDia, setPaDia] = useState("");
  const [fc, setFc] = useState("");
  const [fr, setFr] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [hgt, setHgt] = useState("");

  // 4. AVALIAÇÃO RESPIRATÓRIA
  const [padraoResp, setPadraoResp] = useState<string[]>([]);
  const [oxigenioterapia, setOxigenioterapia] = useState("Ar ambiente");
  const [litrosMin, setLitrosMin] = useState("");
  const [secrecao, setSecrecao] = useState("Ausente");

  // 5. AVALIAÇÃO CARDIOVASCULAR
  const [cardio, setCardio] = useState<string[]>([]);
  
  // 6. AVALIAÇÃO GASTROINTESTINAL
  const [gastro, setGastro] = useState<string[]>([]);

  // 7. ELIMINAÇÃO URINÁRIA
  const [urinaria, setUrinaria] = useState<string[]>([]);

  // 8. PELE E LESÕES
  const [estadoPele, setEstadoPele] = useState<"íntegra" | "alterada" | "">("");
  const [pele, setPele] = useState<string[]>([]);
  const [localLesao, setLocalLesao] = useState("");

  // 9. DISPOSITIVOS
  const [dispositivos, setDispositivos] = useState<string[]>([]);
  const [localDispositivo, setLocalDispositivo] = useState("");

  // 10. DOR
  const [dor, setDor] = useState("0");
  const [semDor, setSemDor] = useState(false);

  // 11. CUIDADOS REALIZADOS
  const [cuidados, setCuidados] = useState<string[]>([]);

  // 12. INTERCORRÊNCIAS
  const [intercorrencias, setIntercorrencias] = useState("");

  // 13. MAPA ANATÔMICO
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);

    function pontoNaArea(px: number, py: number, larguraImg: number, alturaImg: number) {
    const contorno = [
      [0.38, 0.02], [0.62, 0.02], [0.65, 0.15], [0.70, 0.35],
      [0.75, 0.55], [0.72, 0.70], [0.65, 0.72], [0.63, 0.55],
      [0.60, 0.75], [0.58, 0.95], [0.56, 0.98], [0.44, 0.98],
      [0.42, 0.95], [0.40, 0.75], [0.37, 0.55], [0.35, 0.72],
      [0.28, 0.70], [0.25, 0.55], [0.30, 0.35], [0.35, 0.15]
    ];
    const x = px / larguraImg;
    const y = py / alturaImg;
    let dentro = false;
    for (let i = 0, j = contorno.length - 1; i < contorno.length; j = i++) {
        const [xi, yi] = contorno[i];
        const [xj, yj] = contorno[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            dentro = !dentro;
        }
    }
    return dentro;
  }

  const getEstimatedBodyPart = (x: number, y: number, view: "front" | "back"): "MMSS" | "MMII" | "Tórax" | "Abdômen" | "Costas" => {
    if (y > 55) {
      return "MMII"; // Membros Inferiores
    }
    if (x < 38 || x > 62) {
      return "MMSS"; // Membros Superiores
    }
    if (view === "back") {
      return "Costas"; // Dorso / Costas
    }
    if (y < 35) {
      return "Tórax"; // Peito / Tórax
    }
    return "Abdômen"; // Barriga / Abdômen
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>, view: "front" | "back") => {
    const target = e.currentTarget;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (!pontoNaArea(px, py, rect.width, rect.height)) {
        // Subtle visual feedback
        target.classList.add("bg-red-50");
        setTimeout(() => {
          if (target) {
            target.classList.remove("bg-red-50");
          }
        }, 200);
        return;
    }

    const x = (px / rect.width) * 100;
    const y = (py / rect.height) * 105 / 100; // y-scaling tweak if necessary, let's keep original scale
    const realY = (py / rect.height) * 100;

    const estimatedBodyPart = getEstimatedBodyPart(x, realY, view);

    const newMarker: Marker = {
      id: Math.random().toString(36).substring(2, 9),
      x, y: realY, observations: "", intensity: 5, type: "pain", view,
      bodyPart: estimatedBodyPart
    };
    setMarkers([...markers, newMarker]);
    setActiveMarkerId(newMarker.id);
    setEditingMarkerId(newMarker.id);
  };

  const updateActiveMarker = (updates: Partial<Marker>) => {
    setMarkers(markers.map(m => m.id === activeMarkerId ? { ...m, ...updates } : m));
  };

  const deleteMarker = (id: string) => {
    setMarkers(markers.filter(m => m.id !== id));
    if (activeMarkerId === id) setActiveMarkerId(null);
    if (editingMarkerId === id) setEditingMarkerId(null);
  };

  const [success, setSuccess] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [stellarTxId, setStellarTxId] = useState("");
  const [txHash, setTxHash] = useState("");

  const toggleArray = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    if (arr.includes(item)) {
      setArr(arr.filter((i) => i !== item));
    } else {
      setArr([...arr, item]);
    }
  };

  // Helper to validate clinical rules and required fields per step
  const validateStep = (stepIdx: number, targetStep?: number): boolean => {
    if (stepIdx === 0) {
      if (!periodo) {
        triggerAlert("O período da evolução é obrigatório.", "Identificação");
        return false;
      }
      if (!consciencia) {
        triggerAlert("O nível de consciência (Grupo A) é obrigatório.", "Identificação");
        return false;
      }
      if (consciencia === "Consciente" && !orientacao) {
        triggerAlert("Como o paciente está Consciente, a orientação (Grupo B: Orientado ou Desorientado) é obrigatória.", "Identificação");
        return false;
      }
      if (!mobilidade) {
        triggerAlert("A mobilidade do paciente é obrigatória.", "Identificação");
        return false;
      }
      if (mobilidade === "Outro" && !mobilidadeOutro.trim()) {
        triggerAlert("Por favor, preencha o campo de texto de mobilidade do paciente.", "Identificação");
        return false;
      }
    }
    if (stepIdx === 1) { // Sinais Vitais
      if (paSys || paDia) {
        const sys = parseInt(paSys);
        const dia = parseInt(paDia);
        if (!paSys || !paDia || isNaN(sys) || isNaN(dia)) {
          triggerAlert("Ambos os campos de Pressão Arterial (Sistólica e Diastólica) devem ser preenchidos se um deles for informado.", "Sinais Vitais");
          return false;
        }
        // FEATURE NOVO: A validade exige que a pressão sistólica (SIS) nunca seja inferior a 100 mmHg
        if (sys < 100) {
          triggerAlert("A Pressão Arterial Sistólica (SIS) não pode ser abaixo de 100 mmHg.", "Sinais Vitais");
          return false;
        }
        if (dia >= sys) {
          triggerAlert("A pressão diastólica não pode ser maior ou igual à sistólica.", "Sinais Vitais");
          return false;
        }
      }
      if (fc) {
        const val = parseInt(fc);
        if (isNaN(val) || val < 30 || val > 300) {
          triggerAlert("Frequência Cardíaca (FC) deve estar entre 30 e 300 BPM.", "Sinais Vitais");
          return false;
        }
      }
      if (fr) {
        const val = parseInt(fr);
        if (isNaN(val) || val < 5 || val > 60) {
          triggerAlert("Frequência Respiratória (FR) deve estar entre 5 e 60 IRPM.", "Sinais Vitais");
          return false;
        }
      }
      if (temp) {
        const val = parseFloat(temp);
        if (isNaN(val) || val < 30 || val > 45) {
          triggerAlert("Temperatura deve estar entre 30.0°C e 45.0°C.", "Sinais Vitais");
          return false;
        }
      }
      if (spo2) {
        const val = parseInt(spo2);
        if (isNaN(val) || val < 50 || val > 100) {
          triggerAlert("Saturação de SpO2 deve estar entre 50% e 100%.", "Sinais Vitais");
          return false;
        }
      }
      if (hgt) {
        const val = parseInt(hgt);
        if (isNaN(val) || val < 20 || val > 600) {
          triggerAlert("HGT deve estar entre 20 e 600 mg/dL.", "Sinais Vitais");
          return false;
        }
      }
      // Warn if completely empty
      if (!paSys && !paDia && !fc && !fr && !temp && !spo2 && !hgt) {
        if (!confirmedSVEmpty) {
          const nextIdx = targetStep !== undefined ? targetStep : stepIdx + 1;
          setModalConfirm({
            title: "Aviso de Sinais Vitais",
            message: "Nenhum sinal vital foi preenchido. Tem certeza de que deseja avançar sem registrá-los?",
            onConfirm: () => {
              setConfirmedSVEmpty(true);
              setModalConfirm(null);
              setCurrentStep(nextIdx);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            onCancel: () => setModalConfirm(null)
          });
          return false;
        }
      }
    }
    if (stepIdx === 3) { // Cardiovascular
      if (cardio.includes("Cianótico") && cardio.includes("Perfusão preservada")) {
        if (!confirmedCardioContrast) {
          const nextIdx = targetStep !== undefined ? targetStep : stepIdx + 1;
          setModalConfirm({
            title: "Alerta Clínico",
            message: "Marcar 'Cianótico' simultaneamente com 'Perfusão preservada' é clinicamente incomum. Deseja manter essa seleção?",
            onConfirm: () => {
              setConfirmedCardioContrast(true);
              setModalConfirm(null);
              setCurrentStep(nextIdx);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            onCancel: () => setModalConfirm(null)
          });
          return false;
        }
      }
    }
    if (stepIdx === 4) { // Gastrointestinal
      if (gastro.includes("Aceitando dieta") && gastro.includes("Jejum")) {
        triggerAlert("O paciente não pode estar em 'Jejum' e 'Aceitando dieta' simultaneamente. Por favor, corrija.", "Gastrointestinal");
        return false;
      }
    }
    if (stepIdx === 5) { // Urinária
      if (urinaria.includes("Diurese espontânea") && urinaria.includes("SVD")) {
        triggerAlert("Diurese espontânea e SVD (sonda de demora) são mutuamente exclusivos. Por favor, selecione apenas um.", "Eliminação Urinária");
        return false;
      }
    }
    if (stepIdx === 6) { // Pele
      if (!estadoPele) {
        triggerAlert("O campo Estado da Pele (íntegra ou alterada) é obrigatório.", "Pele e Lesões");
        return false;
      }
      if (estadoPele === "alterada") {
        if (pele.length === 0) {
          triggerAlert("Como a pele está alterada, por favor selecione ao menos uma lesão presente.", "Pele e Lesões");
          return false;
        }
        if (!localLesao.trim()) {
          triggerAlert("Por favor, descreva o local da lesão.", "Pele e Lesões");
          return false;
        }
      }
    }
    if (stepIdx === 7) { // Dispositivos
      if (dispositivos.length > 0 && !localDispositivo.trim()) {
        triggerAlert("Por favor, descreva o local/dispositivo para os dispositivos selecionados.", "Dispositivos");
        return false;
      }
    }
    // FEATURE NOVO: Obrigatoriedade clínica de pontuar as intercorrências do plantão antes do encerramento
    if (stepIdx === 10) { // Intercorrências / Finalização
      if (!intercorrencias.trim()) {
        triggerAlert("O preenchimento do campo 'Evolução Clínica / Intercorrências' é obrigatório para registrar a evolução do paciente.", "Intercorrências");
        return false;
      }
    }
    return true;
  };

  const handleStepChange = (targetStep: number) => {
    // Going backwards is always allowed
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate current step
    if (validateStep(currentStep, targetStep)) {
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Safe loading of draft on selected patient change
  useEffect(() => {
    if (selectedPatientId) {
      setConfirmedSVEmpty(false);
      setConfirmedCardioContrast(false);
      const saved = localStorage.getItem(`draft_evolution_${selectedPatientId}`);
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          setCurrentStep(draft.currentStep || 0);
          setEstadoGeral(draft.estadoGeral || "Bom estado geral");
          setConsciencia(draft.consciencia || null);
          setOrientacao(draft.orientacao || null);
          setMobilidade(draft.mobilidade || null);
          setMobilidadeOutro(draft.mobilidadeOutro || "");
          setPaSys(draft.paSys || "");
          setPaDia(draft.paDia || "");
          setFc(draft.fc || "");
          setFr(draft.fr || "");
          setTemp(draft.temp || "");
          setSpo2(draft.spo2 || "");
          setHgt(draft.hgt || "");
          setPadraoResp(draft.padraoResp || []);
          setOxigenioterapia(draft.oxigenioterapia || "Ar ambiente");
          setLitrosMin(draft.litrosMin || "");
          setSecrecao(draft.secrecao || "Ausente");
          setCardio(draft.cardio || []);
          setGastro(draft.gastro || []);
          setUrinaria(draft.urinaria || []);
          const pList = draft.pele || [];
          setPele(pList);
          if (pList.includes("Pele íntegra")) {
            setEstadoPele("íntegra");
          } else if (pList.length > 0) {
            setEstadoPele("alterada");
          } else {
            setEstadoPele("");
          }
          setLocalLesao(draft.localLesao || "");
          setDispositivos(draft.dispositivos || []);
          setLocalDispositivo(draft.localDispositivo || "");
          setDor(draft.dor || "0");
          setSemDor(draft.semDor || false);
          setCuidados(draft.cuidados || []);
          setIntercorrencias(draft.intercorrencias || "");
          setMedicamentos(draft.medicamentos || "");
          setProcedimentos(draft.procedimentos || "");
          setObservacoesGerais(draft.observacoesGerais || "");
          setMarkers(draft.markers || []);
        } catch (e) {
          console.error("Erro ao carregar o rascunho: ", e);
        }
      } else {
        // Reset to initial clean state
        setCurrentStep(0);
        setEstadoGeral("Bom estado geral");
        setConsciencia(null);
        setOrientacao(null);
        setMobilidade(null);
        setMobilidadeOutro("");
        setPaSys("");
        setPaDia("");
        setFc("");
        setFr("");
        setTemp("");
        setSpo2("");
        setHgt("");
        setPadraoResp([]);
        setOxigenioterapia("Ar ambiente");
        setLitrosMin("");
        setSecrecao("Ausente");
        setCardio([]);
        setGastro([]);
        setUrinaria([]);
        setEstadoPele("");
        setPele([]);
        setLocalLesao("");
        setDispositivos([]);
        setLocalDispositivo("");
        setDor("0");
        setSemDor(false);
        setCuidados([]);
        setIntercorrencias("");
        setMedicamentos("");
        setProcedimentos("");
        setObservacoesGerais("");
        setMarkers([]);
      }
    }
  }, [selectedPatientId]);

  // Save changes to localStorage draft in real-time (M-08)
  useEffect(() => {
    if (selectedPatientId) {
      const draftData = {
        currentStep,
        estadoGeral, consciencia, orientacao, mobilidade, mobilidadeOutro,
        paSys, paDia, fc, fr, temp, spo2, hgt,
        padraoResp, oxigenioterapia, litrosMin, secrecao,
        cardio, gastro, urinaria, pele, localLesao,
        dispositivos, localDispositivo,
        dor, semDor, cuidados, intercorrencias, medicamentos, procedimentos, observacoesGerais,
        markers
      };
      localStorage.setItem(`draft_evolution_${selectedPatientId}`, JSON.stringify(draftData));
    }
  }, [
    selectedPatientId, currentStep,
    estadoGeral, consciencia, orientacao, mobilidade, mobilidadeOutro,
    paSys, paDia, fc, fr, temp, spo2, hgt,
    padraoResp, oxigenioterapia, litrosMin, secrecao,
    cardio, gastro, urinaria, pele, localLesao,
    dispositivos, localDispositivo,
    dor, semDor, cuidados, intercorrencias, medicamentos, procedimentos, observacoesGerais,
    markers
  ]);

  const handleSave = async () => {
    // Perform final check before signing
    for (let stepIdx = 0; stepIdx < STEPS.length; stepIdx++) {
      if (!validateStep(stepIdx)) {
        setCurrentStep(stepIdx);
        return;
      }
    }

    setIsSigning(true);

    // Collect all data to generate a hash
    const evolutionData = {
      timestamp: new Date().toISOString(),
      patientId: selectedPatientId,
      periodo,
      estadoGeral, consciencia, orientacao, mobilidade, mobilidadeOutro,
      sinaisVitais: { paSys, paDia, fc, fr, temp, spo2, hgt },
      padraoResp, oxigenioterapia, litrosMin, secrecao,
      cardio, gastro, urinaria, pele, localLesao,
      dispositivos, localDispositivo,
      dor: semDor ? "Sem dor" : dor,
      cuidados, intercorrencias, medicamentos, procedimentos, observacoesGerais, markers,
      profissional: {
        nome: user?.nome_completo || "Nome não informado",
        matricula: user?.matricula || "Matrícula não informada",
        cargo: user?.cargo || "TEC"
      }
    };

    const dataString = JSON.stringify(evolutionData);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Simulate blockchain network latency
    setTimeout(() => {
      onSign(selectedPatientId, {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        temp: parseFloat(temp) || 36.5,
        spo2: parseFloat(spo2) || 98,
        pain: semDor ? 0 : parseFloat(dor) || 0,
        sys: parseFloat(paSys) || 120,
        dia: parseFloat(paDia) || 80,
        fc: parseFloat(fc) || 80,
        fr: parseFloat(fr) || 18,
        diurese_anomalia: urinaria.includes("Oligúria") || urinaria.includes("Anúria"),
        evolutionData,
      });

      setTxHash(hashHex);
      setStellarTxId("TX_" + Math.random().toString(36).substring(2, 10).toUpperCase());
      setIsSigning(false);
      setSuccess(true);
      
      // Clean draft representation
      localStorage.removeItem(`draft_evolution_${selectedPatientId}`);

      // Keep success message longer so users can see the hashes
      setTimeout(() => {
        setSuccess(false);
        setTxHash("");
        setStellarTxId("");
        // Reset flow
        setCurrentStep(0);
      }, 5000);
    }, 1200);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      handleStepChange(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      handleStepChange(currentStep - 1);
    }
  };

  const CheckboxItem = ({ label, arr, setArr }: { label: string, arr: string[], setArr: (v: string[]) => void }) => {
    const isChecked = arr.includes(label);
    return (
      <div className="flex items-center gap-2 cursor-pointer group select-none">
        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-[#1D9E75] border-[#1D9E75]' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
          {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        </div>
        <span className={`text-[13px] leading-tight font-medium ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>{label}</span>
      </div>
    );
  };

  const RadioItem = ({ label, val, setVal }: { label: string, val: string, setVal: (v: string) => void }) => {
    const isChecked = val === label;
    return (
      <div className="flex items-center gap-2 cursor-pointer group select-none">
        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'border-[#1D9E75]' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
          {isChecked && <div className="w-2.5 h-2.5 bg-[#1D9E75] rounded-full" />}
        </div>
        <span className={`text-[13px] leading-tight font-medium ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>{label}</span>
      </div>
    );
  };

  const SectionTitle = ({ title }: { title: string }) => (
    <h2 className="text-[12px] font-bold text-[#1D9E75] uppercase tracking-[0.8px] mb-3">{title}</h2>
  );

  return (
        <div className="animate-in fade-in duration-300 pb-2 space-y-4 flex flex-col h-full">
      {/* Header Limpo e Compacto */}
      <div className="flex items-center justify-between mb-2 px-1 mt-1 shrink-0">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[20px] font-black text-gray-950 tracking-tight">Evolução Enfermagem</h1>
          <p className="text-[#1D9E75] text-[10px] font-black uppercase tracking-widest leading-none">Registro Clínico Integrado</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border border-gray-200 rounded-[14px] p-3 shadow-sm shrink-0 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Passo {currentStep + 1} de {STEPS.length}</span>
          <span className="text-[12px] font-bold text-[#1D9E75] truncate max-w-[200px] text-right">{STEPS[currentStep]}</span>
        </div>
        <div className="flex gap-1 w-full scale-[0.98] sm:scale-100 origin-left">
          {STEPS.map((stepName, idx) => {
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleStepChange(idx)}
                className={`flex-1 h-2 rounded-full transition-all ${
                  isCurrent 
                    ? "bg-[#1D9E75] ring-2 ring-[#a7f3d0] scale-y-[1.25]" 
                    : isCompleted 
                    ? "bg-[#1D9E75]/80 hover:bg-[#1D9E75]" 
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
                title={`Passo ${idx + 1}: ${stepName}`}
                aria-label={`Ir para o Passo ${idx + 1}: ${stepName}`}
              />
            );
          })}
        </div>
      </div>

      {/* Steps Content */}
      <div className="flex-1 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="w-full"
          >
        {currentStep === 0 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300 max-w-[420px] mx-auto w-full">
            <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-5 space-y-5 shadow-none" style={{ borderWidth: '0.5px' }}>
              
              {/* Seção 1: IDENTIFICAÇÃO E REGISTRO */}
              <div className="space-y-4">
                <SectionTitle title="1. IDENTIFICAÇÃO" />
                
                {/* Paciente Select */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest block select-none">Paciente *</span>
                  {patients.length === 0 ? (
                    <div className="relative flex items-center h-[44px] w-full">
                      <input
                        type="text"
                        disabled
                        placeholder="Nenhum paciente ativo neste plantão — Cadastre"
                        className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] pl-3 pr-10 text-[15px] text-gray-400 font-normal outline-none cursor-not-allowed border-dashed"
                      />
                      <UserIcon className="absolute right-3 w-4 h-4 text-gray-300 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="relative flex items-center h-[44px] w-full">
                      <select
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="w-full h-[44px] bg-white border border-gray-200 text-gray-900 rounded-[10px] pl-3 pr-10 text-[15px] outline-none transition-colors appearance-none font-normal cursor-pointer focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
                      >
                        <option value="" disabled className="text-gray-400">Selecione o paciente...</option>
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome_ficticio} (Leito {p.numero_leito})
                          </option>
                        ))}
                      </select>
                      <UserIcon className="absolute right-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>

              {/* Divisor sutil entre paciente e grid */}
              <div className="border-t border-gray-200/50" style={{ borderWidth: '0.5px' }} />

              {/* Grid 2 colunas */}
              <div className="grid grid-cols-2 gap-[12px]">
                {/* Coluna 1 — Data da Evolução */}
                <div className="flex flex-col gap-1.5">
                  <div className="h-[24px] flex items-center justify-between w-full">
                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest block select-none">Data</span>
                    <button 
                      type="button" 
                      onClick={() => setDataEvolucao(new Date().toISOString().split("T")[0])}
                      className="text-[11px] font-normal bg-[#E6F1FB] text-[#185FA5] px-2 py-0.5 rounded-[6px] cursor-pointer transition-colors leading-none border-none outline-none hover:bg-[#d5e8f8]"
                    >
                      Hoje
                    </button>
                  </div>
                  <div className="relative flex items-center h-[44px] w-full">
                    <input 
                      type="date" 
                      value={dataEvolucao} 
                      onChange={e => setDataEvolucao(e.target.value)}
                      className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] pl-2.5 pr-8 text-[13px] xs:text-[14px] text-gray-900 font-normal outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all cursor-pointer"
                    />
                    <Calendar className="absolute right-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Coluna 2 — Horário / Período */}
                <div className="flex flex-col gap-1.5">
                  <div className="h-[24px] flex items-center justify-between w-full">
                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest block select-none">Horário *</span>
                    <button 
                      type="button" 
                      onClick={() => setPeriodo(getHorarioAtualFormatado())}
                      className="text-[11px] font-normal bg-[#EAF3DE] text-[#3B6D11] px-2 py-0.5 rounded-[6px] cursor-pointer transition-colors leading-none border-none outline-none hover:bg-[#dfecd0]"
                    >
                      Agora
                    </button>
                  </div>
                  
                  <div className="relative flex items-center h-[44px] w-full">
                    <input 
                      type="text" 
                      placeholder="--:--" 
                      value={timeInputValue}
                      onChange={e => {
                        const clean = formatTimeInput(e.target.value);
                        setTimeInputValue(clean);
                        if (!clean) {
                          setPeriodo(null);
                        } else if (isValidCompleteTime(clean)) {
                          setPeriodo(getPeriodoFromTime(clean));
                        } else {
                          setPeriodo(null);
                        }
                      }}
                      className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] text-center text-[15px] text-gray-900 font-normal outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] pr-10 pl-3"
                    />
                    <div className="absolute right-3 w-5 h-5 flex items-center justify-center cursor-pointer">
                      <Clock className="w-4 h-4 text-gray-400 pointer-events-none" />
                      <input 
                        type="time" 
                        value={getTimeFromPeriodo(periodo) || ""}
                        onChange={e => {
                          const timeVal = e.target.value;
                          if (timeVal) {
                            setPeriodo(getPeriodoFromTime(timeVal));
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        style={{ colorScheme: 'light' }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 uppercase text-center block w-full tracking-wider leading-none">Hora alt.</span>
                  {!periodo && <span className="text-red-500 text-[10px] uppercase font-bold mt-1 text-center block w-full">Campo obrigatório</span>}
                </div>
              </div>

              {/* Box de Período Definido */}
              {periodo && (() => {
                const { title, range } = parsePeriodoDetails(periodo);
                return (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200/60 rounded-lg space-y-1" style={{ borderWidth: '0.5px' }}>
                    <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-[#185FA5] shrink-0" />
                       <span className="text-[13px] text-gray-705 font-normal">
                        Definido: <span className="font-bold text-gray-950">{title}</span>
                      </span>
                    </div>
                    {range && (
                      <div className="pl-[14px] text-[12px] text-gray-500 font-normal">
                        {range}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Seção 2: ESTADO CLÍNICO GERAL */}
              <div className="bg-white border border-gray-200 rounded-[14px] p-5 space-y-4 shadow-sm" style={{ borderWidth: '0.5px' }}>
                <SectionTitle title="2. ESTADO GERAL" />

                {/* Subseção: ESTADO */}
                <div className="space-y-2">
                  <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                    ESTADO
                  </span>
                  <div className="flex flex-col gap-3">
                    {["Bom estado geral", "Regular estado geral", "Mau estado geral"].map(op => (
                      <div key={op} onClick={() => setEstadoGeral(op)} className="cursor-pointer">
                        <RadioItem label={op} val={estadoGeral || ""} setVal={setEstadoGeral} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subseção: NÍVEL DE CONSCIÊNCIA (GRUPO A) */}
                <div className="space-y-2 pt-1.5">
                  <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                    NÍVEL DE CONSCIÊNCIA (GRUPO A)
                  </span>
                  <div className="flex flex-row flex-wrap gap-x-6 gap-y-2">
                    {["Consciente", "Não responsivo", "Sedado"].map(op => (
                      <div key={op} onClick={() => handleConsciencia(op)} className="cursor-pointer">
                        <RadioItem label={op} val={consciencia || ""} setVal={handleConsciencia} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subseção: ORIENTAÇÃO (GRUPO B) */}
                <div className={`space-y-2 pt-1.5 transition-opacity duration-200 ${consciencia !== 'Consciente' ? 'opacity-30 pointer-events-none' : ''}`}>
                  <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                    ORIENTAÇÃO (GRUPO B)
                  </span>
                  <div className="flex flex-row flex-wrap gap-x-6 gap-y-2">
                    {["Orientado", "Desorientado"].map(op => (
                      <div key={op} onClick={() => consciencia === 'Consciente' && setOrientacao(op)} className="cursor-pointer">
                        <RadioItem label={op} val={orientacao || ""} setVal={setOrientacao} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subseção: MOBILIDADE */}
                <div className="space-y-2 pt-1.5">
                  <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                    MOBILIDADE
                  </span>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {["Deambula", "Cadeirante", "Acamado", "Outro"].map(op => (
                      <div key={op} onClick={() => { setMobilidade(op); if (op !== 'Outro') setMobilidadeOutro(''); }} className="cursor-pointer">
                        <RadioItem label={op} val={mobilidade || ""} setVal={setMobilidade} />
                      </div>
                    ))}
                  </div>
                  {mobilidade === 'Outro' && (
                    <div className="mt-2.5 animate-in fade-in duration-200">
                      <input 
                        type="text" 
                        placeholder="Especifique a mobilidade..." 
                        value={mobilidadeOutro} 
                        onChange={e => setMobilidadeOutro(e.target.value)} 
                        className="w-full h-[36px] bg-white border border-gray-200 rounded-lg px-2.5 text-[13px] text-gray-900 focus:border-[#1D9E75] outline-none font-medium" 
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm">
              <SectionTitle title="3. Sinais Vitais" />
              <div className="grid grid-cols-2 gap-4">
                {/* PA mmHg */}
                <div>
                  <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">PA mmHg</label>
                  <div className="flex gap-2 items-center">
                    <div className="w-[45%]">
                      <select 
                        value={paSys} 
                        onChange={e => setPaSys(e.target.value)} 
                        className={`w-full h-[44px] bg-white border rounded-[10px] px-1 text-[15px] focus:outline-none text-center font-bold transition-all ${
                          isPASAlert(paSys) 
                            ? "border-red-400 text-red-900 bg-red-50 focus:border-red-500" 
                            : "border-gray-200 text-gray-800 focus:border-[#1D9E75]"
                        }`}
                      >
                        <option value="">Sis</option>
                        {paSysOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <span className="text-gray-400 text-lg font-light">/</span>
                    <div className="w-[45%]">
                      <select 
                        value={paDia} 
                        onChange={e => setPaDia(e.target.value)} 
                        className={`w-full h-[44px] bg-white border rounded-[10px] px-1 text-[15px] focus:outline-none text-center font-bold transition-all ${
                          isPADAlert(paDia) 
                            ? "border-red-400 text-red-900 bg-red-50 focus:border-red-500" 
                            : "border-gray-200 text-gray-800 focus:border-[#1D9E75]"
                        }`}
                      >
                        <option value="">Dia</option>
                        {paDiaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                  {(isPASAlert(paSys) || isPADAlert(paDia)) && (
                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider block mt-1">⚠️ PA Alterada</span>
                  )}
                </div>

                {/* FC bpm */}
                <div>
                  <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">FC bpm</label>
                  <select 
                    value={fc} 
                    onChange={e => setFc(e.target.value)} 
                    className={`w-full h-[44px] bg-white border rounded-[10px] px-3 text-[15px] focus:outline-none font-bold transition-all ${
                      isFCAlert(fc) 
                        ? "border-red-400 text-red-900 bg-red-50 focus:border-red-500" 
                        : "border-gray-200 text-gray-800 focus:border-[#1D9E75]"
                    }`}
                  >
                    <option value="">Selecione</option>
                    {fcOptions.map(opt => <option key={opt} value={opt}>{opt} bpm</option>)}
                  </select>
                  {isFCAlert(fc) && (
                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider block mt-1">⚠️ FC de Alerta</span>
                  )}
                </div>

                {/* FR irpm */}
                <div>
                  <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">FR irpm</label>
                  <select 
                    value={fr} 
                    onChange={e => setFr(e.target.value)} 
                    className={`w-full h-[44px] bg-white border rounded-[10px] px-3 text-[15px] focus:outline-none font-bold transition-all ${
                      isFRAlert(fr) 
                        ? "border-red-400 text-red-900 bg-red-50 focus:border-red-500" 
                        : "border-gray-200 text-gray-800 focus:border-[#1D9E75]"
                    }`}
                  >
                    <option value="">Selecione</option>
                    {frOptions.map(opt => <option key={opt} value={opt}>{opt} irpm</option>)}
                  </select>
                  {isFRAlert(fr) && (
                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider block mt-1">⚠️ FR de Alerta</span>
                  )}
                </div>

                {/* Temp °C */}
                <div>
                  <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Temp °C</label>
                  <select 
                    value={temp} 
                    onChange={e => setTemp(e.target.value)} 
                    className={`w-full h-[44px] bg-white border rounded-[10px] px-3 text-[15px] focus:outline-none font-bold transition-all ${
                      isTempAlert(temp) 
                        ? "border-red-400 text-red-900 bg-red-50 focus:border-red-500" 
                        : "border-gray-200 text-gray-800 focus:border-[#1D9E75]"
                    }`}
                  >
                    <option value="">Selecione</option>
                    {tempOptions.map(opt => <option key={opt} value={opt}>{opt} °C</option>)}
                  </select>
                  {isTempAlert(temp) && (
                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider block mt-1">⚠️ Febre/Hipotermia</span>
                  )}
                </div>

                {/* Sat. SpO2 % */}
                <div>
                  <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sat. SpO2 %</label>
                  <select 
                    value={spo2} 
                    onChange={e => setSpo2(e.target.value)} 
                    className={`w-full h-[44px] bg-white border rounded-[10px] px-3 text-[15px] focus:outline-none font-bold transition-all ${
                      isSpO2Alert(spo2) 
                        ? "border-red-400 text-red-900 bg-red-50 focus:border-red-500" 
                        : "border-gray-200 text-gray-800 focus:border-[#1D9E75]"
                    }`}
                  >
                    <option value="">Selecione</option>
                    {spo2Options.map(opt => <option key={opt} value={opt}>{opt} %</option>)}
                  </select>
                  {isSpO2Alert(spo2) && (
                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider block mt-1">⚠️ Saturação Baixa</span>
                  )}
                </div>

                {/* HGT mg/dL */}
                <div>
                  <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">HGT mg/dL</label>
                  <select 
                    value={hgt} 
                    onChange={e => setHgt(e.target.value)} 
                    className={`w-full h-[44px] bg-white border rounded-[10px] px-3 text-[15px] focus:outline-none font-bold transition-all ${
                      isHGTAlert(hgt) 
                        ? "border-red-400 text-red-900 bg-red-50 focus:border-red-500" 
                        : "border-gray-200 text-gray-800 focus:border-[#1D9E75]"
                    }`}
                  >
                    <option value="">Selecione</option>
                    {hgtOptions.map(opt => <option key={opt} value={opt}>{opt} mg/dL</option>)}
                  </select>
                  {isHGTAlert(hgt) && (
                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider block mt-1">⚠️ Glicemia Alterada</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm space-y-5">
              <SectionTitle title="4. Avaliação Respiratória" />
              
              <div>
                 <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">Padrão</label>
                 <div className="grid grid-cols-2 gap-y-3">
                   {["Eupneico", "Dispneico", "Taquipneico", "Bradipneico"].map(op => (
                     <div key={op} onClick={() => toggleArray(padraoResp, setPadraoResp, op)}>
                       <CheckboxItem label={op} arr={padraoResp} setArr={setPadraoResp} />
                     </div>
                   ))}
                 </div>
              </div>

              <div>
                 <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">Oxigenoterapia</label>
                 <div className="grid grid-cols-2 gap-y-3 mb-3">
                   {["Ar ambiente", "Cateter nasal", "Máscara", "Venturi"].map(op => (
                     <div key={op} onClick={() => { setOxigenioterapia(op); if (op === "Ar ambiente") setLitrosMin(""); }}>
                       <RadioItem label={op} val={oxigenioterapia} setVal={setOxigenioterapia} />
                     </div>
                   ))}
                 </div>
                 {oxigenioterapia !== "Ar ambiente" && (
                   <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                      <input type="number" placeholder="Litros/minuto" value={litrosMin} onChange={e => setLitrosMin(e.target.value)} className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none" />
                   </div>
                 )}
              </div>

              <div>
                 <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">Secreção</label>
                 <div className="flex gap-6">
                   {["Ausente", "Presente"].map(op => (
                     <div key={op} onClick={() => setSecrecao(op)}>
                       <RadioItem label={op} val={secrecao} setVal={setSecrecao} />
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm">
              <SectionTitle title="5. Avaliação Cardiovascular" />
              <div className="grid grid-cols-2 gap-y-3">
                {["Normocorado", "Hipocorado", "Cianótico", "Edema MMII", "Perfusão preservada"].map(op => (
                  <div key={op} onClick={() => toggleArray(cardio, setCardio, op)}>
                    <CheckboxItem label={op} arr={cardio} setArr={setCardio} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm">
              <SectionTitle title="6. Avaliação Gastrointestinal" />
              <div className="grid grid-cols-2 gap-y-3">
                {["Aceitando dieta", "Hiporexia", "Jejum", "Náuseas", "Vômitos", "Eliminação intestinal presente", "Constipação", "Diarreia"].map(op => (
                  <div key={op} onClick={() => toggleArray(gastro, setGastro, op)}>
                    <CheckboxItem label={op} arr={gastro} setArr={setGastro} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm">
              <SectionTitle title="7. Eliminação Urinária" />
              <div className="grid gap-y-3">
                {["Diurese espontânea", "SVD", "Fralda", "Oligúria", "Anúria"].map(op => (
                  <div key={op} onClick={() => toggleArray(urinaria, setUrinaria, op)}>
                    <CheckboxItem label={op} arr={urinaria} setArr={setUrinaria} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm space-y-5">
              <SectionTitle title="8. Pele e Lesões" />
              
              {/* Estado da Pele (Seleção Única e Obrigatória) */}
              <div className="pb-2">
                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 pb-1">
                  Estado da Pele (Seleção Única) *
                </label>
                <div className="flex gap-6">
                  <div 
                    onClick={() => {
                      setEstadoPele("íntegra");
                      setPele(["Pele íntegra"]);
                      setLocalLesao("");
                    }}
                  >
                    <RadioItem label="Pele Íntegra" val={estadoPele === "íntegra" ? "Pele Íntegra" : ""} setVal={() => {}} />
                  </div>
                  <div 
                    onClick={() => {
                      setEstadoPele("alterada");
                      // Clear "Pele íntegra" from list but preserve any custom lesions if they already existed
                      setPele(pele.filter(x => x !== "Pele íntegra"));
                    }}
                  >
                    <RadioItem label="Pele Alterada" val={estadoPele === "alterada" ? "Pele Alterada" : ""} setVal={() => {}} />
                  </div>
                </div>
              </div>

              {/* Lesões Presentes (Seleção Múltipla) */}
              <div className={`space-y-3 border-t border-gray-100 pt-3 transition-all duration-200 ${estadoPele !== "alterada" ? "opacity-35 pointer-events-none select-none" : "opacity-100"}`}>
                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Lesões Presentes (Múltipla escolha) {estadoPele === "alterada" && "*"}
                </label>
                <div className="grid grid-cols-2 gap-y-3">
                  {["Lesão por pressão", "Curativo limpo", "Curativo realizado", "Hiperemia", "Equimose"].map(op => {
                    const isChecked = pele.includes(op);
                    return (
                      <div 
                        key={op} 
                        onClick={() => {
                          if (estadoPele === "alterada") {
                            if (isChecked) {
                              setPele(pele.filter(item => item !== op));
                            } else {
                              setPele([...pele, op]);
                            }
                          }
                        }}
                        className={estadoPele !== "alterada" ? "cursor-not-allowed" : "cursor-pointer"}
                      >
                        <CheckboxItem label={op} arr={pele} setArr={() => {}} />
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {estadoPele === "alterada" && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-1 border-t border-gray-100 pt-3">
                  <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Local da lesão *</label>
                  <input required type="text" placeholder="Ex: Região sacral, calcâneo direito..." value={localLesao} onChange={e => setLocalLesao(e.target.value)} className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none" />
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 7 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm space-y-4">
              <SectionTitle title="9. Dispositivos" />
              <div className="grid grid-cols-2 gap-y-3">
                {["Acesso venoso periférico", "CVC", "SNE", "SNG", "Gastrostomia", "Traqueostomia", "Dreno", "Ostomia"].map(op => (
                  <div key={op} onClick={() => toggleArray(dispositivos, setDispositivos, op)}>
                    <CheckboxItem label={op} arr={dispositivos} setArr={setDispositivos} />
                  </div>
                ))}
              </div>
              <div className="pt-2">
                  {/* FEATURE NOVO: Local / Dispositivo torna-se visualmente obrigatório (*) caso existam dispositivos assinalados */}
                  <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Local / Dispositivo {dispositivos.length > 0 && <span className="text-red-500">*</span>}
                  </label>
                  <input type="text" placeholder="Ex: MSE, MSD, jugular direita..." value={localDispositivo} onChange={e => setLocalDispositivo(e.target.value)} className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none" />
              </div>
            </div>
          </div>
        )}

        {currentStep === 8 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm space-y-6">
              <SectionTitle title="10. Avaliação da Dor" />
              
              <div className="flex flex-col gap-3">
                 <div className="flex justify-between items-center px-1">
                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Escala (0 a 10)</span>
                    <span className={`text-2xl font-black px-4 py-1.5 rounded-2xl border transition-all ${
                      semDor ? 'text-gray-300 border-gray-100 bg-gray-50' : 
                      parseInt(dor) <= 3 ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                      parseInt(dor) <= 6 ? 'text-[#eab308] border-yellow-200 bg-yellow-50' :
                      'text-rose-600 border-rose-200 bg-rose-50'
                    }`}>
                      {semDor ? '0' : dor}
                    </span>
                 </div>
                 
                 <div className="relative pt-2">
                   <input 
                     type="range" min="0" max="10" step="1"
                     value={semDor ? "0" : dor} disabled={semDor} 
                     onChange={e => setDor(e.target.value)}
                     className={`w-full h-2 rounded-lg appearance-none cursor-pointer outline-none transition-all ${
                       semDor ? 'bg-gray-100 accent-gray-300' :
                       parseInt(dor) <= 3 ? 'bg-emerald-100 accent-emerald-500' :
                       parseInt(dor) <= 6 ? 'bg-yellow-100 accent-[#eab308]' :
                       'bg-rose-100 accent-rose-500'
                     }`}
                   />
                   <div className="flex justify-between text-[11px] font-bold text-gray-400 mt-2 px-0.5">
                     {[0,1,2,3,4,5,6,7,8,9,10].map(num => {
                       const isSelected = !semDor && dor === num.toString();
                       const valColor = semDor ? 'text-gray-300' :
                                       num <= 3 ? 'text-emerald-600 font-bold' :
                                       num <= 6 ? 'text-yellow-600 font-bold' :
                                       'text-rose-600 font-bold';
                       return (
                         <span 
                           key={num} 
                           onClick={() => !semDor && setDor(num.toString())}
                           className={`w-4 text-center cursor-pointer transition-all ${isSelected ? `${valColor} scale-125` : 'hover:text-gray-600'}`}
                         >
                           {num}
                         </span>
                       );
                     })}
                   </div>
                 </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer group w-max">
                  <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors shrink-0 ${semDor ? 'bg-[#1D9E75] border-[#1D9E75]' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                    {semDor && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <span className={`text-[14px] ${semDor ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>Sem queixas álgicas</span>
                  <input type="checkbox" className="hidden" checked={semDor} onChange={(e) => setSemDor(e.target.checked)} />
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 9 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm">
              <SectionTitle title="11. Cuidados Realizados" />
              <div className="grid grid-cols-2 gap-y-3">
                {["Banho realizado", "Mudança de decúbito", "Medicações administradas", "Curativo realizado", "Higiene oral", "Aspiração de vias aéreas", "Controle de sinais vitais", "Coleta de exames"].map(op => (
                  <div key={op} onClick={() => toggleArray(cuidados, setCuidados, op)}>
                    <CheckboxItem label={op} arr={cuidados} setArr={setCuidados} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {currentStep === 10 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-4">
                        <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm space-y-6">
              <SectionTitle title="12. Intercorrências e Registros Adicionais" />
              
              <CampoComContador 
                label="Evolução Clínica / Intercorrências *" 
                maxLength={2000} 
                value={intercorrencias} 
                onChange={setIntercorrencias} 
                placeholder="Descreva a evolução do paciente (obrigatório)..." 
                minHeight="120px" 
              />
              
              <div className="relative">
                <CampoComContador 
                  label="Medicamentos Administrados" 
                  maxLength={300} 
                  value={medicamentos} 
                  onChange={setMedicamentos} 
                  placeholder="Liste as medicações dadas..." 
                  minHeight="80px" 
                />
                <button 
                  type="button"
                  onClick={() => {
                    const template = "Medicamento: \nDose: \nVia: \nHora: \n\n";
                    setMedicamentos(prev => prev + template);
                  }}
                  className="absolute right-0 top-0 text-[10px] font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-all border border-teal-100 cursor-pointer hover:scale-95 active:scale-90"
                  title="Inserir modelo estruturado de prescrição médica"
                >
                  + Modelo Estruturado
                </button>
              </div>

              <CampoComContador 
                label="Procedimentos" 
                maxLength={500} 
                value={procedimentos} 
                onChange={setProcedimentos} 
                placeholder="Procedimentos realizados..." 
                minHeight="80px" 
              />

              <CampoComContador 
                label="Observações Gerais" 
                maxLength={1000} 
                value={observacoesGerais} 
                onChange={setObservacoesGerais} 
                placeholder="Outras observações importantes..." 
                minHeight="80px" 
              />
            </div>
          </div>
        )}

        {currentStep === 11 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-4">
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm relative overflow-hidden">
              <SectionTitle title="13. Mapa Anatômico" />
              
              <div className="text-[10px] font-bold uppercase text-gray-400 mb-2 text-center">Toque na silhueta para adicionar achados</div>
              
              <div className="flex flex-col gap-4">
                <div className="relative w-full h-[460px] bg-[#f8fafc] border border-gray-200 rounded-xl overflow-hidden flex justify-center items-center" onClick={(e) => handleImageClick(e, "front")}>
                   <div className="absolute top-3 left-3 bg-white/90 border border-gray-100 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm text-[10px] font-bold text-gray-600 uppercase pointer-events-none z-10">Vista Anterior</div>
                   <img src={frontImg} className="h-[95%] max-w-none pointer-events-none mix-blend-multiply scale-[0.95]" alt="Silhueta Frontal" />
                   
                   {markers.filter(m => m.view === "front").map((marker, idx) => (
                      <button key={marker.id} onClick={(e) => { e.stopPropagation(); setActiveMarkerId(marker.id); setEditingMarkerId(marker.id); }}
                        className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full shadow-md flex items-center justify-center transition-all border-2 text-[10px] font-bold text-white z-20 ${activeMarkerId === marker.id ? "scale-110 border-white" : "border-transparent opacity-80"} ${marker.type === 'pain' ? 'bg-red-500' : marker.type === 'wound' ? 'bg-purple-500' : 'bg-orange-500'}`} style={{ left: `${marker.x}%`, top: `${marker.y}%` }}>
                        {markers.findIndex(m => m.id === marker.id) + 1}
                      </button>
                   ))}
                </div>

                <div className="relative w-full h-[460px] bg-[#f8fafc] border border-gray-200 rounded-xl overflow-hidden flex justify-center items-center" onClick={(e) => handleImageClick(e, "back")}>
                   <div className="absolute top-3 left-3 bg-white/90 border border-gray-100 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm text-[10px] font-bold text-gray-600 uppercase pointer-events-none z-10">Vista Posterior</div>
                   <img src={backImg} className="h-[95%] max-w-none pointer-events-none mix-blend-multiply scale-[0.95]" alt="Silhueta Traseira" />
                   
                   {markers.filter(m => m.view === "back").map((marker, idx) => (
                      <button key={marker.id} onClick={(e) => { e.stopPropagation(); setActiveMarkerId(marker.id); setEditingMarkerId(marker.id); }}
                        className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full shadow-md flex items-center justify-center transition-all border-2 text-[10px] font-bold text-white z-20 ${activeMarkerId === marker.id ? "scale-110 border-white" : "border-transparent opacity-80"} ${marker.type === 'pain' ? 'bg-red-500' : marker.type === 'wound' ? 'bg-purple-500' : 'bg-orange-500'}`} style={{ left: `${marker.x}%`, top: `${marker.y}%` }}>
                        {markers.findIndex(m => m.id === marker.id) + 1}
                      </button>
                   ))}
                </div>
              </div>

              {editingMarkerId && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-200 pb-safe">
                  <div className="bg-white w-full max-w-md rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300" onClick={e => e.stopPropagation()}>
                     <div className="flex justify-between items-center border-b border-gray-50 pb-3 mb-4">
                       <span className="text-[14px] font-bold text-gray-800 uppercase tracking-widest">
                         Achado {markers.findIndex(m => m.id === editingMarkerId) + 1}
                       </span>
                       <div className="flex gap-2">
                         <button onClick={() => deleteMarker(editingMarkerId)} className="text-[10px] font-bold uppercase text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg active:scale-95 transition-all">Excluir</button>
                         <button onClick={() => setEditingMarkerId(null)} className="text-[10px] font-bold uppercase text-teal-700 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-lg active:scale-95 transition-all">Pronto</button>
                       </div>
                     </div>
                     <div className="space-y-5 pb-4">
                        <div>
                            <div className="text-[10px] font-bold uppercase text-gray-400 mb-1.5 font-sans">Região Corporal</div>
                            <div className="flex mb-4">
                              {(() => {
                                const activeMarker = markers.find(m => m.id === editingMarkerId);
                                const regions = [
                                  { key: "MMSS", label: "MMSS", desc: "Membros Superiores" },
                                  { key: "MMII", label: "MMII", desc: "Membros Inferiores" },
                                  { key: "Tórax", label: "Tórax", desc: "Tórax / Peito" },
                                  { key: "Abdômen", label: "Abdômen", desc: "Abdômen / Barriga" },
                                  { key: "Costas", label: "Costas", desc: "Costas / Dorso" }
                                ] as const;
                                const region = regions.find(r => r.key === activeMarker?.bodyPart);
                                return (
                                  <div className="w-full bg-[#E6F5F2] border border-[#1D9E75]/20 rounded-xl py-3 px-4 flex items-center justify-between shadow-sm">
                                    <div className="flex flex-col">
                                      <span className="text-[14px] font-black text-teal-800 uppercase tracking-tight">{region?.label || activeMarker?.bodyPart || "Não identificada"}</span>
                                      <span className="text-[10px] font-bold text-teal-600/80 uppercase tracking-wider mt-0.5">{region?.desc || "Região"}</span>
                                    </div>
                                    <div className="bg-[#1D9E75]/10 text-[#1D9E75] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                      <Activity className="w-3 h-3" />
                                      Auto-Sinalizado
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                        </div>
                       <div>
                           <div className="text-[10px] font-bold uppercase text-gray-400 mb-2">Tipo de Achado</div>
                           <div className="flex gap-2 focus:outline-none">
                             {(["pain", "wound", "other"] as const).map(type => (
                               <button key={type} onClick={() => updateActiveMarker({ type })}
                                 className={`flex-1 text-[12px] py-3 rounded-xl border font-bold uppercase tracking-wider transition-colors shadow-sm ${markers.find(m => m.id === editingMarkerId)?.type === type ? "bg-[#1D9E75] border-[#1D9E75] text-white" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                                 {type === "pain" ? "Dor" : type === "wound" ? "Lesão" : "Outro"}
                               </button>
                             ))}
                           </div>
                       </div>
                       
                       <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                           <div className="flex justify-between items-end mb-3">
                               <div className="text-[10px] font-bold uppercase text-gray-400">Intensidade / Gravidade</div>
                               <div className="text-xl font-black text-[#1D9E75]">{markers.find(m => m.id === editingMarkerId)?.intensity || 5} <span className="text-[12px] text-gray-400 font-semibold">/10</span></div>
                           </div>
                           <input type="range" min="1" max="10" value={markers.find(m => m.id === editingMarkerId)?.intensity || 5} onChange={(e) => updateActiveMarker({ intensity: parseInt(e.target.value) })} className="w-full accent-[#1D9E75] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                           <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-wider">
                               <span>Leve</span>
                               <span>Moderada</span>
                               <span>Grave</span>
                           </div>
                       </div>

                       <div>
                           <div className="text-[10px] font-bold uppercase text-gray-400 mb-2">Observações Adicionais</div>
                            <textarea value={markers.find(m => m.id === editingMarkerId)?.observations || ""} onChange={(e) => updateActiveMarker({ observations: e.target.value })} placeholder="Detalhes do achado..." className="w-full bg-white border border-gray-200 p-3 rounded-xl text-[14px] font-medium text-gray-900 outline-none focus:border-[#1D9E75] resize-none min-h-[80px] shadow-sm" />
                       </div>
                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button is only available on the last step */}
            <div className="pt-4">
              <button 
                onClick={handleSave} 
                disabled={isSigning || (currentStep === 0 && !periodo)}
                className={`w-full bg-[#1D9E75] hover:bg-[#0F6E56] active:scale-[0.98] text-white font-semibold text-[16px] h-[52px] rounded-[14px] flex justify-center items-center gap-2 transition-all shadow-sm ${isSigning ? 'opacity-80 cursor-wait' : ''}`}
              >
                {isSigning ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Gravando no Blockchain (Stellar)...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Salvar Evolução
                  </>
                )}
              </button>
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      <div className="flex gap-3 pt-2 shrink-0">
        <button 
          onClick={() => {
            if (currentStep === 0) {
              if (onBack) onBack();
            } else {
              prevStep();
            }
          }}
          disabled={isSigning}
          className="flex-1 h-[52px] flex items-center justify-center gap-1.5 rounded-[14px] font-semibold text-[15px] transition-all border border-gray-200 text-gray-750 bg-white hover:bg-gray-50 active:scale-[0.98] cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" /> {currentStep === 0 ? "Cancelar" : "Anterior"}
        </button>
        
        {currentStep < STEPS.length - 1 && (
          <button 
            onClick={nextStep}
            disabled={isSigning}
            className="flex-[2] bg-gray-900 hover:bg-black active:scale-[0.98] text-white font-semibold text-[15px] h-[52px] rounded-[14px] flex justify-center items-center gap-1 transition-all shadow-sm cursor-pointer"
          >
            Avançar <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Success Toast */}
      {success && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-teal-50 text-teal-900 px-4 py-4 rounded-2xl shadow-xl flex flex-col gap-3 border border-teal-200 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 w-[90%] max-w-sm">
          <div className="flex items-center gap-2 text-teal-700 font-bold uppercase tracking-wider text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-teal-600"/>
            Registrado no Blockchain (Stellar)
          </div>
          
          <div className="space-y-2">
            <div>
              <div className="text-[10px] font-bold text-teal-600 uppercase mb-0.5 tracking-wider">TX ID (Recibo)</div>
              <div className="font-mono text-[12px] bg-white px-2 py-1.5 rounded-lg border border-teal-100 text-gray-600 select-all break-all overflow-hidden truncate">
                {stellarTxId}
              </div>
            </div>
            
            <div>
              <div className="text-[10px] font-bold text-teal-600 uppercase mb-0.5 tracking-wider">Hash de Integridade (SHA-256)</div>
              <div className="font-mono text-[10px] bg-white px-2 py-1.5 rounded-lg border border-teal-100 text-gray-500 select-all break-all line-clamp-2">
                {txHash}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {modalAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 font-bold text-lg">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{modalAlert.title}</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">{modalAlert.message}</p>
            <button 
              onClick={() => setModalAlert(null)}
              className="mt-2 w-full bg-[#1D9E75] hover:bg-[#0F6E56] text-white font-semibold py-3 rounded-xl transition-all active:scale-95 text-sm"
            >
              Ok, compreendi
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {modalConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-600 font-bold text-lg">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{modalConfirm.title}</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">{modalConfirm.message}</p>
            <div className="flex gap-3 mt-2">
              <button 
                onClick={modalConfirm.onCancel}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all active:scale-95 border border-gray-200 text-sm"
              >
                Voltar
              </button>
              <button 
                onClick={modalConfirm.onConfirm}
                className="flex-1 bg-[#1D9E75] hover:bg-[#0F6E56] text-white font-semibold py-3 rounded-xl transition-all active:scale-95 text-sm"
              >
                Sim, avançar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


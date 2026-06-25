import { useState, useEffect, useMemo } from "react";
import { Activity, Thermometer, Heart, Wind } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { Patient, MetricPoint, User } from "../types";
import { verificarAlertas } from "../lib/alerts";
import { AlertaClinico } from "./AlertaClinico";
import { ListaPacientes } from "./ListaPacientes";
import { AnimatePresence, motion } from "motion/react";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const spo2Data = payload.find((p: any) => p.dataKey === "spo2");
    const tempData = payload.find((p: any) => p.dataKey === "temp");
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-lg text-xs leading-relaxed z-[9999]">
        <p className="font-mono text-gray-500 mb-1.5 font-bold">⏱️ Horário: {label}</p>
        {spo2Data && (
          <p className="font-semibold text-[#2A9D8F]">
            ● SpO2: <span className="font-bold">{spo2Data.value}%</span>{" "}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 ${
              spo2Data.value >= 94 ? "bg-emerald-50 text-emerald-600" :
              spo2Data.value >= 90 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
            }`}>
              {spo2Data.value >= 94 ? "Normal" : spo2Data.value >= 90 ? "Atenção" : "CRÍTICO"}
            </span>
          </p>
        )}
        {tempData && (
          <p className="font-semibold text-[#E76F51] mt-1">
            ● Temp: <span className="font-bold">{parseFloat(tempData.value).toFixed(1)}°C</span>{" "}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 ${
              tempData.value < 36.0 ? "bg-blue-50 text-blue-600" :
              tempData.value <= 37.5 ? "bg-emerald-50 text-emerald-600" :
              tempData.value <= 38.0 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
            }`}>
              {tempData.value < 36.0 ? "Hipotermia" :
               tempData.value <= 37.5 ? "Normal" :
               tempData.value <= 38.0 ? "Subfebril" : "FEBRE"}
            </span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

export interface DashboardProps {
  patients: Patient[];
  metricsByPatient: Record<string, MetricPoint[]>;
  user: User;
}

export function Dashboard({ patients, metricsByPatient, user }: DashboardProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedPatient && !patients.find((p) => p.id === selectedPatient.id)) {
      setSelectedPatient(null);
      setViewState("list");
    }
  }, [patients, selectedPatient]);

  const [viewState, setViewState] = useState<"list" | "details">("list");

  useEffect(() => {
    if (selectedPatient) {
      setViewState("details");
    }
  }, [selectedPatient]);

  const currentMetrics = selectedPatient
    ? metricsByPatient[selectedPatient.id] || []
    : [];
    
  const latestMetric =
    currentMetrics.length > 0
      ? currentMetrics[currentMetrics.length - 1]
      : null;

  const currentAlerts = useMemo(() => {
    if (!latestMetric) return [];
    return verificarAlertas(latestMetric);
  }, [latestMetric]);

  const activeAlerts = currentAlerts.filter((a, i) => !dismissedAlerts[`${selectedPatient?.id}-${i}`]);

  return (
    <div className="animate-in fade-in duration-300 h-full flex flex-col gap-4">
      {viewState === "list" && (
        <div className="flex flex-col h-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-1 px-1">
            <h1 className="text-[20px] font-black text-gray-950 tracking-tight">
              Meus Pacientes
            </h1>
            <p className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-widest leading-none">
              Selecione para monitoramento
            </p>
          </div>
          <ListaPacientes 
            patients={patients} 
            metricsByPatient={metricsByPatient} 
            selectedPatientId={selectedPatient?.id || null} 
            onSelectPatient={setSelectedPatient} 
          />
        </div>
      )}

      {viewState === "details" && selectedPatient && (
        <div className="flex flex-col bg-white border border-gray-100 rounded-2xl p-4 shadow-sm pb-10">
          <button 
            onClick={() => { setSelectedPatient(null); setViewState("list"); }}
            className="flex items-center gap-2 text-teal-700 bg-teal-50 hover:bg-teal-100 px-4 py-2.5 rounded-xl text-sm font-bold transition-all w-fit mb-5"
          >
            ← Voltar para Lista
          </button>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[20px] font-black text-gray-950 tracking-tight">
                {selectedPatient.nome_ficticio}
              </h2>
              <p className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-widest mt-1.5 leading-none">
                Leito {selectedPatient.numero_leito} • Ref: {selectedPatient.id}
              </p>
              {selectedPatient.tecnico_responsavel && (
                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mt-1.5 flex items-center gap-1">
                  <span>👤 Técnico Resp:</span>
                  <span className="bg-teal-50 px-2 py-0.5 rounded border border-teal-100">{selectedPatient.tecnico_responsavel.nome} — Mat. {selectedPatient.tecnico_responsavel.matricula}</span>
                </p>
              )}
              {/* FEATURE NOVO: Renderiza técnicos adicionais responsáveis do plantão no cabeçalho do paciente */}
              {selectedPatient.tecnicos_adicionais && selectedPatient.tecnicos_adicionais.length > 0 && (
                <div className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-1">
                  <span>👥 Técnicos Adicionais:</span>
                  {selectedPatient.tecnicos_adicionais.map((tech, idx) => (
                    <span key={idx} className="bg-teal-50 px-2 py-0.5 rounded border border-teal-100">{tech.nome} — Mat. {tech.matricula}</span>
                  ))}
                </div>
              )}
            </div>
            <span className={`text-[9px] px-2 py-1 rounded-md border font-bold tracking-wider uppercase ${
              latestMetric ? "bg-teal-50 border-teal-200 text-teal-700" : "bg-gray-50 border-gray-200 text-gray-500"
            }`}>
              {latestMetric ? "MONITORADO" : "SEM DADOS"}
            </span>
          </div>

          {/* Sumário Executivo IA */}
          <div className="mb-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-3 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Activity className="w-12 h-12 text-indigo-900" />
            </div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <h3 className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">Sumário Executivo IA</h3>
            </div>
            <p className="text-[11px] text-indigo-900/80 leading-relaxed font-medium pb-1 relative z-10">
              {(() => {
                if (!latestMetric) {
                  return `Paciente admitido por ${selectedPatient.diagnostico_principal || "diagnóstico não especificado"}. Sem evoluções recentes. Aguardando nova avaliação para geração de sumário clínico.`;
                }
                
                // FEATURE NOVO: Geração dinâmica de sumário clínico assertivo
                const statusStr = activeAlerts.length > 0 ? "alerta ativo (requer atenção)" : "estável";
                const tempVal = latestMetric.temp ? `${latestMetric.temp}°C` : "--";
                const paVal = (latestMetric.sys && latestMetric.dia) ? `${latestMetric.sys}/${latestMetric.dia}` : "--/--";
                const fcVal = latestMetric.fc ? `${latestMetric.fc} bpm` : "--";
                const frVal = latestMetric.fr ? `${latestMetric.fr} irpm` : "--";
                const spo2Val = latestMetric.spo2 ? `${latestMetric.spo2}%` : "--";
                const painVal = latestMetric.pain > 0 ? `Dor ${latestMetric.pain}/10` : "Sem queixas álgicas";
                
                const ed = latestMetric.evolutionData || {};
                const consVal = ed.consciencia ? (Array.isArray(ed.consciencia) ? ed.consciencia.join(', ') : String(ed.consciencia)) : "Não registrado";
                const padraoResp = ed.padraoResp ? (Array.isArray(ed.padraoResp) ? ed.padraoResp.join(', ') : String(ed.padraoResp)) : "Não registrado";
                const interc = ed.intercorrencias ? String(ed.intercorrencias) : "Nenhuma intercorrência";
                
                return `Sumário Clínico — ${selectedPatient.diagnostico_principal || "Sem registro"}. Condição geral: ${statusStr}.
• Sinais Vitais: PA ${paVal} mmHg | FC ${fcVal} | SpO2 ${spo2Val} | FR ${frVal} | Temp ${tempVal}. ${painVal}.
• Neurológico/Respiratório: Consciência ${consVal}. Padrão respiratório ${padraoResp}.
• Ocorrências Recentes: ${interc}.`.slice(0, 1000);
              })()}
            </p>
          </div>
          
          {/* Alertas */}
          <div className="mb-4 space-y-2">
            <AnimatePresence>
              {activeAlerts.map((alerta, i) => (
                <motion.div
                  key={`${selectedPatient.id}-${i}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <AlertaClinico 
                    alerta={alerta} 
                    onDismiss={() => setDismissedAlerts(prev => ({...prev, [`${selectedPatient.id}-${i}`]: true}))} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex flex-col justify-between h-20">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Temp</span>
                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <div className="text-lg font-bold text-gray-900 flex items-baseline gap-1 mt-auto">
                {latestMetric ? latestMetric.temp : "--"}
                <span className="text-[10px] text-gray-500 font-medium">°C</span>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex flex-col justify-between h-20">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">SpO2</span>
                <Wind className="w-3.5 h-3.5 text-sky-500" />
              </div>
              <div className="text-lg font-bold text-gray-900 flex items-baseline gap-1 mt-auto">
                {latestMetric ? latestMetric.spo2 : "--"}
                <span className="text-[10px] text-gray-500 font-medium">%</span>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex flex-col justify-between h-20">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">PA</span>
                <Heart className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="text-lg font-bold text-gray-900 flex items-baseline gap-1 mt-auto">
                {latestMetric ? `${latestMetric.sys}/${latestMetric.dia}` : "--/--"}
                <span className="text-[10px] text-gray-500 font-medium">mmHg</span>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex flex-col justify-between h-20">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Dor</span>
                <Activity className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <div className="text-lg font-bold text-gray-900 flex items-baseline gap-1 mt-auto leading-none">
                {latestMetric ? latestMetric.pain : "--"}
                <span className="text-[10px] text-gray-500 font-medium">/10</span>
              </div>
              {latestMetric?.diurese_anomalia && <span className="text-[8px] text-orange-600 font-bold uppercase mt-1 absolute bottom-2 right-2">Anomalia💧</span>}
            </div>
          </div>

          {/* Chart */}
          {(() => {
            const hasLowSpO2InHistory = currentMetrics.some(m => m.spo2 < 94);
            const hasHighTempInHistory = currentMetrics.some(m => m.temp > 38.0);
            
            return (
              <div className="flex flex-col bg-white rounded-2xl border border-gray-100 p-4 h-[350px] shadow-sm select-none">
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Sinais Vitais por Evolução</h3>
                    <p className="text-[9px] font-semibold text-gray-400 mt-0.5">Evolução do plantão com faixas de referência clínica</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {hasLowSpO2InHistory && (
                      <span className="inline-flex items-center gap-1 text-[8px] font-bold bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-md animate-pulse">
                        ⚠️ SpO2 Histórica &lt; 94%
                      </span>
                    )}
                    {hasHighTempInHistory && (
                      <span className="inline-flex items-center gap-1 text-[8px] font-bold bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded-md animate-pulse">
                        🌡️ Febre Histórica &gt; 38°C
                      </span>
                    )}
                  </div>
                </div>

                {/* Aesthetic clinical legend bar with shape guide */}
                <div className="flex flex-wrap items-center justify-between gap-y-1 border-b border-gray-100 pb-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-[#2A9D8F] inline-block" />
                      SpO2 (%) — Linha Sólida
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-600">
                      <span className="w-2 h-2 bg-[#E76F51] inline-block" />
                      Temp (°C) — Linha Tracejada
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[8px] font-bold tracking-wider text-gray-400 uppercase">
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" /> Normal</span>
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#BA7517]" /> Atenção</span>
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#E24B4A]" /> Crítico</span>
                  </div>
                </div>

                <div className="flex-1 w-full relative">
                  {currentMetrics.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={currentMetrics} margin={{ top: 10, right: -5, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                        
                        {/* Reference Areas for SpO2 (Left Y-Axis: scale 85 to 102) */}
                        <ReferenceArea {...({ y1: 85, y2: 90, fill: "rgba(226, 75, 74, 0.07)", yAxisId: "left" } as any)} />
                        <ReferenceArea {...({ y1: 90, y2: 94, fill: "rgba(186, 117, 23, 0.07)", yAxisId: "left" } as any)} />
                        <ReferenceArea {...({ y1: 94, y2: 102, fill: "rgba(29, 158, 117, 0.07)", yAxisId: "left" } as any)} />
                        
                        {/* Reference Lines for Temperature (Right Y-Axis: simple dashed guides, no internal label clutter) */}
                        <ReferenceLine {...({ y: 37.5, yAxisId: "right", stroke: "#eab308", strokeDasharray: "3 3" } as any)} />
                        <ReferenceLine {...({ y: 38.0, yAxisId: "right", stroke: "#ef4444", strokeDasharray: "3 3" } as any)} />

                        <XAxis 
                          dataKey="time" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: "#94a3b8", fontFamily: "monospace" }} 
                          dy={10} 
                        />
                        
                        <YAxis 
                          yAxisId="left" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: "#2A9D8F", fontFamily: "monospace", fontWeight: "bold" }} 
                          domain={[85, 102]} 
                          ticks={[85, 90, 94, 100, 102]}
                          tickFormatter={(v) => `${v}%`}
                          width={32}
                        />
                        
                        <YAxis 
                          yAxisId="right" 
                          orientation="right" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: "#E76F51", fontFamily: "monospace", fontWeight: "bold" }} 
                          domain={[34, 43]} 
                          ticks={[34, 36, 37.5, 38.0, 40, 42, 43]}
                          tickFormatter={(v) => v === 38 ? '38° Febre' : v === 37.5 ? '37.5° Sub.' : `${v}°C`}
                          width={60}
                        />
                        
                        <Tooltip content={<CustomTooltip />} />
                        
                        <Line 
                          yAxisId="left" 
                          type="monotone" 
                          dataKey="spo2" 
                          name="SpO2"
                          stroke="#2A9D8F" 
                          strokeWidth={2.5} 
                          dot={{ r: 5, fill: "#2A9D8F", strokeWidth: 1, stroke: "#fff" }} 
                          activeDot={{ r: 7 }} 
                        />
                        
                        <Line 
                          yAxisId="right" 
                          type="monotone" 
                          dataKey="temp" 
                          name="Temp"
                          stroke="#E76F51" 
                          strokeWidth={2.5} 
                          strokeDasharray="5 4"
                          dot={(props: any) => {
                            const { cx, cy } = props;
                            if (cx === undefined || cy === undefined) return null;
                            return (
                              <rect 
                                key={`dot-temp-${cx}-${cy}`}
                                x={cx - 4} 
                                y={cy - 4} 
                                width={8} 
                                height={8} 
                                fill="#E76F51" 
                                stroke="#fff" 
                                strokeWidth={1} 
                              />
                            );
                          }}
                          activeDot={{ r: 7 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 font-bold text-[10px]">
                      <Activity className="w-5 h-5 mb-1 opacity-50 animate-pulse" />
                      AGUARDANDO DADOS
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

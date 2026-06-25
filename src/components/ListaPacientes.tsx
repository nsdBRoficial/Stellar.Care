import { useState, useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import { Patient, MetricPoint } from "../types";
import { verificarAlertas } from "../lib/alerts";
import { AnimatePresence, motion } from "motion/react";

interface ListaPacientesProps {
  patients: Patient[];
  metricsByPatient: Record<string, MetricPoint[]>;
  selectedPatientId: string | null;
  onSelectPatient: (patient: Patient) => void;
}

export function ListaPacientes({ patients, metricsByPatient, selectedPatientId, onSelectPatient }: ListaPacientesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSector, setFilterSector] = useState("todos");
  
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchSearch = (p.nome_ficticio || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.numero_leito || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchSector = filterSector === "todos" || p.setor === filterSector;
      return matchSearch && matchSector;
    });
  }, [patients, searchTerm, filterSector]);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar paciente ou leito..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none transition-all placeholder-gray-400"
          />
        </div>
        
        <select
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none transition-all text-gray-900"
        >
          <option value="todos">Todos os Setores</option>
          <option value="Emergência">Emergência</option>
          <option value="UTI">UTI</option>
          <option value="Internação Clínica">Internação Clínica</option>
        </select>
      </div>

      <motion.div className="space-y-2 overflow-y-auto flex-1 mt-2">
        <AnimatePresence mode="popLayout">
          {filteredPatients.length === 0 && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-400 text-xs font-semibold text-center mt-4"
            >
              Nenhum paciente encontrado.
            </motion.p>
          )}
          
          {filteredPatients.map((p) => {
            const pMetrics = metricsByPatient[p.id] || [];
            const pLatest = pMetrics.length > 0 ? pMetrics[pMetrics.length - 1] : null;
            const hasAlert = pLatest ? verificarAlertas(pLatest).length > 0 : false;
            
            const hasLowSpO2 = pMetrics.some(m => m.spo2 < 94);
            const hasHighTemp = pMetrics.some(m => m.temp > 38.0);
            
            return (
              <motion.button
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                key={p.id}
                onClick={() => onSelectPatient(p)}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                  selectedPatientId === p.id 
                    ? "bg-teal-50 border-teal-200 shadow-sm" 
                    : "bg-white border-gray-100 hover:bg-gray-50 active:scale-[0.98]"
                }`}
              >
                <div className="flex justify-between items-start mb-1.5 gap-2">
                  <h4 className={`text-[15px] font-bold tracking-tight flex items-center gap-1.5 ${selectedPatientId === p.id ? "text-gray-950" : "text-gray-900"}`}>
                    {hasAlert && <ShieldAlert className="w-4 h-4 text-red-500" />}
                    {p.nome_ficticio}
                  </h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    {hasLowSpO2 && (
                      <span className="inline-flex items-center text-[9px] font-extrabold bg-red-50 text-red-600 border border-red-100 px-1 py-0.5 rounded tracking-wide uppercase">
                        ⚠️ SpO2
                      </span>
                    )}
                    {hasHighTemp && (
                      <span className="inline-flex items-center text-[9px] font-extrabold bg-orange-50 text-orange-600 border border-orange-100 px-1 py-0.5 rounded tracking-wide uppercase">
                        🌡️ Temp
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-md font-bold whitespace-nowrap uppercase tracking-wider">
                      L: {p.numero_leito}
                    </span>
                  </div>
                </div>
                <p className="text-[12px] text-gray-500 line-clamp-1 mb-2.5 font-medium leading-relaxed">
                  {p.diagnostico_principal || "Sem diagnóstico inicial"}
                </p>
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                  <span>{p.setor}</span>
                  <span className={selectedPatientId === p.id ? "text-teal-600" : "text-gray-300"}>
                    #{p.id.substring(0, 4)}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

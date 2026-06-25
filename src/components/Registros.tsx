import { useState } from "react";
import { ClipboardList, Calendar, Activity, CheckCircle2, FileText, LogOut, X } from "lucide-react";
import { Patient, MetricPoint, PatientStatus } from "../types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RegistrosProps {
  patients: Patient[];
  metricsByPatient: Record<string, MetricPoint[]>;
  onDischargePatient: (
    patientId: string,
    status: PatientStatus,
    details?: { medicoAlta?: string; observacoesAlta?: string; unidadeTransferencia?: string }
  ) => void;
}

export function Registros({ patients, metricsByPatient, onDischargePatient }: RegistrosProps) {
  const [showModalAlta, setShowModalAlta] = useState<string | null>(null); // patientId
  const [medicoAlta, setMedicoAlta] = useState("");
  const [tipoAlta, setTipoAlta] = useState("melhorado");
  const [unidadeDestino, setUnidadeDestino] = useState("");
  const [observacoesAlta, setObservacoesAlta] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const formatarData = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const exportarPDF = (patient: Patient) => {
    const records = metricsByPatient[patient.id] || [];
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const corPrimaria: [number, number, number] = [29, 158, 117]; 
    const corCinza: [number, number, number] = [80, 80, 80];
    const pageW = 210;
    let y = 15;

    // Header
    doc.setFillColor(...corPrimaria);
    doc.rect(0, 0, pageW, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("StellarCare – Clínica & Assist.", 14, 11);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("REGISTRO DE EVOLUÇÃO CLÍNICA", 14, 19);
    doc.text(`Emitido em: ${formatarData(new Date().toISOString())}`, pageW - 14, 19, { align: "right" });
    y = 36;

    // Patient Data
    doc.setTextColor(...corPrimaria);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO PACIENTE", 14, y);
    y += 6;

    doc.setDrawColor(...corPrimaria);
    doc.setLineWidth(0.5);
    doc.line(14, y, pageW - 14, y);
    y += 5;

    doc.setTextColor(...corCinza);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const linhasPaciente = [
      ["Paciente:", patient.nome_ficticio, "Leito:", patient.numero_leito],
      ["Nascimento:", formatarData(patient.data_nascimento).split(" ")[0], "Idade:", `${patient.idade_aparente} anos`],
      ["Internação:", patient.data_internacao ? formatarData(patient.data_internacao).split(" ")[0] : "", "Médico Resp.:", patient.medico_responsavel],
      ["Técnico Resp.:", patient.tecnico_responsavel ? `${patient.tecnico_responsavel.nome} — Mat. ${patient.tecnico_responsavel.matricula}` : "Não informado", "Status:", patient.status.toUpperCase()],
    ];

    // FEATURE NOVO: Adiciona linha extra no cabeçalho do PDF com os técnicos adicionais se houverem
    if (patient.tecnicos_adicionais && patient.tecnicos_adicionais.length > 0) {
      const adict = patient.tecnicos_adicionais.map(t => `${t.nome} (Mat. ${t.matricula})`).join(", ");
      linhasPaciente.push(["Técs Adics:", adict, "", ""]);
    }

    if (patient.status === "transferido") {
      linhasPaciente.push(["Origem:", patient.setor || "Não informado", "Destino:", patient.unidade_transferencia || "Não informado"]);
    }

    linhasPaciente.forEach(([l1, v1, l2, v2]) => {
      doc.setFont("helvetica", "bold");
      doc.text(l1, 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(v1 || "", 40, y);
      doc.setFont("helvetica", "bold");
      doc.text(l2, 110, y);
      doc.setFont("helvetica", "normal");
      doc.text(v2 || "", 135, y);
      y += 6;
    });
    y += 4;

    // FEATURE NOVO: Geração e inclusão de Sumário Executivo em ordem Cefalocaudal com alta precisão nos dados
    if (y > 200) { doc.addPage(); y = 20; }
    
    doc.setFillColor(245, 247, 250); // Fundo cinza claro para destacar
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.3);
    
    const sumarioLines = (() => {
      if (records.length === 0) {
        return [`Paciente admitido sob diagnóstico de ${patient.diagnostico_principal || "não informado"}. Sem evoluções registradas no momento.`];
      }
      const latest = records[records.length - 1];
      const ed = latest.evolutionData || {};
      
      const statusStr = (latest.pain && latest.pain > 4) || (latest.temp && latest.temp > 37.8) || (latest.spo2 && latest.spo2 < 93) 
        ? "Requer atenção clínica" 
        : "Estabilidade clínica";
        
      const consVal = ed.consciencia ? (Array.isArray(ed.consciencia) ? ed.consciencia.join(', ') : String(ed.consciencia)) : "Não registrado";
      const orientVal = ed.orientacao ? String(ed.orientacao) : "Não registrado";
      const padraoResp = ed.padraoResp ? (Array.isArray(ed.padraoResp) ? ed.padraoResp.join(', ') : String(ed.padraoResp)) : "Não registrado";
      const oxigenoterapia = ed.oxigenioterapia ? `${ed.oxigenioterapia} ${ed.litrosMin ? '(' + ed.litrosMin + ' L/min)' : ''}` : "Ar ambiente";
      const interc = ed.intercorrencias ? String(ed.intercorrencias) : "Nenhuma";
      const medicamentos = ed.medicamentos ? String(ed.medicamentos) : "Nenhum específico listado";

      return [
        `• QUADRO ATUAL: ${patient.diagnostico_principal || "Sem diagnóstico"}. Status: ${statusStr}.`,
        `• SINAIS VITAIS: PA ${latest.sys || "--"}/${latest.dia || "--"} mmHg, FC ${latest.fc || "--"} bpm, FR ${latest.fr || "--"} irpm, SpO2 ${latest.spo2 || "--"}%, Temp ${latest.temp || "--"}ºC. Dor crônica: ${latest.pain || 0}/10.`,
        `• NEUROLÓGICO E RESPIRATÓRIO: Consciência ${consVal}, Orientação ${orientVal}. Padrão respiratório ${padraoResp}. Suporte de O2: ${oxigenoterapia}.`,
        `• INTERCORRÊNCIAS/MEDICAÇÕES: Intercorrências registradas: ${interc}. Medicações relatadas: ${medicamentos}.`
      ];
    })();

    // Calcular tamanho do box
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    
    let totalLinesCount = 0;
    const formattedLines: string[] = [];
    
    sumarioLines.forEach(lineText => {
      const wrapped = doc.splitTextToSize(lineText, pageW - 36);
      formattedLines.push(...wrapped);
      formattedLines.push(""); // Linha em branco de separador
      totalLinesCount += wrapped.length + 0.5; 
    });

    const boxHeight = (totalLinesCount * 4.5) + 14;
    
    if (y + boxHeight > 280) { doc.addPage(); y = 20; }
    
    doc.setFillColor(245, 247, 250); // Fundo cinza claro para destacar
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, y, pageW - 28, boxHeight, 3, 3, "FD");
    
    doc.setTextColor(...corPrimaria);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("SUMÁRIO CLÍNICO", 18, y + 6);
    
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    
    let currentY = y + 12;
    sumarioLines.forEach(lineText => {
      const wrapped = doc.splitTextToSize(lineText, pageW - 36);
      doc.text(wrapped, 18, currentY);
      currentY += (wrapped.length * 4.5) + 2.5; 
    });
    
    y += boxHeight + 8;

    // Evolutions
    records.forEach((ev, idx) => {
      if (y > 230) { doc.addPage(); y = 20; }

      doc.setFillColor(240, 253, 250);
      doc.roundedRect(14, y - 4, pageW - 28, 10, 2, 2, "F");
      doc.setTextColor(...corPrimaria);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`EVOLUÇÃO ${idx + 1}  —  ${ev.time}`, 17, y + 2);
      y += 10;

      // Sinais Vitais
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...corPrimaria);
      doc.text("SINAIS VITAIS", 14, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [["PA (mmHg)", "Temp (°C)", "SpO2 (%)", "FC (bpm)", "FR (irpm)", "Dor/10"]],
        body: [[
          `${ev.sys}/${ev.dia}`,
          `${ev.temp}°C`,
          `${ev.spo2}%`,
          `${ev.fc} bpm`,
          `${ev.fr} irpm`,
          `${ev.pain}/10`
        ]],
        theme: "grid",
        headStyles: { fillColor: corPrimaria, textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 9, textColor: corCinza },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 6;

      const ed = ev.evolutionData;
      if (ed) {
         if (y > 250) { doc.addPage(); y = 20; }
         
         const sections = [];
         if (ed.periodo) sections.push(`PERÍODO/HORÁRIO REGISTRADO: ${ed.periodo}`);
         if (ed.estadoGeral) sections.push(`ESTADO GERAL: ${ed.estadoGeral}`);
         
         // Fix type parsing bugs in case they are list arrays or raw strings
         if (ed.consciencia) {
           const consVal = Array.isArray(ed.consciencia) ? ed.consciencia.join(', ') : String(ed.consciencia);
           const orientVal = ed.orientacao ? ` (${ed.orientacao})` : '';
           sections.push(`CONSCIÊNCIA: ${consVal}${orientVal}`);
         }
         if (ed.mobilidade) {
           const mobVal = Array.isArray(ed.mobilidade) ? ed.mobilidade.join(', ') : String(ed.mobilidade);
           const mobOutroVal = ed.mobilidadeOutro ? ` (${ed.mobilidadeOutro})` : '';
           sections.push(`MOBILIDADE: ${mobVal}${mobOutroVal}`);
         }
         
         if (ed.padraoResp && ed.padraoResp.length) sections.push(`PADRÃO RESPIRATÓRIO: ${Array.isArray(ed.padraoResp) ? ed.padraoResp.join(', ') : String(ed.padraoResp)}`);
         if (ed.oxigenioterapia) sections.push(`OXIGENOTERAPIA: ${ed.oxigenioterapia} ${ed.litrosMin ? '('+ed.litrosMin+' L/min)' : ''}`);
         if (ed.secrecao) sections.push(`SECREÇÃO: ${ed.secrecao}`);
         if (ed.cardio && ed.cardio.length) sections.push(`CARDIOVASCULAR: ${Array.isArray(ed.cardio) ? ed.cardio.join(', ') : String(ed.cardio)}`);
         if (ed.gastro && ed.gastro.length) sections.push(`GASTROINTESTINAL: ${Array.isArray(ed.gastro) ? ed.gastro.join(', ') : String(ed.gastro)}`);
         if (ed.urinaria && ed.urinaria.length) sections.push(`ELIMINAÇÃO URINÁRIA: ${Array.isArray(ed.urinaria) ? ed.urinaria.join(', ') : String(ed.urinaria)}`);
         if (ed.pele && ed.pele.length) sections.push(`PELE/LESÕES: ${Array.isArray(ed.pele) ? ed.pele.join(', ') : String(ed.pele)}` + (ed.localLesao ? ` - Local: ${ed.localLesao}` : ''));
         if (ed.dispositivos && ed.dispositivos.length) sections.push(`DISPOSITIVOS: ${Array.isArray(ed.dispositivos) ? ed.dispositivos.join(', ') : String(ed.dispositivos)}` + (ed.localDispositivo ? ` - Local: ${ed.localDispositivo}` : ''));
         if (ed.cuidados && ed.cuidados.length) sections.push(`CUIDADOS REALIZADOS: ${Array.isArray(ed.cuidados) ? ed.cuidados.join(', ') : String(ed.cuidados)}`);
         
         if (ed.intercorrencias) sections.push(`EVOLUÇÃO CLÍNICA / INTERCORRÊNCIAS: ${ed.intercorrencias}`);
         if (ed.medicamentos) sections.push(`MEDICAMENTOS ADMINISTRADOS: ${ed.medicamentos}`);
         if (ed.procedimentos) sections.push(`PROCEDIMENTOS: ${ed.procedimentos}`);
         if (ed.observacoesGerais) sections.push(`OBSERVAÇÕES GERAIS: ${ed.observacoesGerais}`);
         
         if (sections.length > 0) {
             doc.setFont("helvetica", "bold");
             doc.setFontSize(9);
             doc.setTextColor(...corPrimaria);
             doc.text("AVALIAÇÃO CLÍNICA", 14, y);
             y += 4;
             doc.setFont("helvetica", "normal");
             doc.setTextColor(...corCinza);
             doc.setFontSize(9);
             
             sections.forEach(sec => {
                 if (y > 275) { doc.addPage(); y = 20; }
                 
                 const offset = sec.indexOf(':');
                 if (offset !== -1) {
                     const title = sec.substring(0, offset + 1);
                     const content = sec.substring(offset + 1).trim();
                     
                     doc.setFont("helvetica", "bold");
                     doc.setTextColor(40, 40, 40);
                     doc.text(title, 14, y);
                     
                     const titleWidth = doc.getTextWidth(title + " ");
                     
                     doc.setFont("helvetica", "normal");
                     doc.setTextColor(...corCinza);
                     
                     const lines = doc.splitTextToSize(content, pageW - 28 - titleWidth);
                     if (lines.length === 1 && titleWidth < 80) {
                         doc.text(lines, 14 + titleWidth, y);
                         y += 6;
                     } else {
                         const fullLines = doc.splitTextToSize(content, pageW - 28);
                         doc.text(fullLines, 14, y + 5);
                         y += (fullLines.length * 5) + 6;
                     }
                 } else {
                     const lines = doc.splitTextToSize(sec, pageW - 28);
                     doc.text(lines, 14, y);
                     y += (lines.length * 5) + 6;
                 }
             });
             y += 4;
         }

         if (ed.markers && ed.markers.length > 0) {
             if (y > 250) { doc.addPage(); y = 20; }
             doc.setFont("helvetica", "bold");
             doc.setFontSize(9);
             doc.setTextColor(...corPrimaria);
             doc.text("ACHADOS ANATÔMICOS", 14, y);
             y += 2;
             
             autoTable(doc, {
                 startY: y,
                 head: [["Vista", "Região", "Tipo", "Intensidade", "Observações"]],
                 body: ed.markers.map((m: any) => [
                     m.view === 'front' ? 'Ant.' : 'Post.',
                     m.bodyPart || 'Não especificado',
                     m.type === 'pain' ? 'Dor' : m.type === 'wound' ? 'Lesão' : 'Outro',
                     `${m.intensity}/10`,
                     m.observations || '-'
                 ]),
                 theme: "grid",
                 headStyles: { fillColor: [240, 240, 240], textColor: corCinza, fontSize: 8 },
                 bodyStyles: { fontSize: 8, textColor: corCinza },
                 margin: { left: 14, right: 14 },
             });
             y = (doc as any).lastAutoTable.finalY + 8;
         }

         // Professional Signature Block (TC-133 / M-16)
         if (ed.profissional) {
             if (y > 265) { doc.addPage(); y = 20; }
             doc.setDrawColor(220, 220, 220);
             doc.setLineWidth(0.35);
             doc.line(14, y, pageW - 14, y);
             y += 4;

             doc.setFont("helvetica", "bold");
             doc.setFontSize(8);
             doc.setTextColor(30, 41, 59);
             doc.text("Assinado eletronicamente por:", 14, y);

             doc.setFont("helvetica", "normal");
             doc.setTextColor(...corCinza);
             doc.text(`Profissional: ${ed.profissional.nome}   |   Matrícula: ${ed.profissional.matricula}   |   Cargo/Função: ${ed.profissional.cargo}`, 14, y + 4.5);
             y += 12;
         }
      } else {
         y += 8;
      }
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Footer page number
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.setFont("helvetica", "normal");
      doc.text(`StellarCare – Documento Confidencial  |  Página ${i} de ${totalPages}`, pageW / 2, 292, { align: "center" });

      // Repeating Compact Header on later pages (TC-140 / M-18)
      if (i > 1) {
         doc.setFillColor(...corPrimaria);
         doc.rect(0, 0, pageW, 15, "F");
         doc.setTextColor(255, 255, 255);
         doc.setFontSize(9);
         doc.setFont("helvetica", "bold");
         doc.text("StellarCare – Clínica & Assistência", 14, 9);
         doc.setFontSize(7.5);
         doc.setFont("helvetica", "normal");
         doc.text("PRONTUÁRIO DE EVOLUÇÃO CLÍNICA", pageW - 14, 9, { align: "right" });
      }
    }

    const dataIso = new Date().toISOString().split("T")[0];
    doc.save(`StellarCare_${patient.nome_ficticio.replace(/ /g, "_")}_Leito_${patient.numero_leito}_${dataIso}.pdf`);
  };

  const confirmarAlta = () => {
    if (showModalAlta) {
      // FEATURE NOVO: Define o status final do paciente com base no tipo de alta selecionado (transferido, obito ou alta comum)
      let targetStatus: PatientStatus = "alta";
      if (tipoAlta === "transferencia") {
        targetStatus = "transferido";
      } else if (tipoAlta === "obito") {
        targetStatus = "obito";
      }

      onDischargePatient(showModalAlta, targetStatus, {
        medicoAlta,
        observacoesAlta,
        unidadeTransferencia: tipoAlta === "transferencia" ? unidadeDestino : undefined
      });

      setShowModalAlta(null);
      setMedicoAlta("");
      setObservacoesAlta("");
      setUnidadeDestino("");
    }
  };

  const filteredPatients = patients.filter(p => (p.nome_ficticio || "").toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-300 space-y-4 pb-2">
      {/* Header */}
      <div className="bg-[#1D9E75] text-white px-5 py-6 rounded-2xl mb-4 shadow-sm border border-[#1D9E75]">
        <p className="text-xs opacity-80 font-medium tracking-widest uppercase mb-1">StellarCare</p>
        <h1 className="font-bold text-[22px] tracking-tight">Registros Salvos</h1>
        <p className="text-sm opacity-90 mt-1">Histórico de evoluções e altas</p>
      </div>

      <div className="relative">
         <input 
           type="text" 
           value={searchTerm} 
           onChange={e => setSearchTerm(e.target.value)}
           placeholder="Buscar paciente pelo nome..." 
           className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-[15px] focus:outline-none focus:border-[#1D9E75] shadow-sm transition-colors text-gray-900" 
         />
      </div>

      {filteredPatients.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
            <ClipboardList className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium text-sm">Nenhum paciente cadastrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPatients.map((patient) => {
            const records = metricsByPatient[patient.id] || [];
            
            return (
              <div key={patient.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-4">
                
                {/* Header Paciente */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="font-bold text-[16px] text-gray-900 leading-tight mb-1">
                      {patient.nome_ficticio}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 font-medium pb-1.5">
                      🛏 Leito {patient.numero_leito} · {patient.idade_aparente} anos
                    </p>
                    {patient.tecnico_responsavel && (
                      <p className="text-[11px] font-semibold text-teal-800">
                        👤 Técnico Resp: {patient.tecnico_responsavel.nome} — Mat. {patient.tecnico_responsavel.matricula}
                      </p>
                    )}
                    {/* FEATURE NOVO: Mostra técnicos adicionais do plantão na listagem lateral */}
                    {patient.tecnicos_adicionais && patient.tecnicos_adicionais.length > 0 && (
                      <p className="text-[10px] font-semibold text-teal-700/80 mt-0.5">
                        👥 Adicionais: {patient.tecnicos_adicionais.map(t => `${t.nome} (Mat. ${t.matricula})`).join(", ")}
                      </p>
                    )}
                    {patient.status === "transferido" && (
                      <div className="text-[11.5px] text-amber-800 bg-amber-50/70 border border-amber-200/50 rounded-xl p-3 mt-2 space-y-1">
                        <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                          🔄 Transferência de Unidade:
                        </p>
                        <p className="font-medium text-gray-700">
                          De: <span className="font-bold text-gray-900">{patient.setor || "Não informado"}</span>
                        </p>
                        <p className="font-medium text-gray-700">
                          Para: <span className="font-bold text-gray-900">{patient.unidade_transferencia || "Não informado"}</span>
                        </p>
                        {patient.medico_alta && (
                          <p className="text-[11px] text-gray-500 mt-1">
                            Autorizado por: {patient.medico_alta}
                          </p>
                        )}
                        {patient.observacoes_alta && (
                          <p className="text-[11px] text-gray-500 italic">
                            Obs: "{patient.observacoes_alta}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0 ${
                    patient.status === "alta"
                      ? "bg-blue-50 text-blue-600 border border-blue-100"
                      : patient.status === "transferido"
                      ? "bg-amber-50 text-amber-600 border border-amber-100"
                      : patient.status === "obito"
                      ? "bg-gray-100 text-gray-600 border border-gray-200"
                      : "bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/20"
                  }`}>
                    {patient.status === "alta" ? "Alta" :
                     patient.status === "transferido" ? "Transferido" :
                     patient.status === "obito" ? "Óbito" : "Ativo"}
                  </span>
                </div>

                {/* Resumo de Registros */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-[#1D9E75]" />
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                      {records.length} Evoluções Registradas
                    </span>
                  </div>
                  {records.length > 0 && (
                    <div className="text-[11px] text-gray-500">
                      Última evolução: <strong className="text-gray-700">
                        {(() => {
                          const lastEv = records[records.length - 1];
                          if (lastEv.evolutionData && lastEv.evolutionData.timestamp) {
                            try {
                              const dt = new Date(lastEv.evolutionData.timestamp);
                              const hoje = new Date();
                              const ehMesmoDia = dt.getDate() === hoje.getDate() &&
                                                 dt.getMonth() === hoje.getMonth() &&
                                                 dt.getFullYear() === hoje.getFullYear();
                              if (ehMesmoDia) {
                                return `Hoje às ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                              } else {
                                return dt.toLocaleString("pt-BR", {
                                  day: "2-digit", month: "2-digit", year: "numeric",
                                  hour: "2-digit", minute: "2-digit"
                                });
                              }
                            } catch {
                              return lastEv.time;
                            }
                          }
                          return lastEv.time;
                        })()}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    onClick={() => exportarPDF(patient)}
                    disabled={records.length === 0}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                      records.length === 0
                        ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50"
                        : "bg-[#1D9E75] text-white hover:bg-[#0F6E56] active:scale-[0.98]"
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Exportar Registro (PDF)
                  </button>

                  {patient.status !== "alta" && (
                    <button 
                      onClick={() => setShowModalAlta(patient.id)}
                      className="w-full bg-white border border-red-200 text-red-500 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 active:scale-[0.98] transition-all"
                    >
                      <LogOut className="w-4 h-4" /> Registrar Alta
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Alta */}
      {showModalAlta && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-end justify-center z-50 animate-in fade-in duration-300 pb-safe">
          <div className="bg-white w-[95%] max-w-md rounded-t-3xl p-6 space-y-5 animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[18px] text-gray-900">Registrar Alta</h3>
              <button onClick={() => setShowModalAlta(null)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Médico Responsável pela Alta *</label>
                <input
                  type="text"
                  value={medicoAlta}
                  onChange={(e) => setMedicoAlta(e.target.value)}
                  placeholder="Nome do médico"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#1D9E75] transition-colors bg-white font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Tipo de Alta</label>
                <select
                  value={tipoAlta}
                  onChange={(e) => setTipoAlta(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#1D9E75] transition-colors bg-white font-medium appearance-none"
                >
                  <option value="melhorado">Alta melhorado</option>
                  <option value="a_pedido">Alta a pedido</option>
                  <option value="transferencia">Transferência</option>
                  <option value="obito">Óbito</option>
                </select>
              </div>

              {/* FEATURE NOVO: Unidade ou Local de destino para a transferência de alta do paciente (Realocação de área) */}
              {tipoAlta === "transferencia" && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Unidade ou Local de Destino *</label>
                  <select
                    value={unidadeDestino}
                    onChange={(e) => setUnidadeDestino(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#1D9E75] transition-colors bg-white font-medium appearance-none"
                  >
                    <option value="">Selecione a Unidade</option>
                    <option value="UTI Geral">UTI Geral (Terapia Intensiva)</option>
                    <option value="UTI Cardio">UTI Cardio-Coronariana</option>
                    <option value="Semicrítica">Unidade Semicrítica / Intermediária</option>
                    <option value="Enfermaria Clinica">Enfermaria de Clínica Médica / Cirúrgica</option>
                    <option value="Centro Cirurgico">Centro Cirúrgico (CC)</option>
                    <option value="Pronto Atendimento">Pronto Atendimento / Emergência (UPA)</option>
                    <option value="Outro Hospital">Outro Hospital (Transferência Externa)</option>
                    <option value="Outra Area">Outra Área / Setor Interno</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Observações</label>
                <textarea
                  value={observacoesAlta}
                  onChange={(e) => setObservacoesAlta(e.target.value)}
                  placeholder="Observações finais, orientações de alta..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#1D9E75] transition-colors bg-white resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModalAlta(null)}
                className="flex-1 border border-gray-200 bg-white text-gray-600 py-4 rounded-xl text-[14px] font-bold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAlta}
                disabled={!medicoAlta || (tipoAlta === "transferencia" && !unidadeDestino)}
                className="flex-1 bg-red-500 text-white py-4 rounded-xl text-[14px] font-bold disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                Confirmar Alta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

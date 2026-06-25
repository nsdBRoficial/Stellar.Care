import { UserPlus, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useState, FormEvent } from "react";
import { Patient, Sex, PatientStatus } from "../types";
import { SETORES } from "../config/setores.config";

interface PatientRegistrationProps {
  onRegister: (patient: Patient) => void;
}

export function PatientRegistration({ onRegister }: PatientRegistrationProps) {
  const [nomeFicticio, setNomeFicticio] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState<Sex | "">("");
  const [numeroLeito, setNumeroLeito] = useState("");
  const [setor, setSetor] = useState("Internação Clínica");
  const [diagnosticoPrincipal, setDiagnosticoPrincipal] = useState("");
  const [dataInternacao, setDataInternacao] = useState(new Date().toISOString().split("T")[0]);
  const [medicoResp, setMedicoResp] = useState("");
  const [tecnicoNome, setTecnicoNome] = useState("");
  const [tecnicoMatricula, setTecnicoMatricula] = useState("");
  
  // FEATURE NOVO: Suporte para múltiplos técnicos responsáveis para o plantão
  const [tecnicosAdicionais, setTecnicosAdicionais] = useState<Array<{ nome: string; matricula: string }>>([]);
  const [novoTecnicoNome, setNovoTecnicoNome] = useState("");
  const [novoTecnicoMatricula, setNovoTecnicoMatricula] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!nomeFicticio || !dataNascimento || !sexo || !numeroLeito || !diagnosticoPrincipal || !dataInternacao || !medicoResp || !tecnicoNome || !tecnicoMatricula) {
      setError("Preencha todos os campos obrigatórios (*) para continuar.");
      return;
    }

    const MATRICULA_REGEX = /^\d{1,6}-[A-Z]{2,4}$/i;
    if (!MATRICULA_REGEX.test(tecnicoMatricula)) {
      setError("A matrícula do técnico deve seguir o formato de número + traço + sigla (ex: 123456-ENF).");
      return;
    }

    if (tecnicoMatricula.trim() === "") {
      setError("A matrícula do técnico é obrigatória e não pode ser vazia.");
      return;
    }

    if (diagnosticoPrincipal.length < 10) {
      setError("O diagnóstico principal deve ter no mínimo 10 caracteres.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    
    if (dataNascimento >= today) {
      setError("A data de nascimento deve ser anterior ao dia de hoje.");
      return;
    }

    if (dataInternacao > today) {
      setError("A data de internação não pode ser futura.");
      return;
    }

    // Calculates apparent age
    const birthDate = new Date(dataNascimento);
    const currDate = new Date();
    let age = currDate.getFullYear() - birthDate.getFullYear();
    const m = currDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && currDate.getDate() < birthDate.getDate())) {
      age--;
    }

    onRegister({
      id: Math.random().toString(36).substring(2, 9),
      nome_ficticio: nomeFicticio,
      data_nascimento: dataNascimento,
      idade_aparente: age,
      sexo: sexo as Sex,
      numero_leito: numeroLeito.toUpperCase(),
      setor,
      diagnostico_principal: diagnosticoPrincipal,
      data_internacao: dataInternacao,
      medico_responsavel: medicoResp,
      tecnico_responsavel: {
        nome: tecnicoNome,
        matricula: tecnicoMatricula
      },
      // FEATURE NOVO: Inclui a lista de técnicos adicionais responsáveis do plantão
      tecnicos_adicionais: tecnicosAdicionais,
      convenio: "",
      alergias: "",
      observacoes: "",
      status: "internado" as PatientStatus,
      criado_em: new Date().toISOString(),
    });

    setSuccess(true);
    
    // Clear form
    setNomeFicticio("");
    setDataNascimento("");
    setSexo("");
    setNumeroLeito("");
    setDiagnosticoPrincipal("");
    setDataInternacao(new Date().toISOString().split("T")[0]);
    setMedicoResp("");
    setTecnicoNome("");
    setTecnicoMatricula("");
    // FEATURE NOVO: Limpa a lista de técnicos adicionais
    setTecnicosAdicionais([]);
    setNovoTecnicoNome("");
    setNovoTecnicoMatricula("");
    setSetor(SETORES[0] || "Internação Clínica");

    // Hide success after 3s
    setTimeout(() => {
      setSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-4">
      {/* Title */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-[20px] font-black text-gray-950 tracking-tight">
          Admitir Paciente
        </h1>
        <p className="text-gray-500 text-[10.5px] font-semibold uppercase tracking-widest leading-none">
          Admissão e Registro
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[11px] font-medium border border-red-100 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        
        {/* Card 1: IDENTIFICAÇÃO */}
        <div className="bg-white border border-gray-200 rounded-[14px] p-5 shadow-sm space-y-4" style={{ borderWidth: '0.5px' }}>
          <h2 className="text-[12px] font-bold text-[#1D9E75] uppercase tracking-[0.8px] mb-3">
            1. Identificação
          </h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nome do Paciente *</label>
              <input required maxLength={100} value={nomeFicticio} onChange={e => setNomeFicticio(e.target.value)} type="text" placeholder="Nome Completo" className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none transition-all" />
              {nomeFicticio.length > 0 && (
                <span className={`block text-[12px] font-semibold text-right mt-1 ${
                  nomeFicticio.length / 100 >= 0.95 ? 'text-red-600' : 
                  nomeFicticio.length / 100 >= 0.80 ? 'text-orange-500' : 'text-gray-500'
                }`}>
                  {nomeFicticio.length}/100 caracteres
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nascimento *</label>
                <input required max={new Date().toISOString().split("T")[0]} value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} type="date" className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-2.5 text-[13px] xs:text-[14px] focus:border-[#1D9E75] outline-none transition-all cursor-pointer" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sexo *</label>
                <select required value={sexo} onChange={e => setSexo(e.target.value as Sex)} className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none transition-all appearance-none">
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  {/* FEATURE NOVO: Substituição da opção "Outro" por "Intersexo" no formulário de admissão */}
                  <option value="I">Intersexo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Leito *</label>
                <input required value={numeroLeito} onChange={e => setNumeroLeito(e.target.value)} type="text" placeholder="Ex: 204-A" className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] uppercase focus:border-[#1D9E75] outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Setor *</label>
                <select 
                  required 
                  value={setor} 
                  onChange={e => setSetor(e.target.value)} 
                  className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none transition-all font-bold text-gray-900"
                >
                  {SETORES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: DADOS CLÍNICOS */}
        <div className="bg-white border border-gray-200 rounded-[14px] p-5 shadow-sm space-y-4" style={{ borderWidth: '0.5px' }}>
          <h2 className="text-[12px] font-bold text-[#1D9E75] uppercase tracking-[0.8px] mb-3">
            2. Dados Clínicos
          </h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Diagnóstico *</label>
              <textarea required minLength={10} maxLength={500} value={diagnosticoPrincipal} onChange={e => setDiagnosticoPrincipal(e.target.value)} className="w-full bg-white border border-gray-200 rounded-[10px] p-3 text-[15px] focus:border-[#1D9E75] outline-none min-h-[80px] resize-none transition-all" placeholder="Diagnóstico inicial (min 10 chars)"></textarea>
              {diagnosticoPrincipal.length > 0 && (
                <span className={`block text-[12px] font-semibold text-right mt-1 ${
                  diagnosticoPrincipal.length / 500 >= 0.95 ? 'text-red-600' : 
                  diagnosticoPrincipal.length / 500 >= 0.80 ? 'text-orange-500' : 'text-gray-500'
                }`}>
                  {diagnosticoPrincipal.length}/500 caracteres
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest leading-none">Data Inter. *</label>
                  <button 
                    type="button" 
                    onClick={() => setDataInternacao(new Date().toISOString().split("T")[0])}
                    className="text-[10px] text-teal-600 font-black tracking-wider uppercase cursor-pointer hover:text-teal-800"
                  >
                    Hoje
                  </button>
                </div>
                <input required value={dataInternacao} onChange={e => setDataInternacao(e.target.value)} type="date" className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-2.5 text-[13px] xs:text-[14px] focus:border-[#1D9E75] outline-none transition-all cursor-pointer" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Médico Resp. *</label>
                <input required value={medicoResp} onChange={e => setMedicoResp(e.target.value)} type="text" placeholder="Nome" className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 whitespace-nowrap">Técnico Responsável *</label>
                <input required value={tecnicoNome} onChange={e => setTecnicoNome(e.target.value)} type="text" placeholder="Ex: ENF. Silva" className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 whitespace-nowrap">Matrícula Técnico *</label>
                <input 
                  required 
                  value={tecnicoMatricula} 
                  onChange={e => {
                    let input = e.target.value.toUpperCase().replace(/[^0-9A-Z-]/g, '');
                    const parts = input.split('-');
                    let digits = parts[0].replace(/[^0-9]/g, '').slice(0, 6);
                    let letters = parts.slice(1).join('').replace(/[^A-Z]/g, '').slice(0, 4);
                    if (parts.length === 1 && parts[0].length > 6) {
                      const extra = parts[0].slice(6);
                      if (/[A-Z]/i.test(extra)) {
                        digits = parts[0].slice(0, 6).replace(/[^0-9]/g, '');
                        letters = extra.replace(/[^A-Z]/gi, '').slice(0, 4);
                      }
                    }
                    let formatted = digits;
                    if (e.target.value.includes('-') || letters.length > 0) {
                      formatted += '-' + letters;
                    }
                    setTecnicoMatricula(formatted);
                  }} 
                  type="text" 
                  placeholder="Ex: 123456-ENF" 
                  className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none transition-all" 
                />
              </div>
            </div>

            {/* Seção de técnicos de plantão adicionais simplificada */}
            <div className="border-t border-gray-150 pt-4 mt-4 space-y-3">
              <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest leading-none">Técnicos de Plantão Adicionais (Opcional)</label>
              
              {tecnicosAdicionais.length > 0 && (
                <div className="flex flex-wrap gap-1.5 py-1">
                  {tecnicosAdicionais.map((t, idx) => (
                    <div 
                      key={idx} 
                      className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 text-gray-850 text-xs px-2.5 py-1 rounded-xl font-bold animate-in duration-150"
                    >
                      <span>{t.nome} <span className="font-normal text-gray-500">({t.matricula})</span></span>
                      <button 
                        type="button" 
                        onClick={() => {
                          setTecnicosAdicionais(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="text-gray-400 hover:text-red-650 font-black cursor-pointer text-[13px] ml-0.5"
                        title="Remover Técnico"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input 
                  value={novoTecnicoNome} 
                  onChange={e => setNovoTecnicoNome(e.target.value)} 
                  type="text" 
                  placeholder="Nome do Técnico Adicional" 
                  className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none transition-all placeholder-gray-400 font-bold" 
                />
                <div className="flex gap-2">
                  <input 
                    value={novoTecnicoMatricula} 
                    onChange={e => {
                      let input = e.target.value.toUpperCase().replace(/[^0-9A-Z-]/g, '');
                      const parts = input.split('-');
                      let digits = parts[0].replace(/[^0-9]/g, '').slice(0, 6);
                      let letters = parts.slice(1).join('').replace(/[^A-Z]/g, '').slice(0, 4);
                      if (parts.length === 1 && parts[0].length > 6) {
                        const extra = parts[0].slice(6);
                        if (/[A-Z]/i.test(extra)) {
                          digits = parts[0].slice(0, 6).replace(/[^0-9]/g, '');
                          letters = extra.replace(/[^A-Z]/gi, '').slice(0, 4);
                        }
                      }
                      let formatted = digits;
                      if (e.target.value.includes('-') || letters.length > 0) {
                        formatted += '-' + letters;
                      }
                      setNovoTecnicoMatricula(formatted);
                    }} 
                    type="text" 
                    placeholder="Ex: 123456-ENF" 
                    className="flex-1 h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none transition-all placeholder-gray-400 font-bold" 
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!novoTecnicoNome || !novoTecnicoMatricula) return;
                      const MATRICULA_REGEX = /^\d{1,6}-[A-Z]{2,4}$/i;
                      if (!MATRICULA_REGEX.test(novoTecnicoMatricula)) {
                        setError("A matrícula do técnico adicional deve seguir o formato de número + traço + sigla (ex: 123456-ENF).");
                        return;
                      }
                      setTecnicosAdicionais(p => [...p, { nome: novoTecnicoNome, matricula: novoTecnicoMatricula }]);
                      setNovoTecnicoNome("");
                      setNovoTecnicoMatricula("");
                    }}
                    className="bg-gray-100 hover:bg-[#1D9E75] hover:text-white text-gray-700 px-4 rounded-[10px] text-xs font-black transition-all shrink-0 h-[44px] flex items-center justify-center cursor-pointer"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 relative">
          <button type="submit" className="w-full bg-[#1D9E75] hover:bg-[#0F6E56] active:scale-[0.98] text-white font-semibold text-[15px] h-[52px] rounded-[14px] flex justify-center items-center gap-2 transition-all shadow-sm">
            <UserPlus className="w-5 h-5" /> Finalizar Admissão
          </button>
        </div>
      </form>

      {/* Success Toast */}
      {success && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-center gap-2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 w-[90%] max-w-sm">
          <CheckCircle2 className="w-5 h-5"/>
          <span className="font-semibold text-[14px]">Paciente admitido com sucesso</span>
        </div>
      )}
    </div>
  );
}

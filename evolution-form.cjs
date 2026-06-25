const fs = require('fs');

let form = fs.readFileSync('src/components/EvolutionForm.tsx', 'utf8');

// 1. Add Custom Component for Text Fields with Character Count
const contadorComp = `
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
        <span className={\`text-[12px] font-semibold text-right \${corContador}\`}>
          {value.length}/{maxLength} caracteres
        </span>
      )}
    </div>
  );
};
`;

if(!form.includes('CampoComContador')) {
    form = form.replace('export function EvolutionForm', contadorComp + '\nexport function EvolutionForm');
}

form = form.replace('user: User;', 'user: User;\n  onBack?: () => void;');

const stateVars = `  const getPeriodoSugerido = () => {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 14) return 'Manhã';
    if (hora >= 14 && hora < 22) return 'Tarde';
    return 'Noite';
  };
  const periodos = [
    { id: 'Manhã',  label: 'Manhã',  faixa: '06h-13h59' },
    { id: 'Tarde',  label: 'Tarde',  faixa: '14h-21h59' },
    { id: 'Noite',  label: 'Noite',  faixa: '22h-05h59' },
  ];
  const [periodo, setPeriodo] = useState<string | null>(getPeriodoSugerido());
  const [dataEvolucao, setDataEvolucao] = useState(new Date().toISOString().split("T")[0]);
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [procedimentos, setProcedimentos] = useState("");
`;
if(!form.includes('const [periodo')) {
    form = form.replace('const [dateStr', stateVars + '  const [dateStr');
}

form = form.replace('const [mobilidade, setMobilidade] = useState<string[]>([]);', 'const [mobilidade, setMobilidade] = useState<string | null>(null);\n  const [mobilidadeOutro, setMobilidadeOutro] = useState("");');

form = form.replace('const [consciencia, setConsciencia] = useState<string[]>([]);', 'const [consciencia, setConsciencia] = useState<string | null>(null);\n  const [orientacao, setOrientacao] = useState<string | null>(null);\n  const handleConsciencia = (valor: string) => { setConsciencia(valor); if (valor !== "Consciente") setOrientacao(null); };');

const topJSX = `    <div className="animate-in fade-in duration-300 pb-24 space-y-4 flex flex-col h-full">
      {/* Header com Botão Voltar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-3 px-1 mt-2 shrink-0">
        {onBack && (
          <button 
            onClick={onBack} 
            className="w-full md:w-auto min-h-[44px] md:min-h-[36px] flex items-center justify-center bg-gray-100/80 hover:bg-gray-200 text-gray-800 font-semibold px-4 rounded-xl transition-all border border-gray-200 order-2 md:order-1"
            aria-label="Voltar para pacientes"
          >
            ← Voltar para pacientes
          </button>
        )}
        <div className="flex flex-col gap-1 order-1 md:order-2">
          <h1 className="text-[18px] font-bold text-gray-900 tracking-tight">Evolução Enfermagem</h1>
          <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest leading-none">Registro Clínico</p>
        </div>
      </div>`;
form = form.replace(/<div className="animate-in fade-in duration-300 pb-24 space-y-4 flex flex-col h-full">[\s\S]*?<\/div>/, topJSX);

const step0JSX = `            <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">1. Paciente</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none transition-colors appearance-none font-semibold text-gray-900"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome_ficticio} (L: {p.numero_leito})
                    </option>
                  ))}
                  {patients.length === 0 && <option value="">Nenhum paciente cadastrado</option>}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Data da Evolução</label>
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      max={new Date().toISOString().split("T")[0]}
                      value={dataEvolucao} 
                      onChange={e => setDataEvolucao(e.target.value)} 
                      className="w-full bg-white border border-gray-200 rounded-[10px] px-3 h-[44px] text-[15px] focus:border-[#1D9E75] outline-none"
                    />
                    <button 
                      onClick={() => setDataEvolucao(new Date().toISOString().split("T")[0])} 
                      className="px-4 shrink-0 bg-gray-100 hover:bg-gray-200 rounded-[10px] text-[13px] font-semibold transition-colors"
                    >
                      Hoje
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Período da evolução *</label>
                  <div className="flex flex-col md:flex-row gap-2">
                    {periodos.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => setPeriodo(p.id)}
                        className={\`flex-1 p-2 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-colors \${periodo === p.id ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}\`}
                        role="radio"
                        aria-checked={periodo === p.id}
                      >
                        <span className="font-bold text-[13px] leading-tight">{p.label}</span>
                      </div>
                    ))}
                  </div>
                  {!periodo && <span className="text-red-500 text-[10px] uppercase font-bold mt-1 block">Campo obrigatório</span>}
                </div>
              </div>
            </div>`;
// Try replacing step 0 top card
const step0Regex = /<div className="bg-white border border-gray-200 rounded-\[14px\] p-4 shadow-sm">\s*<label className="block text-\[12px\].*?1\. Paciente<\/label>[\s\S]*?<\/div>/;
form = form.replace(step0Regex, step0JSX);

// Replace button next step logic
form = form.replace('disabled={isSigning}', 'disabled={isSigning || (currentStep === 0 && !periodo)}');

// Fix Group A and Group B
const grupoAJSC = `              <div>
                 <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">Nível de consciência (Grupo A)</label>
                 <div className="flex flex-col md:grid md:grid-cols-3 gap-y-3 gap-x-2">
                   {["Consciente", "Não responsivo", "Sedado"].map(op => (
                     <div key={op} onClick={() => handleConsciencia(op)} className="min-h-[44px] flex items-center" role="radio" aria-checked={consciencia === op}>
                       <RadioItem label={op} val={consciencia || ""} setVal={handleConsciencia} />
                     </div>
                   ))}
                 </div>
              </div>

              <div>
                 <label className={\`block text-[12px] font-bold uppercase tracking-widest mb-3 \${consciencia === 'Consciente' ? 'text-gray-400' : 'text-gray-300'}\`}>Orientação (Grupo B)</label>
                 <div className="flex flex-col md:grid md:grid-cols-2 gap-y-3 gap-x-2">
                   {["Orientado", "Desorientado"].map(op => (
                     <div key={op} onClick={() => consciencia === 'Consciente' && setOrientacao(op)} className={\`min-h-[44px] flex items-center \${consciencia !== 'Consciente' && 'opacity-40 cursor-not-allowed'}\`} role="radio" aria-checked={orientacao === op}>
                       <RadioItem label={op} val={orientacao || ""} setVal={setOrientacao} />
                     </div>
                   ))}
                 </div>
              </div>`;

form = form.replace(/<div>\s*<label className="block text-\[12px\] font-bold text-gray-400 uppercase tracking-widest mb-3">Nível de consciência<\/label>[\s\S]*?<\/div>/, grupoAJSC);

// Fix mobilidade
const mobilidadeJSX = `              <div>
                 <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">Mobilidade</label>
                 <div className="flex flex-col md:grid md:grid-cols-2 gap-y-3 gap-x-2">
                   {["Deambula", "Cadeirante", "Acamado", "Outro"].map(op => (
                     <div key={op} onClick={() => { setMobilidade(op); if(op !== 'Outro') setMobilidadeOutro(''); }} className="min-h-[44px] flex items-center" role="radio" aria-checked={mobilidade === op}>
                       <RadioItem label={op} val={mobilidade || ""} setVal={setMobilidade} />
                     </div>
                   ))}
                 </div>
                 {mobilidade === 'Outro' && (
                    <div className="mt-3 animate-in fade-in">
                       <input type="text" placeholder="Especifique a mobilidade..." value={mobilidadeOutro} onChange={e => setMobilidadeOutro(e.target.value)} className="w-full h-[44px] bg-white border border-gray-200 rounded-[10px] px-3 text-[15px] focus:border-[#1D9E75] outline-none" />
                    </div>
                 )}
              </div>`;
form = form.replace(/<div>\s*<label className="block text-\[12px\] font-bold text-gray-400 uppercase tracking-widest mb-3">Mobilidade<\/label>[\s\S]*?<\/div>/, mobilidadeJSX);

// Add missing textarea limit fields to intercorrencias (step 10)
const intercorrenciasJSX = `            <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm space-y-6">
              <SectionTitle title="12. Intercorrências e Registros Adicionais" />
              
              <CampoComContador 
                label="Evolução Clínica / Intercorrências" 
                maxLength={2000} 
                value={intercorrencias} 
                onChange={setIntercorrencias} 
                placeholder="Descreva a evolução do paciente..." 
                minHeight="120px" 
              />
              
              <CampoComContador 
                label="Medicamentos Administrados" 
                maxLength={300} 
                value={medicamentos} 
                onChange={setMedicamentos} 
                placeholder="Liste as medicações dadas..." 
                minHeight="80px" 
              />

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
            </div>`;

form = form.replace(/<div className="bg-white border border-gray-200 rounded-\[14px\] p-4 shadow-sm">\s*<SectionTitle title="12\. Intercorrências" \/>[\s\S]*?<\/div>/, intercorrenciasJSX);

// Fix click mask for images
const imgClick = `  function pontoNaArea(px: number, py: number, larguraImg: number, alturaImg: number) {
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

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>, view: "front" | "back") => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (!pontoNaArea(px, py, rect.width, rect.height)) {
        // Subtle visual feedback
        e.currentTarget.classList.add("bg-red-50");
        setTimeout(() => e.currentTarget.classList.remove("bg-red-50"), 200);
        return;
    }

    const x = (px / rect.width) * 100;
    const y = (py / rect.height) * 100;

    const newMarker: Marker = {
      id: Math.random().toString(36).substring(2, 9),
      x, y, observations: "", intensity: 5, type: "pain", view,
    };
    setMarkers([...markers, newMarker]);
    setActiveMarkerId(newMarker.id);
    setEditingMarkerId(newMarker.id);
  };`;

form = form.replace(/const handleImageClick\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?setActiveMarkerId\(newMarker\.id\);\s*setEditingMarkerId\(newMarker\.id\);\s*\};/, imgClick);

fs.writeFileSync('src/components/EvolutionForm.tsx', form);

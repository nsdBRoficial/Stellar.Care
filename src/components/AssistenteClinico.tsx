import { useState } from "react";
import { Sparkles, X, RefreshCw, Clipboard, HeartPulse, Download } from "lucide-react";
import { Patient, MetricPoint } from "../types";
import { isApplicationOnline } from "../lib/syncManager";
import jsPDF from "jspdf";
import { AnimatePresence, motion } from "motion/react";

interface AssistenteClinicoProps {
  patients: Patient[];
  metricsByPatient: Record<string, MetricPoint[]>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function AssistenteClinico({ patients, metricsByPatient, isOpen, setIsOpen }: AssistenteClinicoProps) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>("");

  // FEATURE NOVO: Método para gerar e exportar em PDF o relatório de passagem de plantão gerado por IA
  const exportarPassagemPDF = () => {
    if (!response) return;
    
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const corPrimaria: [number, number, number] = [29, 158, 117]; 
    const corCinza: [number, number, number] = [80, 80, 80];
    const pageW = 210;
    let y = 15;

    // Header do Relatório
    doc.setFillColor(...corPrimaria);
    doc.rect(0, 0, pageW, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("StellarCare – Painel de Enfermagem", 14, 11);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("RELATÓRIO DE PASSAGEM DE PLANTÃO (IA)", 14, 19);
    doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, pageW - 14, 19, { align: "right" });
    y = 38;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("SÍNTESE DOS CASOS CLÍNICOS E ADVERTÊNCIAS", 14, y);
    y += 6;

    doc.setDrawColor(...corPrimaria);
    doc.setLineWidth(0.5);
    doc.line(14, y, pageW - 14, y);
    y += 8;

    doc.setTextColor(...corCinza);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);

    // Formata o texto para caber nas margens
    const lines = doc.splitTextToSize(response, pageW - 28);
    
    // Escreve linha por linha com quebra de página automática se ultrapassar a margem inferior
    lines.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 14, y);
      y += 5.5;
    });

    doc.save(`passagem_de_plantao_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const handleAssistantAction = async () => {
    setLoading(true);
    setResponse("");

    // Calculate a clinical severity score and compile rich intercurrent clinical findings
    const mappedPatients = patients.map(p => {
      const pMetrics = metricsByPatient[p.id] || [];
      const latestMetric = pMetrics[pMetrics.length - 1];
      
      let score = 0;
      const intercorrencias: string[] = [];
      
      if (latestMetric) {
        // Temperature check (Red alerts get 10 points, Yellow alerts get 3 points)
        if (latestMetric.temp) {
          if (latestMetric.temp < 35.0 || latestMetric.temp > 39.5) {
            score += 10;
            intercorrencias.push(`Temperatura crítica (${latestMetric.temp}°C)`);
          } else if ((latestMetric.temp >= 35.0 && latestMetric.temp <= 35.9) || (latestMetric.temp >= 37.8 && latestMetric.temp <= 39.5)) {
            score += 3;
            intercorrencias.push(`Alerta de Temperatura (${latestMetric.temp}°C)`);
          }
        }
        
        // Heart Rate (FC) check
        if (latestMetric.fc) {
          if (latestMetric.fc < 50 || latestMetric.fc > 120) {
            score += 10;
            intercorrencias.push(`Frequência Cardíaca crítica (${latestMetric.fc} bpm)`);
          } else if ((latestMetric.fc >= 50 && latestMetric.fc <= 59) || (latestMetric.fc >= 101 && latestMetric.fc <= 120)) {
            score += 3;
            intercorrencias.push(`Frequência Cardíaca alterada (${latestMetric.fc} bpm)`);
          }
        }

        // Blood Pressure (PA) check (sys/dia)
        if (latestMetric.sys) {
          if (latestMetric.sys > 180 || latestMetric.sys < 80) {
            score += 10;
            intercorrencias.push(`Pressão Arterial crítica (${latestMetric.sys}/${latestMetric.dia} mmHg)`);
          } else if (latestMetric.sys >= 140 && latestMetric.sys <= 180) {
            score += 3;
            intercorrencias.push(`Pressão Arterial elevada (${latestMetric.sys}/${latestMetric.dia} mmHg)`);
          }
        }

        // Respiratory Rate (FR) check
        if (latestMetric.fr) {
          if (latestMetric.fr < 10 || latestMetric.fr > 30) {
            score += 10;
            intercorrencias.push(`Frequência Respiratória crítica (${latestMetric.fr} irpm)`);
          } else if ((latestMetric.fr >= 10 && latestMetric.fr <= 11) || (latestMetric.fr >= 25 && latestMetric.fr <= 30)) {
            score += 3;
            intercorrencias.push(`Frequência Respiratória alterada (${latestMetric.fr} irpm)`);
          }
        }

        // SpO2 check
        if (latestMetric.spo2) {
          if (latestMetric.spo2 < 94) {
            score += 10;
            intercorrencias.push(`Saturação de O2 de risco (${latestMetric.spo2}%)`);
          } else if (latestMetric.spo2 <= 95) {
            score += 3;
            intercorrencias.push(`Saturação de O2 baixa (${latestMetric.spo2}%)`);
          }
        }

        // Pain Scale check
        if (latestMetric.pain) {
          if (latestMetric.pain >= 7) {
            score += 5;
            intercorrencias.push(`Dor Intensa (Grau ${latestMetric.pain}/10)`);
          } else if (latestMetric.pain >= 4) {
            score += 2;
            intercorrencias.push(`Dor Moderada (Grau ${latestMetric.pain}/10)`);
          }
        }

        // Diurese check
        if (latestMetric.diurese_anomalia) {
          score += 4;
          intercorrencias.push("Anomalia urinária registrada");
        }

        // Skin lesions check (Pele e Lesões)
        if (latestMetric.evolutionData) {
          const skinGroup = latestMetric.evolutionData.pele || [];
          const activeLesions = skinGroup.filter((item: string) => item !== "Pele íntegra");
          if (activeLesions.length > 0) {
            score += 6;
            intercorrencias.push(`Alteração cutânea e/ou lesões (${activeLesions.join(", ")})`);
          }
        }

        // Mapa Anatômico check
        if (latestMetric.evolutionData && latestMetric.evolutionData.markers) {
          const markersList: any[] = latestMetric.evolutionData.markers;
          if (markersList.length > 0) {
            score += markersList.length * 3;
            markersList.forEach((m: any) => {
              const reg = m.bodyPart || "Não especificado";
              const tipoIdx = m.type === 'pain' ? 'Dor' : m.type === 'wound' ? 'Lesão' : 'Outro';
              intercorrencias.push(`Achado no Mapa Anatômico: ${tipoIdx} na região ${reg} (Intensidade: ${m.intensity}/10)${m.observations ? ` - ${m.observations}` : ""}`);
            });
          }
        }
      }

      return {
        id: p.id,
        nome: p.nome_ficticio,
        leito: p.numero_leito,
        diagnostico: p.diagnostico_principal,
        ultima_evolucao: pMetrics.length > 0 ? pMetrics[pMetrics.length - 1] : null,
        intercorrencias: intercorrencias,
        score: score
      };
    });

    // Sort patients descending by clinical severity score
    const sortedPatients = [...mappedPatients].sort((a, b) => b.score - a.score);

    if (sortedPatients.length === 0) {
      setResponse("Nenhum paciente ativo no momento para gerar o resumo do plantão. Adicione pacientes e evoluções para visualizar o quadro clínico.");
      setLoading(false);
      return;
    }

    const isOnline = isApplicationOnline();
    const payload = {
      requestType: "passagem",
      modo: isOnline ? "online" : "offline",
      turno: "Tarde",
      data: new Date().toLocaleDateString('pt-BR'),
      enfermeiro: "Enfermeiro de Plantão",
      pacientes: sortedPatients.map(p => ({
        nome: p.nome,
        leito: p.leito,
        diagnostico: p.diagnostico,
        ultima_evolucao: p.ultima_evolucao,
        intercorrencias: p.intercorrencias
      })),
      cache: {
        turno: "Tarde",
        pacientes: sortedPatients.map(p => ({
          nome: p.nome,
          leito: p.leito
        }))
      }
    };

    let isApiSuccessful = false;
    try {
      const res = await fetch("/api/clinical-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(!isOnline ? { "x-stellarcare-offline": "true" } : {})
        },
        body: JSON.stringify(payload)
      });
      if (res.status === 404) {
        throw new Error("404");
      }
      const data = await res.json();
      setResponse(data.response || "Não foi possível gerar o resumo. Verifique os dados e tente novamente.");
      isApiSuccessful = true;
    } catch (err: any) {
      // Se falhou por 404 (Netlify) ou erro de conexão, verificamos se temos a chave VITE_GEMINI_API_KEY no cliente
      const clientApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (clientApiKey) {
        console.log("[AssistenteClinico] API Express indisponível (404/Erro de conexão). Iniciando chamada direta ao Gemini API via REST no cliente (Modo Netlify)...");
        try {
          const sysInstruction = `
Você é um assistente clínico integrado ao StellarCare, um aplicativo de enfermagem hospitalar usado por enfermeiros durante a assistência direta ao paciente. Você recebe dados estruturados em JSON e deve ajudar o enfermeiro de forma objetiva, segura e eficiente.

Idioma: sempre português brasileiro.
Tom: clínico, direto, sem rodeios.
Tamanho das respostas: máximo 120 palavras, salvo quando for solicitado um resumo completo de plantão.
Formato: texto simples, sem markdown, sem asteriscos, sem listas longas.
Regra de ouro: nunca invente, nunca complete dados ausentes. Se uma informação faltar para um paciente, apenas indique "sem registro para X" ou foque no que está presente.
Limitação clínica: você organiza e resume dados de enfermagem. Nunca sugira diagnósticos médicos, prescrições ou condutas que não estejam já registradas no sistema.

REGRAS DE SEGURANÇA GLOBAIS:
1. Nunca sugira diagnósticos, hipóteses diagnósticas ou condutas médicas.
2. Nunca complete os campos ausentes no JSON com suposições de valores biológicos ou clínicos fictícios. Use a expressão "sem registro" se não houver registros ou se estiver ausente.
3. Nunca exponha dados de um paciente em resposta direcionada a outro.
4. Se receber um JSON malformado, quebrado ou incompatível, responda exatamente: "não foi possível processar os dados — verifique o formato enviado".
5. Se o usuário solicitar diagnósticos médicos ou condutas exclusivas do médico (como prescrever remédios), responda exatamente e apenas: "este assistente é voltado para suporte à assistência de enfermagem".
`;

          const userPrompt = `
MÓDULO A — PASSAGEM DE PLANTÃO
Dados de entrada:
${JSON.stringify({ pacientes: payload.pacientes, turno: payload.turno }, null, 2)}

Tarefa:
Apresente os pacientes detalhando-os exatamente na ordem em que aparecem na lista do JSON de entrada (os pacientes já vêm ordenados de forma decrescente pela gravidade das alterações clínicas, com os casos mais graves ou com mais intercorrências no topo). Isso é crítico para garantir que os pacientes mais alterados/graves sejam relatados logo no início do resumo.

Regras de formatação obrigatórias para legibilidade e de espaçamento amplo:
1. Comece cada paciente com um cabeçalho em letras maiúsculas em uma linha exclusiva: "PACIENTE: [Nome] (Leito: [Número])"
2. Na linha imediatamente abaixo, insira um ponto de marcador com o resumo de no máximo 3 linhas: "• [Resumo contendo estado geral no turno, intercorrências do plantão, e pendências claras para o próximo turno]"
3. CRÍTICO: Insira obrigatoriamente DUAS quebras de linha completas (criando uma linha totalmente em branco) entre os pacientes para que o texto não fique corrido ou amontoado.
4. Ao final de todos os pacientes, insira uma linha em branco completa seguida de "Situação Geral do Plantão:" com um parágrafo limpo de fechamento do shift.
5. Formato de texto limpo: não use formatação markdown, sem asteriscos (*) de negrito e sem blocos de código markdown.
6. CRÍTICO: Sempre descreva sumariamente os achados do Mapa Anatômico indicando o tipo (dor/lesão) e as partes do corpo (MMSS, MMII, Tórax, Abdômen ou Costas) afetadas, caso estejam registradas.
`;

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientApiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: userPrompt }
                    ]
                  }
                ],
                systemInstruction: {
                  parts: [{ text: sysInstruction }]
                },
                generationConfig: {
                  temperature: 0.1,
                }
              })
            }
          );

          if (!geminiRes.ok) {
            throw new Error(`REST API error: ${geminiRes.ok ? "OK" : geminiRes.status}`);
          }

          const geminiData = await geminiRes.json();
          const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            setResponse(generatedText);
          } else {
            setResponse("Não foi possível processar os dados — nenhum texto foi retornado pela API do Gemini. Verifique as cotas da chave configurada.");
          }
        } catch (fallbackError: any) {
          console.error("Gemini Fallback client-side failed:", fallbackError);
          if (fallbackError?.message?.includes("401")) {
            setResponse(
              "Erro 401 (Não Autorizado): A chave de API do Gemini configurada no Netlify é inválida ou expirou. Por favor, acesse o Google AI Studio (ai.google.dev) para obter uma chave de API do Gemini gratuita e funcional e configure-a na variável de ambiente VITE_GEMINI_API_KEY no painel do Netlify (suas chaves válidas de IA começam com 'AIzaSy')."
            );
          } else if (fallbackError?.message?.includes("403")) {
            setResponse(
              "Erro 403 (Proibido): Acesso proibido à API do Gemini. Certifique-se de que sua chave possui privilégios válidos e que seu país de origem é suportado pela API do Google."
            );
          } else if (fallbackError?.message?.includes("429")) {
            setResponse(
              "Erro 429 (Limite Excedido): Muitas requisições em curto período de tempo. Aguarde alguns segundos para tentar novamente."
            );
          } else {
            setResponse(
              `Erro na geração direta: ${fallbackError?.message || "verifique o formato enviado"}. Por favor, certifique-se de que a variável VITE_GEMINI_API_KEY possui uma chave de API do Gemini válida no Netlify.`
            );
          }
        }
      } else {
        setResponse("não foi possível processar os dados — verifique o formato enviado");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-black/60 z-[9999] flex items-end justify-center touch-none"
          onClick={() => setIsOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="bg-[#FAF9F5] w-full max-w-[430px] rounded-t-[24px] shadow-2xl flex flex-col h-[85vh] text-gray-900 border-t border-gray-100 select-none overflow-hidden"
            onClick={e => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header Limpo e Compacto */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 bg-white shrink-0">
              <div className="flex flex-col gap-0.5">
                <h1 className="text-[20px] font-black text-gray-950 tracking-tight">Resumo do Plantão</h1>
                <p className="text-[#1D9E75] text-[10px] font-black uppercase tracking-widest leading-none">Assistente Virtual de Enfermagem</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5 pb-24 scrollbar-hide">
        <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-100 text-[11.5px] leading-relaxed text-teal-800 shrink-0">
          <p className="font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-teal-600" />
            Passagem de Plantão
          </p>
          <p>
            Processa dados estruturados e intercorrências clínicas críticas para gerar exatamente 1 parágrafo com no máximo 3 linhas por paciente sem floreios de IA.
          </p>
        </div>
        
        <button
          onClick={handleAssistantAction}
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl text-center text-xs tracking-wider uppercase disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-600/20 shrink-0"
        >
          {loading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <Clipboard className="w-4.5 h-4.5" />}
          Gerar Relatório de Passagem
        </button>

      {/* Output block display (Plain-Text without Markdown) */}
      {(loading || response) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3 select-text mt-2 shrink-0">
          <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-600 uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-teal-500" /> Relatório Gerado
            </div>
            {/* FEATURE NOVO: Botão para exportar o relatório gerado por IA para formato PDF */}
            {response && !loading && (
              <button
                onClick={exportarPassagemPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg uppercase tracking-wide transition-all self-center"
              >
                <Download className="w-3.5 h-3.5 hover:scale-110 transition-transform" /> Baixar PDF
              </button>
            )}
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-6 justify-center text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-[11.5px] font-bold uppercase tracking-wider">Aguardando IA processar o plantão...</span>
            </div>
          ) : (
            <div className="text-xs text-gray-700 leading-relaxed font-semibold whitespace-pre-line text-left bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-inner">
              {response}
            </div>
          )}
        </div>
      )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

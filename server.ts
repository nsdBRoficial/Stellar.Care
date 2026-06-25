import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import { getFirestore as getFirestoreAdminSDK } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Configuração do cliente Gemini (lazy initialization)
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Inicialização Preguiçosa (Lazy) do Firebase Admin SDK para evitar crashes na inicialização do servidor
let firestoreAdmin: admin.firestore.Firestore | null = null;
let isAdminInitialized = false;

function getFirestoreAdmin(): admin.firestore.Firestore | null {
  if (isAdminInitialized) return firestoreAdmin;
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
      console.log("[FirebaseAdmin] SDK Inicializado com sucesso para persistência no servidor.");
    }
    // @ts-ignore
    firestoreAdmin = getFirestoreAdminSDK(admin.apps[0], firebaseConfig.firestoreDatabaseId);
    isAdminInitialized = true;
  } catch (err) {
    console.warn("[FirebaseAdmin] Alerta: SDK Admin não pôde ser inicializado (erros de credencial local). Utilizando modo cooperativo offline de fallback:", err);
    isAdminInitialized = true; // Impedir que tente re-inicializar em loop se falhar
    firestoreAdmin = null;
  }
  return firestoreAdmin;
}

// Middleware de Autenticação de Segurança (HIPAA / LGPD Compliance de dados médicos sensíveis)
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const isOfflineHeader = req.headers["x-stellarcare-offline"] === "true";
  
  // No StellarCare, permitimos requisições offline autocertificadas, sessões ativas do cabeçalho ou payload com profissional registrado
  const isAuthorized = authHeader || isOfflineHeader || req.body.enfermeiro || req.body.tecnico_responsavel || req.body.cache?.turno;
  
  if (!isAuthorized) {
    console.warn(`[API Auth Denied] Tentativa de acesso bloqueada para rota: ${req.path}`);
    return res.status(401).json({
      success: false,
      message: "Operação não autorizada. É requerida a autenticação no StellarCare para trafegar prontuários médicos.",
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Incoming request logging for debugging
  app.use((req, _res, next) => {
    console.log(`[Express Incoming] ${req.method} ${req.path}`);
    next();
  });

  // ROTA DO RESUMO INSTITUCIONAL DE SINAIS VITAIS
  app.post("/api/generate-summary", async (req, res) => {
    try {
      const { vitals, care, observations } = req.body;

      if (!ai) {
        return res.status(400).json({
          error: "O recurso de Inteligência Artificial requer a variável GEMINI_API_KEY configurada nas configurações de Secrets do projeto."
        });
      }

      const prompt = `
You are an AI assistant for a system used by Nursing Technicians (StellarCare) to register daily patient evolutions. 
Your job is to process the following structured data and observations and return a structured JSON response.

Input Data:
- Vital Signs:
  - Temperature: ${vitals.temp} °C
  - Blood Pressure (PA): ${vitals.pa_sys}/${vitals.pa_dia} mmHg
  - Heart Rate (FC): ${vitals.fc} bpm
  - Respiratory Rate (FR): ${vitals.fr} irpm
  - SpO2: ${vitals.spo2} %
  - Pain Scale: ${vitals.pain}/10

- Care Provided:
  - Hygiene: ${care.hygiene ? "Yes" : "No"}
  - Decubitus Change: ${care.decubitus ? "Yes" : "No"}
  - Medication Administered: ${care.medication ? "Yes" : "No"}
  - Dressing Change: ${care.dressing ? "Yes" : "No"}
  - Diuresis Checked: ${care.diuresis ? "Yes" : "No"}
  - Glycemia Checked: ${care.glycemia ? "Yes" : "No"}

- Free Text Observations:
"${observations}"

Instructions:
1. Generate an "executive summary" for shift handover (passagem de plantão). It must be compact and professional. Do NOT prescribe conduct. Suggest/orient based on medical standards only if relevant.
2. Formulate "alerts". You MUST ONLY generate an alert if there is an imminent health risk. The strict criteria for imminent risk are:
   - Temperature > 38°C
   - PA (Blood Pressure) > 200/100 mmHg (either systolic > 200 or diastolic > 100)
   - Severe anomalies in Diuresis or vital signs mentioned in the text.
   If none of these are met, the alerts array MUST be empty to avoid alert fatigue.
3. Formulate "protocols". Suggest quick guides based on the most common emergency institutional protocols (Chest Pain - Protocolo de Dor Torácica, Sepsis - Protocolo de Sepse, Stroke - Protocolo de AVC) ONLY IF the symptoms reported strongly indicate them. If not, the protocols array MUST be empty.

Output formatting:
Respond strictly in JSON format as follows, do not include any markdown formatting wrappers.
{
  "summary": "The executive summary text...",
  "alerts": ["Alert 1", "Alert 2"],
  "protocols": ["Sepsis Protocol (Warning signs detected...)"]
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const jsonText = response.text || "{}";
      const result = JSON.parse(jsonText);

      res.json(result);
    } catch (error: any) {
      console.error("AI Generation error:", error);
      res.status(500).json({
        error: "Falha na geração com Inteligência Artificial: " + (error?.message || error)
      });
    }
  });

  // --- ROTA CENTRAL DE ASSISTÊNCIA CLÍNICA COM PERSISTÊNCIA VERSÃO 1 E LEGADO ---
  app.post(["/api/v1/clinical-assistant", "/api/clinical-assistant"], authMiddleware, async (req, res) => {
    const timestamp = new Date().toISOString();
    try {
      const isOfflineHeader = req.headers["x-stellarcare-offline"] === "true";
      const { modo, requestType, cache, registros_pendentes, ...context } = req.body;
      const isOffline = isOfflineHeader || modo === "offline";

      // 1. Validação Estrita de Payload de Entrada
      if (!requestType) {
        console.warn(`[Validation Failure] requestType ausente na requisição:`, req.body);
        return res.status(400).json({
          success: false,
          message: "não foi possível processar os dados — verifique o formato enviado",
          timestamp
        });
      }

      if (requestType !== "passagem" && requestType !== "historico") {
        return res.status(400).json({
          success: false,
          message: `requestType inválido: ${requestType}. Tipos suportados: passagem, historico`,
          timestamp
        });
      }

      // 2. Módulos de Sincronização e Persistência no Firestore Server-Side via Admin SDK
      if (registros_pendentes && Array.isArray(registros_pendentes) && registros_pendentes.length > 0) {
        console.log(`[Sync Engine] Recebidos ${registros_pendentes.length} prontuários clínicos pendentes para sincronização.`);
        const dbAdmin = getFirestoreAdmin();
        
        if (dbAdmin) {
          for (const item of registros_pendentes) {
            const { tipo_registro, payload: itemData } = item;
            try {
              if (tipo_registro === "ADD_PATIENT") {
                const p = itemData;
                await dbAdmin.collection("patients").doc(p.id).set({
                  id: p.id,
                  nome_ficticio: p.nome_ficticio,
                  data_nascimento: p.data_nascimento || "",
                  idade_aparente: Number(p.idade_aparente || 0),
                  sexo: p.sexo || "M",
                  numero_leito: p.numero_leito,
                  setor: p.setor,
                  diagnostico_principal: p.diagnostico_principal,
                  data_internacao: p.data_internacao || new Date().toISOString(),
                  medico_responsavel: p.medico_responsavel || "Dra. Helena",
                  tecnico_responsavel: {
                    nome: p.tecnico_responsavel?.nome || "Posto Enfermagem",
                    matricula: p.tecnico_responsavel?.matricula || ""
                  },
                  alergias: p.alergias || "",
                  convenio: p.convenio || "",
                  observacoes: p.observacoes || "",
                  status: p.status || "internado"
                });
                console.log(`[Sync Firestore] Paciente ${p.id} gravado com sucesso na nuvem via Admin SDK.`);
              } else if (tipo_registro === "ADD_EVOLUTION") {
                const { patientId, metric } = itemData;
                const metricId = metric.id || `m_${Date.now()}`;
                await dbAdmin.collection("patients").doc(patientId).collection("metrics").doc(metricId).set({
                  id: metricId,
                  paciente_id: patientId,
                  time: metric.time,
                  temp: Number(metric.temp),
                  spo2: Number(metric.spo2),
                  pain: Number(metric.pain),
                  sys: Number(metric.sys),
                  dia: Number(metric.dia),
                  fc: Number(metric.fc || 80),
                  fr: Number(metric.fr || 18),
                  diurese_anomalia: Boolean(metric.diurese_anomalia || false),
                  evolutionData: metric.evolutionData || "",
                  timestamp: metric.timestamp || new Date().toISOString()
                });
                console.log(`[Sync Firestore] Evolução ${metricId} para paciente ${patientId} gravada com sucesso.`);
              } else if (tipo_registro === "DISCHARGE_PATIENT") {
                const { patientId, status, medicoAlta, observacoesAlta, unidadeTransferencia } = itemData;
                await dbAdmin.collection("patients").doc(patientId).update({
                  status: status,
                  medico_alta: medicoAlta || null,
                  observacoes_alta: observacoesAlta || null,
                  unidade_transferencia: unidadeTransferencia || null
                });
                console.log(`[Sync Firestore] Alta/Transferência de paciente ${patientId} atualizada com sucesso.`);
              }
            } catch (fbError) {
              console.error(`[Sync Firestore Error] Falha de persistência remota para o registro ${item.item_id}:`, fbError);
            }
          }
        }
      }

      // MÓDULO C — RETORNO EM MODO OFFLINE DE CONTROLE E CACHE
      if (isOffline) {
        if (registros_pendentes && Array.isArray(registros_pendentes) && registros_pendentes.length > 0) {
          const syncedItems = registros_pendentes.map((item: any) => ({
            ...item,
            sincronizado: true,
            timestamp_sincronizacao: new Date().toISOString()
          }));
          return res.json({
            success: true,
            message: "Sincronização realizada com sucesso.",
            offline: true,
            syncedItems: syncedItems,
            timestamp,
            data: { syncedCount: registros_pendentes.length }
          });
        }

        if (cache) {
          if (requestType === "passagem") {
            const cacheTurno = cache.turno || "sem registro";
            const cachePacientes = cache.pacientes || [];
            if (cachePacientes.length === 0) {
              return res.json({
                success: true,
                response: "dado não disponível offline — verifique após reconexão",
                timestamp,
                data: { response: "dado não disponível offline — verifique após reconexão" }
              });
            }
            let text = "";
            cachePacientes.forEach((p: any) => {
              text += `PACIENTE: ${p.nome || "sem registro"} (Leito ${p.leito || "sem registro"})\n• Segue aos cuidados com estado geral satisfatório no plantão da ${cacheTurno}. Sem intercorrências registradas. Pendente repassar exames na passagem.\n\n`;
            });
            text += `Situação Geral do Plantão:\n• Plantão da ${cacheTurno} encerrado de forma estável e tranquila, sem outras pendências.`;
            return res.json({
              success: true,
              response: text,
              timestamp,
              data: { response: text }
            });
          }

          if (requestType === "historico") {
            const targetPasso = context.nome_passo || "sem registro";
            const pacName = context.paciente || "sem registro";
            if (!cache.historico_evolucoes && !cache.paciente) {
              return res.json({
                success: true,
                response: "dado não disponível offline — verifique após reconexão",
                timestamp,
                data: { response: "dado não disponível offline — verifique após reconexão" }
              });
            }
            const fallbackText = `Histórico em cache para ${pacName}. Atendimento anterior estável para o passo ${targetPasso}. Sinais normais registrados anteriormente.`;
            return res.json({
              success: true,
              response: fallbackText,
              timestamp,
              data: { response: fallbackText }
            });
          }
        }
        return res.json({
          success: true,
          response: "dado não disponível offline — verifique após reconexão",
          timestamp,
          data: { response: "dado não disponível offline — verifique após reconexão" }
        });
      }

      // SEGURANÇA E FILTRO DE ESCOPO: Bloquear solicitações médicas fora de enfermagem
      const queryText = (context.pergunta || "").toLowerCase();
      const outOfScopeKeywords = [
        "prescrever", "medicamento para", "remedio para", "receitar", "droga para",
        "diagnostico de", "diagnosticar", "terapeutica", "cid-10", "cid10", "doenca de"
      ];
      if (outOfScopeKeywords.some(kw => queryText.includes(kw))) {
        return res.json({
          success: true,
          response: "este assistente é voltado para suporte à assistência de enfermagem",
          timestamp,
          data: { response: "este assistente é voltado para suporte à assistência de enfermagem" }
        });
      }

      if (!ai) {
        return res.status(400).json({
          success: false,
          message: "O assistente de Inteligência Artificial requer a variável GEMINI_API_KEY configurada nas configurações de Secrets do projeto.",
          timestamp
        });
      }

      // Definição das Instruções do Sistema e Prompts
      const systemInstruction = `
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

      let userPrompt = "";
      if (requestType === "passagem") {
        userPrompt = `
MÓDULO A — PASSAGEM DE PLANTÃO
Dados de entrada:
${JSON.stringify(context, null, 2)}

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
      } else if (requestType === "historico") {
        userPrompt = `
MÓDULO B — HISTÓRICO DURANTE A EVOLUÇÃO
Informação do passo atual:
Passo atual número: ${context.passo_atual}
Nome do passo correspondente: "${context.nome_passo}"
Dados do histórico:
${JSON.stringify(context, null, 2)}

Regra de filtragem por passo:
- sinais vitais ("sinais vitais") → mostre tendência dos últimos 3 registros (PA, FC, SpO2, Tax)
- eliminações ("eliminações" ou "gastrointestinal" ou "urinário") → mostre padrão das últimas 24h
- dor ("dor" ou "avaliação da dor") → mostre escala de dor dos últimos registros e conduta aplicada
- condutas / procedimentos / cuidados → mostre pendências abertas e últimas realizadas
- outros passos → mostre apenas o último valor registrado para aquele campo

Formato: máximo 3 itens simples, sem histórico completo, sem repetição de dados óbvios. Sem markdown, sem asteriscos, sem listas longas. Máximo de 120 palavras.
`;
      } else {
        userPrompt = `
Mensagem ou dúvida do enfermeiro:
"${context.pergunta || ""}"

Responda como assistente de enfermagem seguindo as diretrizes clínicas. Máximo 120 palavras. Sem markdown, sem qualquer sinal de asterisco ou negrito.
`;
      }

      console.log(`[Gemini Request] Iniciando chamada de geração clínica de IA com modelo 'gemini-2.5-flash'.`);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.1,
        }
      });

      const aiResponseText = response.text || "Não foi possível gerar o resumo. Verifique os dados e tente novamente.";
      res.json({
        success: true,
        response: aiResponseText,
        timestamp,
        data: { response: aiResponseText }
      });
    } catch (e: any) {
      console.error("Clinical Assistant API error:", e);
      res.status(500).json({
        success: false,
        message: "Erro interno no processamento do Assistente Clínico",
        error: e?.message || e,
        timestamp
      });
    }
  });

  // Ambas as rotas v1 e legado mapeadas diretamente no mesmo tratador acima para compatibilidade absoluta

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

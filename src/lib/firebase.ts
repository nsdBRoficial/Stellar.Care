// Importação do inicializador de aplicativos Firebase a partir do SDK principal do Firebase
import { initializeApp } from "firebase/app";
// Importação do módulo de autenticação do Firebase para gerenciamento de credenciais se necessário
import { getAuth } from "firebase/auth";
// Importação de métodos do Firestore para persistência do estado clínico de pacientes e enfermeiros
import { getFirestore } from "firebase/firestore";
// Importação compartilhada do arquivo de configuração gerado pela infraestrutura StellarCare
import firebaseConfig from "../../firebase-applet-config.json";

// Inicializa a instância raiz do aplicativo Firebase com as credenciais do projeto ativo do AI Studio
const app = initializeApp(firebaseConfig);

// Inicializa a conexão com o banco de dados Cloud Firestore usando o ID específico provisionado para segurança de dados
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Inicializa o serviço de autenticação do Firebase para validar a identidade de enfermeiros do plantão
export const auth = getAuth();

// Enumeração tipada que representa todas as ações possíveis no banco de dados Cloud Firestore
export enum OperationType {
  // Ação de criação de novos prontuários de pacientes ou perfis de enfermagem
  CREATE = "create",
  // Ação de atualização de sinais vitais, histórico evolutivo ou alta do paciente
  UPDATE = "update",
  // Ação de remoção/deleção física de um prontuário (bloqueada nas regras de segurança)
  DELETE = "delete",
  // Ação de obtenção de listagens de pacientes no painel principal
  LIST = "list",
  // Ação de busca pontual de um único paciente por identificador
  GET = "get",
  // Ação de escrita genérica agregada no banco de dados
  WRITE = "write",
}

// Interface que define o payload de diagnóstico enviado no relatório do Red Team quando há permissão negada
export interface FirestoreErrorInfo {
  // Mensagem nativa de erro retornada pelo driver do Firebase Firestore
  error: string;
  // Tipo da operação no Firestore no momento do bloqueio de privilégios
  operationType: OperationType;
  // Caminho exato da coleção ou documento que sofreu a tentativa de acesso/gravação
  path: string | null;
  // Detalhes da identidade ativa para auditar se o usuário possuía cargo autenticado
  authInfo: {
    // Identificador único (UID) do Firebase Auth correspondente à operação
    userId?: string | null;
    // Email do profissional de enfermagem autenticado no escopo da requisição
    email?: string | null;
    // Booleano confirmando se o email institucional foi previamente verificado
    emailVerified?: boolean | null;
    // Booleano indicando se o acesso foi realizado de forma anônima (sem pre-cadastro)
    isAnonymous?: boolean | null;
    // Identificador opcional do tenant contratado do StellarCare
    tenantId?: string | null;
    // Lista de provedores vinculados (ex. Google Login ou OAuth institucional)
    providerInfo?: {
      // Nome do provedor cadastrado
      providerId?: string | null;
      // Email do profissional associado ao provedor
      email?: string | null;
    }[];
  };
}

// Handler central de exceções que formata erros de segurança no formato de auditoria JSON exigido
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Constrói o objeto estruturado contendo metadados de credencial para envio e análise pelo linter/Red Team
  const errInfo: FirestoreErrorInfo = {
    // Captura a mensagem de erro da instância de exceção ou converte para string pura
    error: error instanceof Error ? error.message : String(error),
    // Alinha os dados do usuário corrente que realizou a tentativa de requisição à nuvem
    authInfo: {
      // UID do enfermeiro logado
      userId: auth.currentUser?.uid,
      // Email registrado no Firebase Auth
      email: auth.currentUser?.email,
      // Status de verificação do email
      emailVerified: auth.currentUser?.emailVerified,
      // Declaração de usuário anônimo
      isAnonymous: auth.currentUser?.isAnonymous,
      // ID do tenant associado à sessão
      tenantId: auth.currentUser?.tenantId,
      // Mapeamento de múltiplos logins vinculados à conta da clínica
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        // ID do provedor correspondente
        providerId: provider.providerId,
        // Email registrado naquele provedor
        email: provider.email,
      })) || [],
    },
    // Vincula a operação bloqueada regulada pela regra de segurança
    operationType,
    // Caminho físico afetado (ex: "patients" ou "users")
    path,
  };
  // Registra no console de erros o JSON parseable para auditoria instantânea do Red Team
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  // Lança uma nova exceção contendo a string serializada contendo os dados de Zero-Trust conforme especificado
  throw new Error(JSON.stringify(errInfo));
}

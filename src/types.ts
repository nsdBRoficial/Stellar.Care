export type ViewState = "login" | "register_user" | "dashboard" | "register_patient" | "evolution" | "records" | "assistant";

export type Role = "ENF" | "TE" | "AE";

export interface User {
  id: string;
  nome_completo: string;
  matricula: string;
  cargo: Role;
  stellar_wallet_address?: string;
}

export type PatientStatus = "internado" | "alta" | "transferido" | "obito";
export type Sex = "M" | "F" | "I";

export interface Patient {
  id: string;
  nome_ficticio: string;
  data_nascimento: string;
  idade_aparente: number;
  sexo: Sex;
  numero_leito: string;
  setor: string;
  diagnostico_principal: string;
  data_internacao: string;
  medico_responsavel: string;
  tecnico_responsavel?: { nome: string; matricula: string };
  tecnicos_adicionais?: Array<{ nome: string; matricula: string }>;
  convenio?: string;
  alergias?: string;
  observacoes?: string;
  status: PatientStatus;
  criado_em?: string;
  // FEATURE NOVO: Informações de destino de transferência/alta para o prontuário
  unidade_transferencia?: string;
  medico_alta?: string;
  observacoes_alta?: string;
}

export interface MetricPoint {
  id?: string;
  paciente_id?: string;
  time: string;
  temp: number;
  spo2: number;
  pain: number;
  sys: number;
  dia: number;
  fc?: number;
  fr?: number;
  diurese_anomalia?: boolean;
  evolutionData?: any;
  timestamp?: string;
}

export interface Alerta {
  nivel: 'CRITICO' | 'ATENCAO';
  mensagem: string;
  protocolo: string;
}


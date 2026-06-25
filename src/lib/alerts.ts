import { MetricPoint, Alerta } from "../types";

export function verificarAlertas(sinaisVitais: MetricPoint): Alerta[] {
  const alertas: Alerta[] = [];
  
  if (sinaisVitais.sys > 200 || sinaisVitais.dia > 100) {
    alertas.push({
      nivel: 'CRITICO',
      mensagem: '⚠️ PRESSÃO ARTERIAL CRÍTICA: PA acima de 200/100 mmHg',
      protocolo: 'Protocolo de Dor Torácica — Albert Einstein'
    });
  }
  
  if (sinaisVitais.temp > 38.0) {
    alertas.push({
      nivel: 'ATENCAO',
      mensagem: '🌡️ FEBRE DETECTADA: Temperatura acima de 38°C',
      protocolo: 'Protocolo de Sepse — Sírio-Libanês'
    });
  }
  
  if (sinaisVitais.diurese_anomalia === true) {
    alertas.push({
      nivel: 'ATENCAO',
      mensagem: '💧 ANOMALIA DE DIURESE: Volume/padrão alterado',
      protocolo: 'Verificar sinais de choque — Protocolo de Sepse'
    });
  }
  
  return alertas;
}

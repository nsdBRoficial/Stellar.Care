import React, { useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import { Alerta } from "../types";

export interface AlertaClinicoProps {
  key?: React.Key;
  alerta: Alerta;
  onDismiss: () => void;
}

export function AlertaClinico({ alerta, onDismiss }: AlertaClinicoProps) {
  const isCri = alerta.nivel === "CRITICO";

  return (
    <div className={`relative mb-3 p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
      isCri ? "bg-red-50 border-red-200 animate-pulse text-red-900" : "bg-orange-50 border-orange-200 text-orange-900"
    }`}>
      <div className={`mt-0.5 ${isCri ? "text-red-600" : "text-orange-500"}`}>
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h4 className={`text-sm font-bold ${isCri ? "text-red-700" : "text-orange-700"}`}>
          {alerta.mensagem}
        </h4>
        <p className={`text-xs mt-1 font-medium ${isCri ? "text-red-800" : "text-orange-800"} flex items-center gap-1`}>
          <Info className="w-3 h-3" />
          Protocolo sugerido: {alerta.protocolo}
        </p>
      </div>
      <button 
        onClick={() => {
          if (confirm("Tem certeza que deseja dispensar este alerta clínico?")) {
            onDismiss();
          }
        }}
        className={`p-1.5 rounded-lg transition-colors ${
          isCri ? "hover:bg-red-100 text-red-500" : "hover:bg-orange-100 text-orange-500"
        }`}
        title="Dispensar alerta"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

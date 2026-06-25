import React, { InputHTMLAttributes, useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { Role } from "../types";

interface ValidaMatriculaProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onValidChange: (isValid: boolean, cargo?: Role) => void;
}

export function ValidaMatricula({ value, onChange, onValidChange, className = "", ...props }: ValidaMatriculaProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [cargo, setCargo] = useState<Role | undefined>(undefined);

  useEffect(() => {
    const MATRICULA_REGEX = /^\d{1,6}-[A-Z]{2,4}$/i;
    if (!value) {
      setIsValid(null);
      setCargo(undefined);
      onValidChange(false, undefined);
      return;
    }

    const match = value.match(MATRICULA_REGEX);
    if (match) {
      setIsValid(true);
      const letters = value.split('-')[1]?.toUpperCase();
      let determinedCargo: Role | undefined;
      
      if (letters === 'ENF') {
        determinedCargo = 'ENF';
      } else if (letters === 'TE') {
        determinedCargo = 'TE';
      } else if (letters === 'AE') {
        determinedCargo = 'AE';
      }

      setCargo(determinedCargo);
      onValidChange(true, determinedCargo);
    } else {
      setIsValid(false);
      setCargo(undefined);
      onValidChange(false, undefined);
    }
  }, [value, onValidChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    onChange(formatted);
  };

  return (
    <div className="relative w-full">
      <input
        {...props}
        value={value}
        onChange={handleChange}
        className={`w-full pl-4 pr-24 py-3 min-h-[44px] border rounded-xl text-base focus:outline-none focus:ring-2 transition-all ${
          isValid === true
            ? "border-green-500 focus:ring-green-500 bg-green-50/10"
            : isValid === false
            ? "border-red-500 focus:ring-red-500 bg-red-50/10"
            : "border-gray-300 focus:ring-teal-500"
        } ${className}`}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
        {cargo && <span className="text-[10px] font-extrabold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{cargo}</span>}
        {isValid === true && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
        {isValid === false && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
      </div>
      {isValid === false && value.length > 0 && (
        <p className="text-xs text-red-500 mt-1">
          Matrícula inválida. O formato aceito é: número + traço + sigla (ex: 123456-ENF, 123456-TE).
        </p>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { User, Role } from "../types";
import { ValidaMatricula } from "./ValidaMatricula";
import * as StellarSdk from "@stellar/stellar-sdk";
// Importar o serviço de autenticação do Firebase, o de banco de dados, o capturador de erros e os tipos utilitários
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
// Importar a facilidade de criação de usuário do SDK de Autenticação do Firebase
import { createUserWithEmailAndPassword } from "firebase/auth";
// Importar as referências de documento e método de gravação direta do Firestore
import { doc, setDoc } from "firebase/firestore";
import { AlertCircle, ArrowRight, Loader2, Hospital, Eye, EyeOff } from "lucide-react";

interface CadastroUsuarioProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CadastroUsuario({ onSuccess, onCancel }: CadastroUsuarioProps) {
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [cargo, setCargo] = useState<Role | "">("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmaSenha, setShowConfirmaSenha] = useState(false);
  const [biometria, setBiometria] = useState(false);
  const [isMatriculaValid, setIsMatriculaValid] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isMatriculaValid || !cargo) {
      setError("Matrícula inválida.");
      return;
    }

    if (senha !== confirmaSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    if (!/(?=.*[A-Z])(?=.*\d).{8,}/.test(senha)) {
      setError("A senha deve ter no mínimo 8 caracteres, 1 maiúscula e 1 número.");
      return;
    }

    if (!biometria) {
      // Retorna erro se a biometria simulada indispensável para profissionais não for ativada pelo usuário
      setError("Confirmação biométrica é obrigatória para cadastro.");
      // Cancela processamento
      return;
    }

    // Ativa o estado de carregamento visual no formulário
    setLoading(true);

    try {
      // Aguarda pequena latência para renderização de feedback do processo de geração
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 4. Gerar Carteira Stellar de forma embarcada
      const pair = StellarSdk.Keypair.random();
      // Extrai a chave pública do par gerado para atrelar ao cadastro profissional
      const walletAddress = pair.publicKey();

      // Define um id inicial baseado em timestamp com prefixo user_
      const userId = "user_" + Date.now().toString(36);

      // Persistir o usuário diretamente e obrigatoriamente na nuvem do Firestore
      console.log("[Cadastro] Registrando usuário no Firestore de forma persistente...");
      try {
        await setDoc(doc(db, "users", userId), {
          id: userId,
          nome_completo: nome,
          matricula: matricula,
          cargo: cargo,
          email: email,
          senha: senha,
          stellar_wallet_address: walletAddress
        });
        console.log("[Cadastro] Usuário persistido no Firestore com sucesso.");
      } catch (fbError: any) {
        console.error("[Cadastro] Falha ao persistir usuário no Firestore:", fbError);
        throw new Error("Não foi possível conectar ao banco de dados Firestore para salvar o usuário. Certifique-se de estar online.");
      }

      // Define o endereço da carteira para transição de tela de sucesso
      setWallet(walletAddress);
    } catch (err: any) {
      // Captura erros gerais de validações estruturais e exibe na interface
      console.error(err);
      // Apresenta a causa da rejeição para o profissional de saúde
      setError(err?.message || "Erro ao criar usuário, verifique as informações.");
    } finally {
      // Desliga o spinner de carregamento da interface do usuário
      setLoading(false);
    }
  };

  if (wallet) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white border border-gray-100 shadow-xl shadow-green-900/5 rounded-2xl text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Hospital className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-gray-900">Cadastro Aprovado</h2>
        <p className="text-gray-600 mb-6">Sua carteira Stellar foi gerada e atrelada à sua matrícula.</p>
        
        <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl mb-6 text-left break-all font-mono text-sm text-gray-600">
          <p className="font-semibold text-gray-700 mb-1 text-xs">STELLAR PUBLIC KEY:</p>
          {wallet}
        </div>

        <button
          onClick={onSuccess}
          className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Acessar Sistema
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] p-4">
      <div className="w-full max-w-[430px] bg-white rounded-2xl shadow-xl shadow-teal-900/5 p-6 border border-gray-100">
        <div className="flex justify-center mb-5">
          <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center shadow-md overflow-hidden">
            <img src="/favicon.svg" alt="Logo" className="w-[85%] h-[85%] object-contain" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center tracking-tight">Cadastro de Profissional</h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-5 flex items-start gap-2 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Nome Completo</label>
            <input
              required
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-base"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Matrícula</label>
            <ValidaMatricula 
              required
              value={matricula} 
              onChange={setMatricula} 
              onValidChange={(valid, c) => {
                setIsMatriculaValid(valid);
                if (valid && c) setCargo(c);
              }} 
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Cargo</label>
            <select
              required
              value={cargo}
              disabled
              onChange={e => setCargo(e.target.value as Role)}
              className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:opacity-100 text-base font-semibold"
            >
              <option value="">Selecione...</option>
              <option value="ENF">Enfermeiro</option>
              <option value="TE">Técnico de Enfermagem</option>
              <option value="AE">Auxiliar de Enfermagem</option>
            </select>
            <p className="text-[11px] text-gray-500 mt-1">O cargo é preenchido automaticamente pela matrícula.</p>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">E-mail Institucional</label>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-base"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Senha</label>
              <div className="relative">
                <input
                  required
                  type={showSenha ? "text" : "password"}
                  minLength={8}
                  maxLength={64}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 min-h-[44px] border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-base"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                  title={showSenha ? "Ocultar senha" : "Exibir senha"}
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {senha.length > 0 && senha.length < 8 && (
                <p className="text-[11px] text-red-500 mt-0.5">Mínimo de 8 caracteres.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Confirmar Senha</label>
              <div className="relative">
                <input
                  required
                  type={showConfirmaSenha ? "text" : "password"}
                  minLength={8}
                  maxLength={64}
                  value={confirmaSenha}
                  onChange={e => setConfirmaSenha(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 min-h-[44px] border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-base"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmaSenha(!showConfirmaSenha)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                  title={showConfirmaSenha ? "Ocultar senha" : "Exibir senha"}
                >
                  {showConfirmaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmaSenha.length > 0 && confirmaSenha !== senha && (
                <p className="text-[11px] text-red-500 mt-0.5">As senhas não coincidem.</p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer py-1.5 min-h-[44px]">
              <input
                type="checkbox"
                checked={biometria}
                onChange={e => setBiometria(e.target.checked)}
                className="w-5 h-5 rounded-md border-gray-300 accent-teal-600 cursor-pointer"
              />
              <span className="text-sm font-semibold text-gray-700">
                Autenticação Biométrica Ativada
              </span>
            </label>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => {
                onCancel();
              }}
              className="flex-1 px-4 py-3 min-h-[44px] border border-gray-300 text-gray-750 font-bold hover:bg-gray-50 rounded-xl transition cursor-pointer text-sm"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading || !isMatriculaValid || senha.length < 8 || senha !== confirmaSenha}
              className="flex-1 bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-3 min-h-[44px] font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Registrar <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

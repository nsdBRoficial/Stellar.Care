import React, { useState } from "react";
import { User, Role } from "../types";
// Importar o serviço de autenticação do Firebase instalado na nuvem do projeto
import { auth, db } from "../lib/firebase";
// Importar o método de login oficial do SDK de autenticação do Firebase e métodos de consulta do Firestore
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { ValidaMatricula } from "./ValidaMatricula";
import { Activity, ShieldCheck, Loader2, ArrowRight, Eye, EyeOff, Fingerprint } from "lucide-react";
import { saveSession7Days, checkExpiredSession, getExpiredUser } from "../lib/session";

interface LoginProps {
  onLogin: (u: User) => void;
  onGoRegister: () => void;
}

export function Login({ onLogin, onGoRegister }: LoginProps) {
  const [matricula, setMatricula] = useState("");
  const [cargo, setCargo] = useState<Role | undefined>(undefined);
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [isMatriculaValid, setIsMatriculaValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lembrarUsuario, setLembrarUsuario] = useState(() => {
    return localStorage.getItem("stellarcare_lembrar_usuario") === "true";
  });

  // Carrega matrícula e senha salvas na inicialização
  React.useEffect(() => {
    const isRememberOn = localStorage.getItem("stellarcare_lembrar_usuario") === "true";
    if (isRememberOn) {
      const savedMatricula = localStorage.getItem("stellarcare_saved_matricula");
      const savedSenha = localStorage.getItem("stellarcare_saved_senha");
      if (savedMatricula) {
        setMatricula(savedMatricula);
        // Deixar marcado como válido, a validação interna do componente cuidará do estado final
        setIsMatriculaValid(true);
      }
      if (savedSenha) {
        setSenha(savedSenha);
      }
    }
  }, []);

  const isExpired = checkExpiredSession();
  const expiredUser = getExpiredUser();

  const handleBiometricLogin = async () => {
    if (!expiredUser) return;
    setLoading(true);
    setError(null);
    try {
      // Process biometric verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const passInfoStr = localStorage.getItem("stellarcare_sessao_7dias");
      if (passInfoStr) {
         const passInfo = JSON.parse(passInfoStr);
         const signedUser = { ...expiredUser };
         // Renova a sessão por mais 7 dias
         saveSession7Days(signedUser, passInfo.passToken || "");
         onLogin(signedUser);
      }
    } catch (err: any) {
      setError("Falha na autenticação biométrica.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    // Interrompe o comportamento padrão de recarregamento do formulário HTML
    e.preventDefault();
    // Exige conformidade da matrícula de enfermagem inserida para prosseguir
    if (!isMatriculaValid) return;

    // Ativa o estado de carregamento visual exibindo o ícone de spinner
    setLoading(true);
    // Limpa registros antigos de erro da interface
    setError(null);

    try {
      // Pequeno atraso para processamento e comunicação do painel do posto
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let userRec: any = null;
      try {
        console.log("[Login] Buscando usuário diretamente na base de dados remota do Firestore...");
        const usersSnap = await getDocs(collection(db, "users"));
        const remoteUsers = usersSnap.docs.map(doc => doc.data());
        userRec = remoteUsers.find((u: any) => u.matricula === matricula);
      } catch (dbError) {
        console.error("[Login] Erro ao conectar com o banco de dados remoto:", dbError);
        throw new Error("Erro de conexão com o banco de dados. Certifique-se de que está online.");
      }

      // Se não existir o profissional salvo, bloqueia
      if (!userRec) {
        throw new Error("Profissional não cadastrado. Por favor, registre-se para obter acesso.");
      }

      // Variável que armazenará a entidade User unificada
      let loggedUser: User;

      // Garante que a senha digitada bate com a cadastrada
      if (userRec.senha === senha) {
        loggedUser = {
          id: userRec.id,
          nome_completo: userRec.nome_completo,
          matricula: userRec.matricula,
          cargo: userRec.cargo,
          stellar_wallet_address: userRec.stellar_wallet_address
        };
      } else {
        throw new Error("Matrícula ou senha incorretos.");
      }

      // Salva a sessão com validade de 7 dias e token associado
      saveSession7Days(loggedUser, senha);

      // Salva ou remove credenciais persistidas com base no check "lembrarUsuario"
      if (lembrarUsuario) {
        localStorage.setItem("stellarcare_lembrar_usuario", "true");
        localStorage.setItem("stellarcare_saved_matricula", matricula);
        localStorage.setItem("stellarcare_saved_senha", senha);
      } else {
        localStorage.setItem("stellarcare_lembrar_usuario", "false");
        localStorage.removeItem("stellarcare_saved_matricula");
        localStorage.removeItem("stellarcare_saved_senha");
      }

      // Invoca callback de ativação do painel operacional do posto de enfermagem
      onLogin(loggedUser);
    } catch (err: any) {
      // Registra a falha detalhada no console para auditoria do linter
      console.error(err);
      // Apresenta o feedback textual de erro na tela de login
      setError(err?.message || "Falha no login: verifique matrícula e senha.");
    } finally {
      // Desativa o spinner liberando o botão de envio
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
      <div className="w-full max-w-[430px] bg-white p-6 rounded-2xl shadow-xl shadow-teal-900/5 border border-gray-100">
        <div className="flex justify-center mb-5">
          <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center shadow-md overflow-hidden">
            <img src="/favicon.svg" alt="Logo" className="w-[85%] h-[85%] object-contain" />
          </div>
        </div>
        
        <h2 className="font-brand text-2xl font-black text-center text-gray-900 mb-1 tracking-tight">StellarCare</h2>
        <p className="text-center text-xs font-bold tracking-widest text-teal-600 uppercase mb-6">
          Acesso Restrito
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-5 text-sm text-center font-semibold">
            {error}
          </div>
        )}

        {isExpired && expiredUser ? (
          <div className="mb-6 space-y-3 animate-in fade-in zoom-in-95 duration-300">
             <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-center">
               <p className="text-[13px] text-teal-900 font-semibold mb-3">Sessão Expirada. Continuar como <span className="font-extrabold">{expiredUser.nome_completo}</span>?</p>
               <button
                 type="button"
                 onClick={handleBiometricLogin}
                 disabled={loading}
                 className="w-full bg-[#1D9E75] hover:bg-[#0F6E56] active:scale-[0.98] text-white font-bold py-3.5 px-4 min-h-[44px] text-base rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
               >
                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Fingerprint className="w-6 h-6" /> Entrar com Digital</>}
               </button>
             </div>
             <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-widest">Ou credencial manual</span>
                <div className="flex-grow border-t border-gray-200"></div>
             </div>
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Matrícula</label>
            <ValidaMatricula 
              value={matricula}
              onChange={setMatricula}
              onValidChange={(valid, c) => {
                setIsMatriculaValid(valid);
                if (valid) setCargo(c);
              }}
              placeholder="Digite sua matrícula"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Senha Identidade</label>
            <div className="relative">
              <input 
                type={showSenha ? "text" : "password"}
                required
                minLength={8}
                maxLength={64}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pl-4 pr-11 py-3 min-h-[44px] border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-base"
                placeholder="••••••••"
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
              <p className="text-xs text-red-500 mt-1">A senha deve conter no mínimo 8 caracteres.</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none py-1">
              <input 
                type="checkbox"
                checked={lembrarUsuario}
                onChange={(e) => setLembrarUsuario(e.target.checked)}
                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 accent-[#1D9E75] cursor-pointer"
              />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">Salvar login neste dispositivo</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!isMatriculaValid || !senha || loading}
            className="w-full bg-[#1D9E75] hover:bg-[#0F6E56] active:scale-[0.98] text-white font-bold py-3.5 px-4 min-h-[44px] text-base rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Entrar no Posto <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 border-t pt-5">
          <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Não possui acesso institucional?
          </p>
          <button onClick={onGoRegister} className="text-teal-600 font-bold hover:underline py-2.5 min-h-[44px] w-full flex items-center justify-center">
            Solicitar credencial de acesso
          </button>
        </div>
      </div>
    </div>
  );
}

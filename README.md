# StellarCare 🌟

O **StellarCare** é um aplicativo moderno e *offline-first* voltado para o monitoramento clínico e registro de evolução de enfermagem em ambientes hospitalares. Construído com tecnologias web de ponta, ele fornece uma interface rápida e confiável para enfermeiros e técnicos acompanharem pacientes, registrarem sinais vitais e usarem inteligência artificial como assistente clínico em tempo real.

## 🚀 Principais Funcionalidades

- **Gestão de Pacientes:** Admissão, transferência e alta de pacientes.
- **Painel de Monitoramento (Dashboard):** Visualização em tempo real do status dos leitos, incluindo triagem de risco através de cores e alertas baseados em sinais vitais críticos.
- **Evolução de Enfermagem Completa:** Formulários estruturados para registros de sinais vitais (Temperatura, SpO2, Dor, PA, FC, FR) e diurese, acompanhados de evolução descritiva textual (SOAP).
- **Assistente Clínico IA (Google Gemini):** Auxílio inteligente, seguro e integrado que analisa em tempo real os sinais vitais e as anotações do paciente para sugerir diagnósticos de enfermagem e protocolos de ação.
- **Funcionamento Offline-First:** O aplicativo não para de funcionar sem internet. Novas evoluções e admissões são guardadas em uma fila de sincronização segura no dispositivo local e transmitidas automaticamente ao servidor assim que a conexão é restabelecida.
- **Sincronização em Tempo Real:** Atualizações feitas em um dispositivo (ex: alta de um paciente) refletem instantaneamente nos demais dispositivos da mesma equipe através de subscrições ativas (`onSnapshot`) com o Cloud Firestore.
- **Validação de Matrícula e Perfis:** O cargo do profissional (Enfermeiro, Técnico de Enfermagem ou Auxiliar) é preenchido e validado automaticamente com base no padrão da matrícula inserida, bloqueando adulterações não autorizadas.
- **Geração de Prontuários (PDF):** Exportação rápida e completa do histórico clínico do paciente em formato PDF, ideal para auditorias, documentação física ou transferência de paciente.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build & Dev:** [Vite](https://vitejs.dev/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Banco de Dados / Backend:** [Firebase Cloud Firestore](https://firebase.google.com/docs/firestore)
- **Autenticação:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Inteligência Artificial:** [Google Gemini API](https://deepmind.google/technologies/gemini/)
- **Ícones e Layout:** [Lucide React](https://lucide.dev/) e [Framer Motion](https://www.framer.com/motion/)
- **Utilitários:** `jspdf` para geração dos laudos no navegador e gerenciamento unificado de estado com Hooks.

## 📂 Estrutura do Projeto

```text
├── src/
│   ├── components/         # Componentes modulares (Dashboard, Formulários, Login, Registros, Assistente IA, etc.)
│   ├── lib/
│   │   ├── firebase.ts     # Configuração e inicialização das instâncias do Firebase
│   │   ├── syncManager.ts  # Core da sincronização offline-first e persistência cruzada local/remota
│   │   └── session.ts      # Gerenciamento de tokens e validação da sessão de usuário ativa
│   ├── App.tsx             # Componente raiz que orquestra o roteamento local e os listeners real-time
│   ├── types.ts            # Definição das interfaces, entidades (Pacientes, Sinais) e tipos estritos
│   └── main.tsx            # Ponto de entrada do ecossistema React
├── firestore.rules         # Regras de segurança de acesso, gravação e leitura do banco de dados
├── package.json            # Gestão de dependências e scripts NPM
└── vite.config.ts          # Configurações do construtor de pacotes (bundler) Vite
```

## ⚙️ Instalação e Execução

### Pré-requisitos
- [Node.js](https://nodejs.org/en/) (Recomendado v18+)
- Conta ativa no [Firebase](https://firebase.google.com/) com um projeto configurado (Firestore e Auth ativados)
- Chave de API do [Google Gemini](https://aistudio.google.com/app/apikey) (Para uso do módulo Assistente Clínico IA)

### Passos para Uso Local

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/stellarcare.git
   cd stellarcare
   ```

2. **Instale as dependências essenciais:**
   ```bash
   npm install
   ```

3. **Configuração de Variáveis de Ambiente:**
   Configure seu próprio arquivo `.env` para apontar ao seu projeto Firebase ou configure as chaves na plataforma em que for hospedar (como Vercel, Netlify ou Google Cloud Run). O `firebase-applet-config.json` poderá requerer ajuste dependo de seu tenant.

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse a aplicação em `http://localhost:3000` (porta padrão via Vite).

5. **Construção para Produção (Build):**
   Para compilar os arquivos e preparar para o deploy (SPA ou full-stack Express se implementado `server.ts`):
   ```bash
   npm run build
   ```

## 🔒 Segurança e Privacidade

- **Firestore Security Rules:** Todo acesso a prontuários e pacientes requer validação cruzada do payload na nuvem. Um usuário mal-intencionado não conseguirá acessar nem modificar prontuários alheios se as políticas estiverem implantadas.
- **Auditoria Silenciosa:** O sistema registra no histórico temporal de quem, quando e com quais métricas a alteração foi assinada (incluindo cargo).

## 🤝 Contribuindo

Contribuições são fundamentais para evoluirmos! Sinta-se à vontade para enviar um *Pull Request*, relatar bugs nas *Issues*, ou sugerir melhorias de usabilidade. Tudo em prol de um sistema de saúde mais tecnológico, ágil e livre de complicações!

---
*StellarCare — Desenvolvido com foco no cuidado humano e precisão técnica.*

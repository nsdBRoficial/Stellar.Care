# StellarCare

O StellarCare é uma aplicação web offline-first para registro de evolução de enfermagem e monitoramento de leitos.

## Funcionalidades

- **Gestão de Pacientes:** Admissão, transferência e alta.
- **Painel de Monitoramento:** Visualização do status dos leitos, triagem de risco e alertas baseados em sinais vitais.
- **Evolução de Enfermagem:** Registro de sinais vitais (Temperatura, SpO2, Dor, PA, FC, FR), diurese e evolução em formato texto.
- **Assistente Clínico (Integração Google Gemini):** Análise de sinais vitais e anotações para sugestão de diagnósticos e condutas de enfermagem.
- **Sincronização Offline-First:** Persistência local de registros (admissões e evoluções) na ausência de rede, com sincronização em fila ("background sync") com o servidor.
- **Comunicação em Tempo Real:** Atualização de dados entre instâncias utilizando subscrições (`onSnapshot`) no Cloud Firestore.
- **Controle de Perfil por Matrícula:** Definição do cargo (Enfermeiro, Técnico de Enfermagem ou Auxiliar) determinada pelo padrão alfanumérico da matrícula do profissional.
- **Exportação em PDF:** Geração de documento PDF contendo o histórico de registros e evoluções do paciente.

## Stack Tecnológico

- **Frontend:** React 18, TypeScript
- **Ferramentas de Build:** Vite
- **Estilização:** Tailwind CSS
- **Banco de Dados / Backend:** Firebase Cloud Firestore
- **Autenticação:** Firebase Authentication
- **Inteligência Artificial:** Google Gemini API
- **Bibliotecas Auxiliares:** Lucide React, Framer Motion, jsPDF

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

Contribuições são fundamentais para evoluirmos! Sinta-se à vontade para enviar um _Pull Request_, relatar bugs nas _Issues_, ou sugerir melhorias de usabilidade. Tudo em prol de um sistema de saúde mais tecnológico, ágil e livre de complicações!

---

_StellarCare — Desenvolvido com foco no cuidado humano e precisão técnica._

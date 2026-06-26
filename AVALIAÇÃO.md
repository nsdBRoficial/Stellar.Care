# 📑 MAPEAMENTO DE MISSÕES E ORIENTAÇÕES TÉCNICAS — UC5

**Instituição:** SENAC Passo Fundo[cite: 1]  
**Curso:** Técnico em Inteligência Artificial | **Período Letivo:** 2026/1  
**Unidade Curricular:** UC5 — Desenvolver Banco de Dados (72h)  
**Atividade:** Analisar Orientações Técnicas e Modelagem de Software  

---

## 🎯 Instruções de Entrega (Fluxo de Git/GitHub)

Cada estudante possui uma **missão exclusiva de documentação técnica** baseada nos requisitos reais do ecossistema *StellarCare*. Para receber a menção de aprovação na entrega, siga estritamente as orientações técnicas de governança do repositório:

1. **Criar uma Branch Própria:** Nunca faça commits diretamente na `main`. Crie sua ramificação a partir da indicação de cada missão (ex: `git checkout -b docs/database-schema`).
2. **Incluir o Cabeçalho Padrão:** Todo arquivo `.md` criado deve conter o cabeçalho de identificação da UC5 na primeira linha do documento.
3. **Commit e Push:** Adicione suas alterações locais, faça o commit com uma mensagem limpa e envie para a nuvem (`git push origin docs/sua-missao`).
4. **Abrir o Pull Request (PR):** Acesse o GitHub do projeto e abra o Pull Request apontando da sua branch para a `main` para que a equipe pedagógica e o Tech Lead realizem o Code Review e aprovem sua entrega.

---

## 🗺️ Distribuição de Missões e Justificativas Técnicas

### 🧱 Módulo 1: Arquitetura e Engenharia de Dados (Foco Total UC5)

#### 📝 Missão 1: `DATABASE_SCHEMA.md` — Modelagem Física Relacional
* **Estudante Responsável:** Arnol  
* **Branch Sugerida:** `docs/database-schema`  
* **O que deve criar:** O script SQL estruturado (`CREATE TABLE`) mapeando todos os tipos de dados extraídos da interface do StellarCare (Temperatura como campo decimal, Sinais Vitais como inteiros, Evolução de texto e Sumário da IA como blocos de texto longo).  
* **Justificativa/Foco UC5:** Garante que o estudante compreendeu a transição prática do modelo conceitual para a estrutura física (DDL) e a escolha correta dos tipos de dados para performance de armazenamento.

#### 🔐 Missão 2: `DATABASE_SECURITY.md` — Governança de Acesso DCL
* **Estudante Responsável:** Raian  
* **Branch Sugerida:** `docs/database-security`  
* **O que deve criar:** Um guia técnico contendo as regras de segurança lógica do hospital utilizando as instruções `GRANT` e `REVOKE`. Deve conter explicitamente o comando que remove qualquer permissão de alteração e exclusão (`REVOKE UPDATE, DELETE`) do perfil do Técnico em Enfermagem para assegurar juridicamente a imutabilidade do prontuário.  
* **Justificativa/Foco UC5:** Valida o domínio prático sobre o controle de acessos (DCL) e a implementação de políticas de segurança e privacidade da informação em ambientes de saúde.

#### 🌐 Missão 3: `ARCHITECTURE_NOSQL.md` — Análise de Dados Semi-Estruturados
* **Estudante Responsável:** Titã  
* **Branch Sugerida:** `docs/architecture-nosql`  
* **O que deve criar:** Um documento descritivo e analítico justificando a necessidade do uso de bancos de dados NoSQL (como o MongoDB, baseado em documentos) para gerenciar e armazenar os sumários e alertas dinâmicos e imprevisíveis gerados pela IA (Gemini).  
* **Justificativa/Foco UC5:** Comprova a capacidade e a visão crítica do estudante de diferenciar, comparar e selecionar arquiteturas de bancos relacionais e não-relacionais com base nos requisitos técnicos variáveis de uma aplicação inteligente.

#### 💾 Missão 4: `DATABASE_BACKUP.md` — Plano de Recuperação e Desastres
* **Estudante Responsável:** João  
* **Branch Sugerida:** `docs/database-backup`  
* **O que deve criar:** Um plano de manutenção detalhando a rotina de segurança das cópias do banco de dados do hospital (estratégia de Backup Completo vs. Incremental) e o passo a passo de como restaurar e importar os arquivos em caso de pane geral ou queda do servidor.  
* **Justificativa/Foco UC5:** Cobre os tópicos obrigatórios de gerenciamento, contingência, manutenção preventiva e restauração de instâncias ativas de SGBD.

---

### 🩺 Módulo 2: Engenharia de Software e Regras de Negócio

#### 📋 Missão 5: `REQUISITOS_SISTEMA.md` — Engenharia de Requisitos
* **Estudante Responsável:** Antonio  
* **Branch Sugerida:** `docs/requisitos-sistema`  
* **O que deve criar:** O mapeamento técnico completo de todos os Requisitos Funcionais (ex: o sistema deve disparar um alerta visual se a temperatura inserida for maior que 38°C) e Requisitos Não Funcionais (ex: o sistema deve congelar o formulário em modo Read-Only após a assinatura).  
* **Justificativa:** Documenta de forma transparente as regras de negócio acordadas na fase de concepção e de Kickoff do sistema, amarrando a experiência visual do front-end às regras de fluxo do hospital.

#### ⚖️ Missão 6: `DILEMAS_ETICOS_LGPD.md` — Compliance e Bioética em IA
* **Estudante Responsável:** Natan  
* **Branch Sugerida:** `docs/dilemas-eticos-lgpd`  
* **O que deve criar:** Um relatório analítico detalhando como o StellarCare trata a privacidade dos dados de saúde sensíveis (LGPD) e o policiamento ético do algoritmo da IA (como o Gemini atuar puramente como consultor auxiliar documental para passagem de plantão, sendo proibido de prescrever dosagens ou emitir diagnósticos médicos autônomos).  
* **Justificativa:** Atende diretamente à competência transversal de Ética, Responsabilidade Social e Legislação aplicada à conduta do profissional de Inteligência Artificial.

#### 📖 Missão 7: `MANUAL_USUARIO.md` — UX e Treinamento de Equipe
* **Estudante Responsável:** Elias  
* **Branch Sugerida:** `docs/manual-usuario`  
* **O que deve criar:** Um manual passo a passo visual e didático com foco na experiência do usuário (UX), orientando o Técnico em Enfermagem sobre como utilizar a plataforma (inserção de sinais vitais, interpretação dos alertas de risco da IA e execução do botão de assinatura digital).  
* **Justificativa:** Desenvolve a habilidade de comunicação técnica interpessoal, garantindo que o software construído seja aplicável e compreensível em um cenário profissional real.

#### 🧪 Missão 8: `RELATORIO_QA.md` — Garantia de Qualidade e Homologação
* **Estudante Responsável:** Braian  
* **Branch Sugerida:** `docs/relatorio-qa`  
* **O que deve criar:** A tabela oficial com os resultados dos testes de homologação executados pelas squads na aplicação (mapeamento de todos os cenários do checklist, indicação de quais passaram ou falharam e o histórico de defeitos abertos e corrigidos antes do deploy).  
* **Justificativa:** Consolida o processo prático de depuração técnica, tratamento de exceções e verificação de conformidade de código antes da entrega final do ecossistema.

#### 🌐 Missão 9: `DATABASE_CONNECTIVITY.md` — Comunicação e Timeout do Mecanismo
* **Estudante Responsável:** Amyr  
* **Branch Sugerida:** `docs/database-connectivity`  
* **O que deve criar:** Um documento de arquitetura frontend/backend detalhando a conectividade e o fluxo de comunicação de dados por meio de objetos JSON via APIs REST. Deve especificar como a instância gerencia cenários de instabilidade na rede do hospital através de políticas de tempo limite de conexão (`timeout`) e os procedimentos operacionais para iniciar, pausar e reiniciar o serviço do banco.  
* **Justificativa/Foco UC5:** Atende de forma direta aos critérios ementares de administração de "Serviço do Mecanismo de Banco de Dado" e controle de "Comunicação entre processos".

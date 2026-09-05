# Política de Segurança e Soberania de Dados Industriais

- **Projeto:** IASTECH P&ID Lens
- **Classificação:** Segurança Industrial / Proteção de Propriedade Intelectual (IP)
- **Status:** Ativo

---

## 1. Princípios de Segurança e Privacidade

Diagramas P&ID contêm segredos industriais estratégicos, rotas químicas proprietárias e parâmetros operacionais confidenciais. O **IASTECH P&ID Lens** foi projetado desde sua concepção com o princípio de **Soberania Absoluta de Dados (Local-First Sovereign)**.

### Invariantes de Segurança

1. **Zero Exfiltração de Dados:** Nenhuma imagem, vetor geométrico, nome de TAG ou documento carregado no sistema é transmitido para servidores remotos, serviços de nuvem ou repositórios externos por padrão.
2. **Ambiente Air-Gapped Nativo:** O sistema opera integralmente em redes industriais isoladas (sem acesso à internet) utilizando WebAssembly compilado para OCR e o motor normativo determinístico ANSI/ISA-5.1.
3. **Chaves de API Estritamente Locais:** Caso o operador opte por conectar modelos comerciais de nuvem (OpenAI ou Google Gemini) para experimentos, as chaves de API são armazenadas exclusivamente no `localStorage` do navegador da estação do cliente, sem trânsito por nenhum backend intermediário.
4. **Resiliência a Falhas:** Falhas de conectividade ou indisponibilidade de daemons locais (como Ollama) ativam de forma imediata e transparente o motor de contingência determinístico local, impedindo o travamento da estação de supervisão.

---

## 2. Reportando Vulnerabilidades

Se você identificar qualquer problema de segurança, comportamento de vazamento de dados ou vulnerabilidade na aplicação:

1. **Canal Reservado:** Não abra uma issue pública no GitHub.
2. **Contato Técnico:** Envie uma notificação detalhada para a equipe de engenharia do projeto.
3. **Conteúdo:** Descreva os passos para reprodução, versão do navegador/Node.js e o potencial impacto identificado.

---

## 3. Diretrizes para Operação em Ambientes Críticos (OT / ICS)

- Empregar em estações de trabalho dedicadas na DMZ industrial ou rede de engenharia segregada.
- Bloquear o tráfego de saída das portas não essenciais caso a estação esteja em zona restrita.
- Para processamento com LLMs locais em rede interna, manter o daemon Ollama isolado na interface de loopback (`127.0.0.1:11434`) ou em servidor de inferência com autenticação mTLS.

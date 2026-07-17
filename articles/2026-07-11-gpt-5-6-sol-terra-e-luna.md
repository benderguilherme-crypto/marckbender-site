---
title: "GPT-5.6: Sol, Terra e Luna"
date: 2026-07-11
slug: gpt-5-6-sol-terra-e-luna
excerpt: "Um guia direto para escolher entre profundidade, equilíbrio e velocidade sem pagar por inteligência que a tarefa não precisa."
image: "/public/images/guias/gpt-5-6-sol-terra-e-luna-cover.png"
category: "Modelos de IA"
pdf: "/public/guias/gpt-5-6-sol-terra-e-luna.pdf"
---

A diferença entre conhecer os modelos e saber escolhê-los é transformar novidade em método. A família GPT-5.6 não foi organizada como um único modelo que tenta servir para tudo: ela separa três níveis de capacidade — **Sol, Terra e Luna**. Este guia mostra como essa arquitetura muda a decisão de uso.

## Não são três versões do mesmo botão

O número indica a geração. Os nomes indicam quanto poder, velocidade e custo você escolhe para a tarefa.

- **Geração** — o "5.6" identifica a família tecnológica. Quando a geração muda, a base de capacidades também avança.
- **Nível de capacidade** — Sol, Terra e Luna organizam a escolha entre mais profundidade, melhor equilíbrio ou menor custo por execução.
- **Decisão operacional** — a pergunta deixa de ser "qual é o modelo mais inteligente?" e passa a ser "quanta inteligência esta tarefa realmente precisa?".

**Regra Bender IA:** usar sempre o modelo mais poderoso não é estratégia. É apenas pagar o preço máximo antes de entender o problema.

## O que os três modelos compartilham

Antes de comparar diferenças, vale entender que Sol, Terra e Luna partem da mesma geração e de uma base técnica ampla:

- **1.050.000 tokens de contexto** — capacidade de entrada por solicitação na API.
- **128.000 tokens de saída** — limite máximo de resposta em uma única execução.
- **Corte de conhecimento em 16 de fevereiro de 2026** — data de referência informada na documentação.
- **Entrada de texto + imagem** — os três recebem texto e imagens como contexto.

Os três também suportam raciocínio, chamadas de função, saídas estruturadas e ferramentas como busca na web, busca em arquivos, geração de imagens, execução de código e MCP na Responses API. No ChatGPT padrão, Sol aparece conforme o plano; Terra e Luna estão disponíveis no ChatGPT Work, no Codex e na API.

## A diferença aparece em três variáveis

Profundidade, custo e volume. A escolha correta depende da combinação, não de uma classificação absoluta.

- **Sol** — mais capacidade. US$ 5 de entrada e US$ 30 de saída por milhão de tokens. Para decisões complexas, pesquisa profunda, programação avançada e tarefas em que errar custa caro.
- **Terra** — melhor equilíbrio. US$ 2,50 de entrada e US$ 15 de saída. Para trabalho diário, análise, produção de conteúdo, ferramentas internas e operações em volume moderado.
- **Luna** — velocidade e escala. US$ 1 de entrada e US$ 6 de saída. Para tarefas simples, previsíveis, repetitivas e sensíveis a custo ou latência.

**Leitura estratégica:** o custo não é apenas o preço por token. Inclua também o custo de revisar erros, repetir tarefas, esperar pela resposta e corrigir decisões ruins.

## Sol: quando profundidade é proteção

Sol é o modelo para trabalhos em que a qualidade final vale mais do que economizar alguns segundos. Quando uma resposta errada pode custar horas, dinheiro ou decisões importantes, a capacidade extra deixa de ser luxo e passa a ser proteção.

**Use quando:** problemas complexos (pesquisa profunda, estratégia, arquitetura de sistemas), programação avançada (refatorações amplas, depuração difícil, segurança) e entregáveis finais que precisam estar prontos para uso profissional.

**Evite quando:** tarefas mecânicas, grandes volumes em que o custo acumulado importa mais do que a profundidade, e situações de baixo risco em que um erro pequeno é fácil de detectar e corrigir.

*Exemplo de fluxo:* definir uma nova estratégia de produto — reunir contexto, comparar alternativas, identificar riscos, propor cenários e entregar uma recomendação argumentada. O valor está na qualidade da decisão, não na velocidade da resposta.

## Terra: o equilíbrio do trabalho real

Terra é o modelo para a maior parte do trabalho: bom raciocínio, velocidade suficiente e custo controlado. Ele faz sentido quando a tarefa exige confiança, mas não possui complexidade ou risco suficientes para justificar o modelo mais caro.

**Use quando:** trabalho diário (planejamento, conteúdo, análise de documentos), volume moderado (suporte, ferramentas internas, rotinas com dezenas ou centenas de execuções) e como primeira escolha quando você ainda não sabe se a tarefa precisa de Sol.

**Evite quando:** o erro é muito caro, a tarefa é mínima demais (Luna resolve com qualidade suficiente) ou a ambiguidade é extrema.

*Exemplo de fluxo:* transformar uma reunião longa em plano de ação — resumir decisões, separar responsáveis, identificar prazos e criar uma versão executiva.

## Luna: velocidade e escala

Luna foi criado para tarefas em que a repetição, a latência e o custo total importam mais do que raciocínio profundo. O melhor uso de Luna não é pedir menos qualidade: é entregar tarefas com regras claras, escopo pequeno e validação objetiva.

**Use quando:** alta repetição (classificar, extrair, etiquetar, reformatar), baixa latência (respostas rápidas em interfaces e automações) e regras claras (o resultado correto pode ser definido com exemplos ou um esquema estruturado).

**Evite quando:** a estratégia é aberta, o código é crítico ou a entrega vai direto ao usuário final sem revisão.

*Exemplo de fluxo:* organizar centenas de mensagens recebidas — classificar assunto, detectar urgência, extrair contato, gerar resposta inicial curta e enviar casos incertos para revisão.

## Quatro perguntas antes de escolher

O modelo certo aparece quando você mede a tarefa, em vez de escolher pela reputação do modelo.

- **Qual é o custo do erro?** Se errar exige horas de retrabalho ou afeta clientes, suba para Sol.
- **Quanta ambiguidade existe?** Tarefas abertas exigem mais raciocínio. Regras claras favorecem Terra ou Luna.
- **Qual é o volume?** Quanto mais vezes o processo será executado, mais o preço por token e a latência influenciam a escolha.
- **Como o resultado será validado?** Uma boa validação permite usar modelos menores com mais segurança, porque erros são detectados cedo.

**Heurística rápida:** comece com Terra. Desça para Luna quando a tarefa estiver padronizada e validada. Suba para Sol quando a ambiguidade ou o custo do erro aumentarem.

## Qual modelo abrir agora?

- Pesquisa profunda e estratégia → **Sol** — mais capacidade para investigar, comparar e sustentar decisões.
- Programação complexa ou segurança → **Sol** — o custo de um erro justifica raciocínio e persistência maiores.
- Conteúdo, análise e trabalho diário → **Terra** — equilibra qualidade, velocidade e custo para a maioria dos fluxos.
- Suporte e documentos em volume → **Terra** — mantém boa compreensão sem pagar o preço máximo por execução.
- Resumo, extração e classificação → **Luna** — regras simples, grande volume e resposta rápida.
- Automação repetitiva com validação → **Luna** — o custo por execução passa a ser parte central do resultado.

## Conclusão: a ferramenta certa no momento certo

Sol, Terra e Luna não existem para disputar qual é "o melhor". Eles existem para tornar a escolha mais precisa: Sol quando a profundidade protege a qualidade da decisão, Terra quando equilíbrio e consistência movem o trabalho diário, Luna quando velocidade e escala definem a eficiência.

O diferencial não está em ter acesso ao modelo mais caro. Está em decompor o trabalho, definir critérios e usar apenas a capacidade necessária em cada etapa. Menos fascinação pela ferramenta. Mais método para transformar inteligência artificial em resultado.

*Informações verificadas em 15 de julho de 2026 na documentação oficial da OpenAI. Preços, disponibilidade e recursos podem mudar. As recomendações de uso são uma interpretação editorial da Bender IA.*

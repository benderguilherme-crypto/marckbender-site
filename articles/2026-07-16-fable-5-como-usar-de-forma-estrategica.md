---
title: "Fable 5: como usar de forma estratégica"
date: 2026-07-16
slug: fable-5-como-usar-de-forma-estrategica
excerpt: "Um método prático para transformar capacidade em resultado com contexto certo, critérios claros, execução em fases e revisão independente."
image: "/public/images/guias/fable-5-como-usar-de-forma-estrategica-cover.png"
category: "Uso estratégico"
pdf: "/public/guias/fable-5-como-usar-de-forma-estrategica.pdf"
---

A maioria das pessoas trata o Fable 5 como se fosse um prompt mágico: procura a frase secreta que vai destravar um resultado melhor. Este guia parte de outra ideia. O Fable 5 é uma ferramenta de trabalho, não um objeto de fascinação. A qualidade não aparece porque você achou as palavras certas, mas quando o método encontra contexto real, critérios claros e evidência concreta. Abaixo está o passo a passo para fazer a capacidade máxima virar resultado.

## O modelo não é o prompt

Vale separar quatro camadas que costumam ser confundidas. O **modelo** é a capacidade aprendida: treinamento, parâmetros e padrões que determinam o que o sistema consegue fazer. As **instruções** são a camada de direção: regras, papel, tom, prioridades e critérios de uma execução específica. O **contexto** é a memória de trabalho: arquivos, histórico, dados e decisões disponíveis para a tarefa atual. E as **ferramentas** são a capacidade de ação: terminal, web, arquivos e integrações que permitem observar, modificar e verificar o mundo.

A confusão mais comum é achar que copiar as instruções de alguém transfere a capacidade do modelo. Não transfere. Copiar um prompt pode aproximar o comportamento visível, mas o resultado continua limitado pela inteligência, pelo treinamento e pelas ferramentas da IA que recebeu aquele arquivo. Por isso o melhor uso é construir um ambiente onde o modelo consegue investigar, agir e comprovar o que fez.

## Quando Fable 5 realmente vale a pena

Capacidade máxima tem custo, e ela se justifica quando a complexidade e o custo do erro são altos. **Use o Fable 5 quando** o projeto é maior que uma única sessão, com etapas e decisões que precisam permanecer coerentes; quando a ambiguidade é alta e é preciso descobrir a pergunta certa antes de executar; quando o erro custa caro, gerando retrabalho ou afetando clientes, código e reputação; quando há muitas fontes para cruzar; e quando a entrega precisa ser auditável.

**Evite quando** a tarefa é mecânica, como reformatar ou classificar com regras objetivas; quando a resposta é pequena e de baixo risco; quando o volume domina o custo e milhares de execuções simples favorecem modelos mais econômicos; quando não existe critério de validação, porque capacidade extra não conserta uma definição vaga de sucesso; e quando você só quer parecer sofisticado. A regra de decisão é simples: use o modelo mais capaz quando o custo provável do erro for maior que o custo de usar mais inteligência. Nos outros casos, eficiência também é qualidade.

## Seis blocos que eliminam ambiguidade

Uma boa instrução não tenta impressionar o modelo. Ela define o trabalho. Seis blocos dão conta disso:

- **Objetivo:** qual resultado precisa existir no final?
- **Contexto:** por que isso importa e qual é o estado atual?
- **Fontes de verdade:** quais arquivos e dados são a referência oficial?
- **Limites:** o que não pode ser alterado, acessado ou assumido?
- **Entrega:** qual formato, profundidade e escopo são esperados?
- **Validação:** que evidência prova que o trabalho terminou?

Preencher esses seis campos, mesmo em uma linha cada, já elimina a maior parte das interpretações erradas.

## Um prompt forte fecha decisões

O objetivo de um bom pedido não é escrever mais. É deixar menos espaço para interpretação. Compare um pedido vago como "analise meu projeto e melhore o que precisar" com um pedido executável: "Antes de editar, leia o README, a arquitetura e o diff atual. Produza um plano com dependências, riscos e arquivos afetados; não implemente ainda. Após aprovação, execute uma fase por vez, sem tocar em produção, segredos ou arquivos fora do escopo. Ao final de cada fase, rode os testes, apresente a evidência e liste os riscos. Pare diante de conflito entre fontes, falta de permissão ou decisão que altere o escopo."

O segundo funciona por quatro razões: tem **ordem** (primeiro entender, depois planejar, só então executar), tem **permissões** claras (o modelo sabe o que pode e o que não pode tocar), exige **evidência** (a conclusão depende de testes, não de confiança verbal) e define **parada** (conflitos e riscos interrompem a execução antes do dano).

## Trabalhe em fases, não em um salto

Projetos confiáveis deixam rastros claros entre intenção, ação e evidência. Em vez de pedir tudo de uma vez, conduza o trabalho por fases: **diagnosticar** (ler as fontes, mapear o estado atual e separar fatos de hipóteses); **planejar** (definir etapas, dependências, riscos e critérios de cada fase); **executar** (concluir uma unidade de trabalho sem misturar mudanças independentes); **verificar** (rodar testes, comparar requisitos e registrar evidências); **corrigir** (tratar falhas confirmadas e repetir a verificação); e **registrar** (explicar o que mudou, o que ficou pendente e por que o processo parou). A regra central: execute uma fase por vez, mostre a evidência ao final de cada uma e aguarde autorização para continuar.

## Mais informação não significa melhor resposta

O contexto deve eliminar ambiguidades, não ocupar espaço por precaução. **Contexto útil** é o objetivo e o critério de conclusão, os arquivos que são fonte de verdade, as decisões já aprovadas, exemplos do resultado esperado e apenas o histórico que muda a decisão. **Contexto que atrapalha** são transcrições repetidas, documentos antigos sem indicação de validade, o repositório inteiro quando bastam três arquivos e instruções conflitantes de vários lugares.

A regra: dê o mínimo de contexto que elimina ambiguidades, não o máximo que cabe. A própria documentação da Anthropic alerta que contextos maiores podem sofrer perda de precisão. Ao priorizar, use a hierarquia: primeiro a **fonte de verdade**, depois a **decisão atual**, por último o **histórico relevante**.

## Revisão independente reduz pontos cegos

A mesma conversa tende a preservar as mesmas premissas que produziram o trabalho. Por isso, separe papéis: o **implementador** constrói a solução e apresenta evidências; o **revisor** procura falhas sem tentar defender a solução; o **validador** confirma os critérios com testes ou dados externos. Em ambientes com subagentes, como o Claude Code, entregue a revisão a um agente separado. Em interfaces sem esse recurso, abra uma nova conversa e forneça apenas o objetivo, o resultado e os critérios. O prompt de revisão é direto: "Revise este trabalho como um auditor independente. Não corrija ainda. Procure violações de requisitos, premissas não comprovadas, riscos de segurança, testes ausentes e afirmações sem evidência. Classifique cada achado por severidade e mostre a evidência, o impacto e como verificar se o problema é real."

## Três prompts para usar hoje

Adapte os campos entre colchetes ao seu projeto e não cole nada sem contexto.

**1. Plano em leitura somente.** "Analise [projeto ou problema] sem modificar nada. Leia [fontes]. Identifique o estado atual, dependências, riscos, decisões pendentes e critérios de conclusão. Entregue um plano em fases, com arquivos ou áreas afetadas e evidências necessárias. Pare após o plano e aguarde aprovação."

**2. Execução de uma fase.** "Implemente apenas a fase [número/nome] do plano aprovado. Preserve [restrições]. Não toque em [áreas proibidas]. Ao terminar, execute [testes ou verificações], apresente os resultados, liste arquivos alterados e riscos restantes. Não avance para a próxima fase."

**3. Auditoria final.** "Compare o resultado com [requisitos e critérios]. Verifique o diff, testes, segurança, regressões e documentação. Não aprove por impressão. Para cada critério, mostre a evidência. Separe bloqueadores, melhorias recomendadas e itens confirmados como corretos."

No fim, a lógica é sempre a mesma: contexto certo, critérios claros, execução em fases e revisão independente. É isso que transforma capacidade em resultado, não a busca por um prompt secreto.

---
title: "Loop Engineering"
date: 2026-07-08
slug: loop-engineering
excerpt: "Como construir agentes de IA que executam, verificam, corrigem e continuam trabalhando até atingir um resultado definido."
image: "/public/images/guias/loop-engineering-cover.png"
category: "Agentes de IA"
pdf: "/public/guias/loop-engineering.pdf"
---

Nos últimos anos, uma das habilidades mais valorizadas em inteligência artificial foi escrever bons prompts: dar contexto, explicar a tarefa, definir o formato e corrigir a resposta até chegar ao resultado desejado. Essa habilidade continua importante, mas uma mudança mais profunda já começou. O prompt não está desaparecendo — ele está deixando de ser uma instrução isolada e passando a fazer parte de um sistema maior.

Em vez de conversar com a IA a cada nova etapa, você pode construir um processo no qual o agente encontra o trabalho, executa, verifica o resultado, corrige os erros, registra o progresso e continua até atingir uma condição previamente definida. É isso que vem sendo chamado de **loop engineering**: projetar processos em que a IA executa, verifica e continua até alcançar um resultado definido.

## O prompt mudou de função

No uso tradicional, você entrega uma instrução e espera uma resposta. Depois analisa, identifica um problema, envia uma correção e aguarda de novo. Imagine revisar vinte páginas de um site: você pede a revisão da primeira, confere, aprova e passa para a próxima. A IA executa uma parte do trabalho, mas você continua no centro da operação, decidindo cada passo — o que falta, qual a próxima tarefa, quando o projeto terminou.

O loop altera essa dinâmica. Em vez de dizer o que o agente deve fazer a cada momento, você define antecipadamente como o processo inteiro deve funcionar.

A diferença central é simples: **no prompt tradicional, você controla cada tarefa. No loop, você constrói o sistema que controla as tarefas.**

## Como funciona um loop de IA

Um loop é um ciclo de execução que se repete até uma condição ser atendida. Em vez de receber uma tarefa única e parar, o agente recebe um objetivo, regras de funcionamento e critérios de conclusão. Um loop confiável costuma seguir cinco movimentos:

- **Encontrar o próximo trabalho.** O agente precisa saber onde procurar o que falta: uma pasta, uma lista de tarefas, um arquivo `TODO.md`, um quadro de projetos ou um sistema conectado.
- **Executar uma tarefa.** Ele escolhe um item e o executa. É preferível concluir um item por vez em vez de mexer em tudo ao mesmo tempo — isso facilita a verificação e reduz conflitos.
- **Verificar o resultado.** O trabalho não está pronto só porque o agente produziu algo. É preciso evidência de que o resultado atende aos critérios: os testes passaram, o link abriu, o texto respeitou o limite, a compilação terminou sem erros.
- **Corrigir o que falhou.** Quando a verificação indica que ainda está errado, o agente identifica o problema e tenta de novo. A própria falha na validação inicia o próximo ciclo, sem você precisar escrever "tente novamente".
- **Registrar e continuar.** O agente anota o que concluiu, o que ficou bloqueado e o que vem depois. Se ainda há trabalho, o ciclo recomeça. Se todos os critérios foram atendidos, o processo para e apresenta um relatório.

O ciclo completo é: **encontrar → executar → verificar → corrigir → registrar → continuar ou parar.**

## Onde usar cada comando

Este guia usa o Claude Code no Terminal. É importante separar dois ambientes: o Terminal normal do seu computador (onde você digita `cd /caminho/do/projeto` e depois `claude` para abrir a sessão) e a interface do Claude Code aberta dentro dele. Comandos como `/goal` e `/loop` só funcionam **dentro** de uma sessão ativa do Claude Code.

- **`/goal` — trabalhar até alcançar uma condição.** Use quando existe uma linha de chegada verificável. Você informa a condição final e o Claude continua ao longo de vários turnos sem você escrever "continue". Ao fim de cada turno, um modelo avaliador separado checa se a condição foi atendida; caso contrário, começa outro turno. A condição precisa ser demonstrável: "deixe o projeto perfeito" é ruim; "todos os testes passam e `git status` está limpo" é verificável.
- **`/loop` — repetir uma tarefa em intervalos.** Use quando o processo não avança até uma conclusão, mas deve se repetir de tempos em tempos: acompanhar uma implantação, verificar se um site voltou ao ar, consultar uma fila. As tarefas de `/loop` pertencem à sessão atual e exigem que a máquina esteja disponível.
- **Rotinas — quando o processo precisa rodar com o computador desligado.** Uma rotina combina uma instrução, um ou mais repositórios e os conectores necessários. Pode ser acionada por horário, chamada de API ou evento do GitHub e roda em infraestrutura gerenciada, independente do seu computador.

## Os cinco componentes que fortalecem um loop

Os comandos são só o mecanismo que mantém a execução acontecendo. Para criar um sistema realmente útil, o agente também precisa de:

- **Automação.** Define quando o processo começa ou recomeça. Reduz o esforço de iniciar cada execução, mas não melhora a qualidade sozinha — um processo ruim automatizado continua ruim, só mais rápido.
- **Worktrees.** Git worktrees permitem que cada sessão trabalhe em uma cópia isolada do projeto, em uma branch separada. Assim, um agente desenvolve uma funcionalidade enquanto outro corrige um problema, sem misturar as alterações.
- **Skills.** Uma skill é um arquivo com um procedimento reutilizável. Em vez de colar o mesmo checklist em toda conversa, você salva o procedimento uma vez e chama a skill quando precisa.
- **Conectores (MCP).** Permitem que o agente consulte serviços externos, bancos de dados e gestores de tarefas reais, não apenas arquivos locais. Configure com cuidado: dê só as permissões necessárias, principalmente quando há risco de enviar mensagens ou executar ações irreversíveis.
- **Subagentes.** O agente que executou uma tarefa nem sempre é o melhor para avaliar o próprio trabalho. Um subagente revisor, em modo somente leitura, analisa as alterações e verifica qualidade, segurança e testes de forma independente.

## O elemento que conecta tudo: um objetivo verificável

Nenhum desses recursos resolve o problema central de um loop mal construído: a ausência de uma definição clara de qualidade. Um agente só continua trabalhando com segurança quando existe uma forma objetiva de verificar o resultado.

Compare "melhore todos os artigos" com "revise todos os artigos da pasta `/blog`: cada título com no máximo 60 caracteres, cada descrição com no máximo 160, nenhum link com erro e o corpo do texto sem alterações; registre as contagens e o resultado de cada arquivo". A primeira depende de opinião subjetiva; a segunda define critérios que podem ser medidos.

Antes de construir qualquer loop, faça a pergunta que define o processo: **qual evidência demonstra que este trabalho foi concluído corretamente?** Se não houver resposta clara, a tarefa ainda não está pronta para rodar de forma autônoma.

## O Loop Charter na prática

O *Loop Charter* não é um comando oficial — é o nome dado, neste guia, a um documento que descreve como o agente deve conduzir um processo: qual é o objetivo, onde encontrar o trabalho, como executar, como verificar, o que registrar, quais ações são proibidas e quando parar.

Ele pode ser usado de três formas: colado direto no Claude Code (bom para testar), salvo como arquivo do projeto ou transformado em skill. Uma estrutura eficiente separa três arquivos: `CLAUDE.md` com as regras permanentes do projeto, `LOOP-CHARTER.md` com o processo específico e `LOOP-STATE.md` com o progresso, os resultados e os bloqueios. O charter contém o método; o arquivo de estado contém o progresso; o `/goal` mantém a execução ativa até a linha de chegada.

O arquivo de estado cria continuidade. Sem ele, cada execução corre o risco de começar do zero, revisar itens já concluídos ou repetir uma tentativa que já falhou. Lido no início de cada execução, ele evita retrabalho — não precisa ser sofisticado, só claro e atualizado.

## Quando não usar loops, e como começar

Nem toda tarefa precisa de um sistema autônomo. Escrever um e-mail ou resumir um documento curto é mais rápido com um prompt simples. Loops fazem sentido quando o trabalho é repetitivo, tem vários itens, segue regras estáveis e possui critérios verificáveis. Há também um custo: um loop que executa, verifica e corrige consome mais turnos e tokens que uma resposta única. Comece com poucos itens, acompanhe a primeira execução e defina limites.

A segurança é outra limitação. Um loop com permissão para excluir arquivos, publicar conteúdo ou modificar produção pode ampliar um erro rapidamente. As primeiras versões devem rodar com o menor conjunto possível de permissões. A regra central: **um loop sem verificação não automatiza qualidade — apenas automatiza erros.**

## Conclusão prática

Escolha um processo pequeno e incômodo que você já faz manualmente. Defina o resultado final, estabeleça três ou quatro critérios objetivos, limite a execução e acompanhe o primeiro teste. Só depois que o comportamento estiver previsível, transforme o charter em skill, adicione um subagente revisor, conecte ferramentas ou coloque o processo em uma rotina.

A sequência mais segura é: **observar manualmente → testar com poucos itens → verificar → corrigir o processo → ampliar a autonomia.**

O avanço mais importante no uso de agentes de IA não está em abandonar os prompts, mas em parar de depender de um novo prompt a cada etapa. *Prompt engineering* ensina a dar boas instruções. *Loop engineering* ensina a construir um sistema que sabe quando executar, como verificar, quando corrigir e em qual momento parar.

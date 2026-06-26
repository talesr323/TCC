import prisma from '../../prisma/client.js';

export async function processarGamificacaoTreino(alunoId) {
  const novasConquistas = [];

  // 1. Contar o total de treinos finalizados do aluno
  const totalTreinos = await prisma.execucaoFicha.count({
    where: {
      aluno_id: BigInt(alunoId),
      status: 'FINALIZADA',
    },
  });

  // 2. BUSCA AS REGRAS DINAMICAMENTE DO BANCO DE DADOS
  const conquistasRegras = await prisma.conquista.findMany({
    where: {
      condicao_treinos: {
        not: null, // Garante que pegamos apenas conquistas que possuem essa regra por treinos
      },
    },
  });

  // 2. Verificar e entregar as conquistas merecidas
  for (const item of conquistasRegras) {
    if (totalTreinos >= item.treinos) {
      const conquista = await prisma.conquista.findFirst({
        where: { nome: item.nome },
      });

      if (!conquista) continue;

      // Verifica se o aluno já possui essa conquista
      const jaPossui = await prisma.alunoConquista.findUnique({
        where: {
          aluno_id_conquista_id: {
            aluno_id: BigInt(alunoId),
            conquista_id: conquista.id,
          },
        },
      });

      // Se ainda não possui, entrega a conquista e o XP bônus
      if (!jaPossui) {
        await prisma.alunoConquista.create({
          data: {
            aluno_id: BigInt(alunoId),
            conquista_id: conquista.id,
          },
        });

        // Alimenta a lista para retornar ao usuário final
        novasConquistas.push({
          id: conquista.id.toString(),
          nome: conquista.nome,
          descricao: conquista.descricao,
        });
      }
    }
  }

  // Retorna a lista de novas conquistas desbloqueadas nesta execução
  return novasConquistas;
}

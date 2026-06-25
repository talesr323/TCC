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

  // Regras das conquistas por quantidade de treinos
  const conquistasRegras = [
    { treinos: 5, nome: 'Primeiro Passo' },
    { treinos: 25, nome: 'Rítmo Encontrado' },
    { treinos: 50, nome: 'Hábito Formado' },
    { treinos: 75, nome: 'Evolução Constante' },
    { treinos: 100, nome: 'Motivado' },
  ];

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

        // Incrementa o XP bônus da conquista no perfil do Aluno (se o campo existir no banco)
        if (conquista.xp_bonus && conquista.xp_bonus > 0) {
          await prisma.aluno.update({
            where: { id: BigInt(alunoId) },
            data: { experiencia: { increment: conquista.xp_bonus } },
          });
        }

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

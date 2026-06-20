import prisma from '../../prisma/client.js';

export async function verificarConquistas(alunoId) {
  const totalTreinos = await prisma.execucaoFicha.count({
    where: {
      aluno_id: alunoId,
      status: 'FINALIZADA',
    },
  });

  const conquistas = [
    {
      treinos: 1,
      nome: 'Primeiro Treino',
    },
    {
      treinos: 10,
      nome: 'Persistente',
    },
    {
      treinos: 50,
      nome: 'Guerreiro',
    },
    {
      treinos: 100,
      nome: 'Lenda da Academia',
    },
  ];

  for (const item of conquistas) {
    if (totalTreinos >= item.treinos) {
      const conquista = await prisma.conquista.findFirst({
        where: {
          nome: item.nome,
        },
      });

      if (!conquista) continue;

      const jaPossui = await prisma.alunoConquista.findUnique({
        where: {
          aluno_id_conquista_id: {
            aluno_id: alunoId,
            conquista_id: conquista.id,
          },
        },
      });

      if (!jaPossui) {
        await prisma.alunoConquista.create({
          data: {
            aluno_id: alunoId,
            conquista_id: conquista.id,
          },
        });
      }
    }
  }
}

import prisma from "../../prisma/client.js";

export async function processarGamificacaoTreino(alunoId) {
  const novasConquistas = [];

  const totalFichasFinalizadas = await prisma.execucaoFicha.count({
    where: {
      aluno_id: BigInt(alunoId),
      status: "FINALIZADA",
    },
  });

  const conquistasRegras = await prisma.conquista.findMany({
    where: {
      condicao_treinos: {
        lte: totalFichasFinalizadas,
      },
    },
  });

  for (const conquista of conquistasRegras) {
    const jaPossui = await prisma.alunoConquista.findUnique({
      where: {
        aluno_id_conquista_id: {
          aluno_id: BigInt(alunoId),
          conquista_id: conquista.id,
        },
      },
    });

    if (!jaPossui) {
      await prisma.alunoConquista.create({
        data: {
          aluno_id: BigInt(alunoId),
          conquista_id: conquista.id,
        },
      });

      novasConquistas.push({
        id: conquista.id.toString(),
        nome: conquista.nome,
        descricao: conquista.descricao,
      });
    }
  }

  return novasConquistas;
}
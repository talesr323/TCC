import express from "express";
import prisma from "../../prisma/client.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

/*
===========================
INICIAR TREINO
===========================
*/
router.post("/iniciar/:treino_id", auth, async (req, res) => {
  try {
    const aluno_id = req.usuario.aluno_id;
    const { treino_id } = req.params;

    if (!aluno_id) {
      return res.status(403).json({
        error: "Apenas alunos podem iniciar treinos.",
      });
    }

    if (isNaN(Number(treino_id))) {
      return res.status(400).json({
        error: "O ID do treino é inválido.",
      });
    }

    const treino = await prisma.treino.findFirst({
      where: {
        id: BigInt(treino_id),
        aluno_id: BigInt(aluno_id),
      },
      include: {
        fichas: true,
      },
    });

    if (!treino) {
      return res.status(404).json({
        error: "Treino não encontrado para este aluno.",
      });
    }

    if (!treino.fichas || treino.fichas.length === 0) {
      return res.status(400).json({
        error: "Este treino ainda não possui fichas cadastradas.",
      });
    }

    const treinoAndamento = await prisma.execucaoTreino.findFirst({
      where: {
        treino_id: BigInt(treino_id),
        aluno_id: BigInt(aluno_id),
        status: "EM_ANDAMENTO",
      },
      orderBy: {
        iniciado_em: "desc",
      },
    });

    if (treinoAndamento) {
  return res.status(200).json(formatBigInt(treinoAndamento));
}

    const execucao = await prisma.execucaoTreino.create({
      data: {
        treino_id: BigInt(treino_id),
        aluno_id: BigInt(aluno_id),
        status: "EM_ANDAMENTO",
      },
    });

    return res.status(201).json(formatBigInt(execucao));
  } catch (error) {
    console.error("Erro ao iniciar treino:", error);

    return res.status(500).json({
      error: "Erro ao iniciar treino.",
      message: error.message,
    });
  }
});

/*
===========================
FINALIZAR TREINO
===========================
*/
router.post("/finalizar/:treino_id", auth, async (req, res) => {
  try {
    const aluno_id = req.usuario.aluno_id;
    const { treino_id } = req.params;

    if (!aluno_id) {
      return res.status(403).json({
        error: "Apenas alunos podem finalizar treinos.",
      });
    }

    if (isNaN(Number(treino_id))) {
      return res.status(400).json({
        error: "O ID do treino é inválido.",
      });
    }

    const execucaoTreino = await prisma.execucaoTreino.findFirst({
      where: {
        treino_id: BigInt(treino_id),
        aluno_id: BigInt(aluno_id),
        status: "EM_ANDAMENTO",
      },
      orderBy: {
        iniciado_em: "desc",
      },
    });

    if (!execucaoTreino) {
      return res.status(400).json({
        error: "Nenhum treino em andamento encontrado.",
      });
    }

    const fichas = await prisma.fichaTreino.findMany({
      where: {
        treino_id: BigInt(treino_id),
      },
      select: {
        id: true,
      },
    });

    const totalFichas = fichas.length;

    if (totalFichas === 0) {
      return res.status(400).json({
        error: "Este treino não possui fichas para finalizar.",
      });
    }

    const fichasFinalizadas = await prisma.execucaoFicha.count({
      where: {
        aluno_id: BigInt(aluno_id),
        execucao_treino_id: execucaoTreino.id,
        status: "FINALIZADA",
        ficha_id: {
          in: fichas.map((f) => f.id),
        },
      },
    });

    if (fichasFinalizadas < totalFichas) {
      return res.status(400).json({
        error: `Finalize todas as fichas antes de concluir o treino. (${fichasFinalizadas}/${totalFichas})`,
      });
    }

    const sessentaSegundosAtras = new Date(Date.now() - 60 * 1000);

    const finalizouTreinoRecentemente = await prisma.execucaoTreino.findFirst({
    where: {
        aluno_id: BigInt(aluno_id),
        status: "FINALIZADA",
        finalizado_em: {
        gte: sessentaSegundosAtras,
        },
    },
    });

    if (finalizouTreinoRecentemente) {
    return res.status(400).json({
        error: "Você deve aguardar 60 segundos para finalizar outro treino.",
    });
    }

    const treinoFinalizado = await prisma.execucaoTreino.update({
      where: {
        id: execucaoTreino.id,
      },
      data: {
        status: "FINALIZADA",
        finalizado_em: new Date(),
      },
    });

    return res.status(200).json({
      mensagem: "Treino finalizado com sucesso!",
      execucao: formatBigInt(treinoFinalizado),
    });
  } catch (error) {
    console.error("Erro ao finalizar treino:", error);

    return res.status(500).json({
      error: "Erro ao finalizar treino.",
      message: error.message,
    });
  }
});

export default router;
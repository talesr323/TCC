import auth from "../middlewares/auth.js";
import express from "express";
import prisma from "../../prisma/client.js";

const router = express.Router();

const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

// Criar treino
router.post("/", async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nome, descricao, aluno_id } = req.body;

    if (!professor_id) {
      return res.status(403).json({
        error: "Apenas professores podem criar treinos.",
      });
    }

    if (!nome?.trim()) {
      return res.status(400).json({
        error: "O nome do treino é obrigatório.",
      });
    }

    if (!aluno_id || isNaN(Number(aluno_id))) {
      return res.status(400).json({
        error: "O aluno informado é inválido.",
      });
    }

    const aluno = await prisma.aluno.findUnique({
      where: {
        id: BigInt(aluno_id),
      },
    });

    if (!aluno) {
      return res.status(404).json({
        error: "Aluno não encontrado.",
      });
    }

    const treino = await prisma.treino.create({
      data: {
        nome: nome.trim(),
        descricao: descricao?.trim() || null,
        aluno_id: BigInt(aluno_id),
        professor_id: BigInt(professor_id),
      },
    });

    return res.status(201).json(formatBigInt(treino));
  } catch (error) {
    console.error("Erro ao criar treino:", error);

    return res.status(500).json({
      error: "Erro ao criar treino.",
      message: error.message,
    });
  }
});

// Vincular ficha ao treino
router.put("/:treino_id/fichas/:ficha_id", async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { treino_id, ficha_id } = req.params;

    if (!professor_id) {
      return res.status(403).json({
        error: "Apenas professores podem vincular fichas ao treino.",
      });
    }

    if (isNaN(Number(treino_id)) || isNaN(Number(ficha_id))) {
      return res.status(400).json({
        error: "Identificadores inválidos.",
      });
    }

    const treino = await prisma.treino.findFirst({
      where: {
        id: BigInt(treino_id),
        professor_id: BigInt(professor_id),
      },
    });

    if (!treino) {
      return res.status(404).json({
        error: "Treino não encontrado.",
      });
    }

    const ficha = await prisma.fichaTreino.findFirst({
      where: {
        id: BigInt(ficha_id),
        professor_id: BigInt(professor_id),
      },
    });

    if (!ficha) {
      return res.status(404).json({
        error: "Ficha não encontrada.",
      });
    }

    const fichaAtualizada = await prisma.fichaTreino.update({
      where: {
        id: BigInt(ficha_id),
      },
      data: {
        treino_id: BigInt(treino_id),
        aluno_id: null,
      },
    });

    return res.json(formatBigInt(fichaAtualizada));
  } catch (error) {
    console.error("Erro ao vincular ficha ao treino:", error);

    return res.status(500).json({
      error: "Erro ao vincular ficha ao treino.",
      message: error.message,
    });
  }
});

// Listar treinos do professor
router.get("/", async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;

    if (!professor_id) {
      return res.status(403).json({
        error: "Apenas professores podem listar treinos.",
      });
    }

    const treinos = await prisma.treino.findMany({
      where: {
        professor_id: BigInt(professor_id),
      },
      include: {
        aluno: {
          include: {
            usuario: {
              select: {
                nome: true,
                email: true,
              },
            },
          },
        },
        fichas: {
          include: {
            grupo: true,
            exercicios: {
              include: {
                exercicio: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return res.json(formatBigInt(treinos));
  } catch (error) {
    console.error("Erro ao listar treinos:", error);

    return res.status(500).json({
      error: "Erro ao listar treinos.",
      message: error.message,
    });
  }
});

// Listar treinos do aluno
router.get("/meus-treinos", async (req, res) => {
  try {
    const aluno_id = req.usuario.aluno_id;

    if (!aluno_id) {
      return res.status(403).json({
        error: "Apenas alunos podem visualizar seus treinos.",
      });
    }

    const treinos = await prisma.treino.findMany({
      where: {
        aluno_id: BigInt(aluno_id),
      },
      include: {
        professor: {
          include: {
            usuario: {
              select: {
                nome: true,
                email: true,
              },
            },
          },
        },
        execucoes: {
          where: {
            aluno_id: BigInt(aluno_id),
          },
          orderBy: {
            iniciado_em: "desc",
          },
        },
        fichas: {
          include: {
            grupo: true,
            exercicios: {
              include: {
                exercicio: true,
              },
            },
            execucoes: {
              where: {
                aluno_id: BigInt(aluno_id),
              },
              orderBy: {
                iniciado_em: "desc",
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const treinosFormatados = treinos.map((treino) => {
      const execucaoTreinoAtual = treino.execucoes.find(
        (execucao) => execucao.status === "EM_ANDAMENTO"
      );

      const fichas = treino.fichas.map((ficha) => {
        const finalizadaNaExecucaoAtual = ficha.execucoes.some(
        (execucaoFicha) =>
            execucaoFicha.status === "FINALIZADA" &&
            execucaoFicha.execucao_treino_id === execucaoTreinoAtual?.id
        );

        return {
          ...ficha,
          finalizadaNaExecucaoAtual,
        };
      });

      const totalFichas = fichas.length;

      const fichasFinalizadas = treino.fichas.reduce((total, ficha) => {
        return (
          total +
          ficha.execucoes.filter(
            (execucaoFicha) => execucaoFicha.status === "FINALIZADA"
          ).length
        );
      }, 0);

      const treinosFinalizados = treino.execucoes.filter(
        (execucao) => execucao.status === "FINALIZADA"
      ).length;

      return {
        ...treino,
        fichas,
        totalFichas,
        fichasFinalizadas,
        treinosFinalizados,
        treinoFinalizado: treinosFinalizados > 0,
      };
    });

    return res.json(formatBigInt(treinosFormatados));
  } catch (error) {
    console.error("Erro ao buscar treinos:", error);

    return res.status(500).json({
      error: "Erro ao buscar treinos.",
      message: error.message,
    });
  }
});

export default router;
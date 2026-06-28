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

    router.post("/", async (req, res) => {
    try {
        const professor_id = req.usuario.professor_id;
        const { nome, descricao, aluno_id } = req.body;

        if (!professor_id) {
        return res.status(403).json({ error: "Apenas professores podem criar treinos." });
        }

        const treino = await prisma.treino.create({
        data: {
            nome,
            descricao,
            aluno_id: BigInt(aluno_id),
            professor_id: BigInt(professor_id),
        },
        });

        return res.status(201).json(formatBigInt(treino));
    } catch (error) {
        return res.status(500).json({
        error: "Erro ao criar treino.",
        message: error.message,
        });
    }
    });

    router.put("/:treino_id/fichas/:ficha_id", async (req, res) => {
    try {
        const professor_id = req.usuario.professor_id;
        const { treino_id, ficha_id } = req.params;

        const treino = await prisma.treino.findFirst({
        where: {
            id: BigInt(treino_id),
            professor_id: BigInt(professor_id),
        },
        });

        if (!treino) {
        return res.status(404).json({ error: "Treino não encontrado." });
        }

        const ficha = await prisma.fichaTreino.update({
        where: { id: BigInt(ficha_id) },
        data: {
            treino_id: BigInt(treino_id),
            aluno_id: null,
        },
        });

        return res.json(formatBigInt(ficha));
    } catch (error) {
        return res.status(500).json({
        error: "Erro ao vincular ficha ao treino.",
        message: error.message,
        });
    }
    });

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
        return res.status(500).json({
        error: "Erro ao listar treinos.",
        message: error.message,
        });
    }
    });

    

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
              take: 1,
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const treinosFormatados = treinos.map((treino) => {
      const totalFichas = treino.fichas.length;

      const fichasFinalizadas = treino.fichas.filter((ficha) =>
        ficha.execucoes?.some((execucao) => execucao.status === "FINALIZADA")
      ).length;

      return {
        ...treino,
        totalFichas,
        fichasFinalizadas,
        treinoFinalizado: totalFichas > 0 && fichasFinalizadas === totalFichas,
      };
    });

    return res.json(formatBigInt(treinosFormatados));
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao buscar treinos.",
      message: error.message,
    });
  }
});

    export default router;
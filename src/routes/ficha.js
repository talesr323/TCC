const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

  router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const ficha = await prisma.fichaTreino.findUnique({
      where: { id: BigInt(id) },
      include: {
        exercicios: {
          include: {
            exercicio: true // 🔥 traz nome do exercício
          }
        }
      }
    });

    if (!ficha) {
      return res.status(404).json({
        error: "Ficha não encontrada"
      });
    }

    res.json(formatBigInt(ficha));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nome, aluno_id } = req.body;
    const professorId = req.headers["x-professor-id"];

    if (!nome || !aluno_id) {
      return res.status(400).json({
        error: "Nome e aluno_id são obrigatórios"
      });
    }

    // ✅ valida aluno
    const aluno = await prisma.aluno.findUnique({
      where: { id: BigInt(aluno_id) }
    });

    if (!aluno) {
      return res.status(404).json({
        error: "Aluno não encontrado"
      });
    }

    // ✅ valida professor
    const professor = await prisma.professor.findUnique({
      where: { id: BigInt(professorId) }
    });

    if (!professor) {
      return res.status(404).json({
        error: "Professor não encontrado"
      });
    }

    const ficha = await prisma.fichaTreino.create({
      data: {
        nome,
        aluno_id: BigInt(aluno_id),
        professor_id: BigInt(professorId)
      }
    });

    res.status(201).json({
      message: "Ficha criada",
      ficha: formatBigInt(ficha)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/exercicios", async (req, res) => {
  try {
    const { id } = req.params;
    const { exercicio_id, series, repeticoes, descanso_segundos, carga_sugerida } = req.body;

    // ✅ validar ficha
    const ficha = await prisma.fichaTreino.findUnique({
      where: { id: BigInt(id) }
    });

    if (!ficha) {
      return res.status(404).json({
        error: "Ficha não encontrada"
      });
    }

    // ✅ validar exercício
    const exercicio = await prisma.exercicio.findUnique({
      where: { id: BigInt(exercicio_id) }
    });

    if (!exercicio) {
      return res.status(404).json({
        error: "Exercício não encontrado"
      });
    }

    // ✅ criar vínculo
    const item = await prisma.fichaExercicio.create({
      data: {
        ficha_id: BigInt(id),
        exercicio_id: BigInt(exercicio_id),
        series,
        repeticoes,
        descanso_segundos,
        carga_sugerida
      }
    });

    res.status(201).json({
      message: "Exercício adicionado na ficha",
      item: formatBigInt(item)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, aluno_id } = req.body;

    const ficha = await prisma.fichaTreino.findUnique({
      where: { id: BigIrouter.putnt(id) }
    });

    if (!ficha) {
      return res.status(404).json({
        error: "Ficha não encontrada"
      });
    }

    // 🔥 valida aluno (se for alterar)
    if (aluno_id) {
      const aluno = await prisma.aluno.findUnique({
        where: { id: BigInt(aluno_id) }
      });

      if (!aluno) {
        return res.status(404).json({
          error: "Aluno não encontrado"
        });
      }
    }

    const fichaAtualizada = await prisma.fichaTreino.update({
      where: { id: BigInt(id) },
      data: {
        nome,
        ...(aluno_id && { aluno_id: BigInt(aluno_id) })
      }
    });

    res.json({
      message: "Ficha atualizada com sucesso",
      ficha: formatBigInt(fichaAtualizada)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const ficha = await prisma.fichaTreino.findUnique({
      where: { id: BigInt(id) }
    });

    if (!ficha) {
      return res.status(404).json({
        error: "Ficha não encontrada"
      });
    }

    await prisma.fichaTreino.delete({
      where: { id: BigInt(id) }
    });

    res.json({
      message: "Ficha excluída com sucesso"
    });

  } catch (error) {
    console.error(error);

    // 🔥 se tiver vínculo (mas no seu caso deve deletar automático)
    if (error.code === "P2003") {
      return res.status(400).json({
        error: "Não é possível deletar: ficha possui exercícios vinculados."
      });
    }

    res.status(500).json({ error: error.message });
  }
});

router.put("/:fichaId/exercicios/:exercicioId", async (req, res) => {
  try {
    const { fichaId, exercicioId } = req.params;
    const { series, repeticoes } = req.body;

    const atualizado = await prisma.fichaExercicio.update({
      where: {
        ficha_id_exercicio_id: {
          ficha_id: BigInt(fichaId),
          exercicio_id: BigInt(exercicioId)
        }
      },
      data: {
        series: Number(series),
        repeticoes: Number(repeticoes)
      }
    });

    res.json({
      message: "Exercício atualizado na ficha",
      exercicio: formatBigInt(atualizado)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:fichaId/exercicios/:exercicioId", async (req, res) => {
  try {
    const { fichaId, exercicioId } = req.params;

    await prisma.fichaExercicio.delete({
      where: {
        ficha_id_exercicio_id: {
          ficha_id: BigInt(fichaId),
          exercicio_id: BigInt(exercicioId)
        }
      }
    });

    res.json({
      message: "Exercício removido da ficha com sucesso"
    });

  } catch (error) {
    console.error(error);

    if (error.code === "P2025") {
      return res.status(404).json({
        error: "Esse exercício não está vinculado a essa ficha"
      });
    }

    res.status(500).json({ error: error.message });
  }
});
module.exports = router;
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

// Criar exercício
router.post("/", async (req, res) => {
  try {
    const { nome, descricao, grupo_id } = req.body;

    // 🔐 pegar professor logado (ideal via middleware depois)
    const professorId = req.headers["x-professor-id"];

    if (!professorId) {
      return res.status(403).json({
        error: "Professor não autenticado."
      });
    }

    if (!nome) {
      return res.status(400).json({
        error: "Nome do exercício é obrigatório."
      });
    }

    const exercicio = await prisma.exercicio.create({
    data: {
        nome,
        descricao,
        criado_por: BigInt(professorId),
        grupo_id: grupo_id ? BigInt(grupo_id) : null
  }
});
    return res.status(201).json({
  message: "Exercício criado com sucesso",
  exercicio: formatBigInt(exercicio)
});

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message
    });
  }
});


router.get("/", async (req, res) => {
  try {
    const { nome, grupo_id, professor_id } = req.query;

    const where = {};

    if (nome) {
      where.nome = {
        contains: nome
      };
    }

    if (grupo_id) {
    where.grupo_id = BigInt(grupo_id);
}

    if (professor_id) {
      where.criado_por = BigInt(professor_id);
    }

    const exercicios = await prisma.exercicio.findMany({
        where,
        include: {
            grupo: true
        },
        orderBy: {
            id: "desc"
        }
    });

    const formatado = exercicios.map(e => ({
      ...e,
      id: e.id.toString(),
      criado_por: e.criado_por.toString()
    }));

    res.json(formatBigInt(formatado));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, grupo_id } = req.body;

    const exercicioExiste = await prisma.exercicio.findUnique({
      where: { id: BigInt(id) }
    });

    if (!exercicioExiste) {
      return res.status(404).json({
        error: "Exercício não encontrado."
      });
    }

    const exercicioAtualizado = await prisma.exercicio.update({
      where: { id: BigInt(id) },
      data: {
        nome,
        descricao,
        grupo_id: grupo_id ? BigInt(grupo_id) : null
        }
    });

    res.json({
  message: "Exercício atualizado com sucesso",
  exercicio: formatBigInt(exercicioAtualizado)
});

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const exercicioExiste = await prisma.exercicio.findUnique({
      where: { id: BigInt(id) }
    });

    if (!exercicioExiste) {
      return res.status(404).json({
        error: "Exercício não encontrado."
      });
    }

    await prisma.exercicio.delete({
      where: { id: BigInt(id) }
    });

    res.json({
      message: "Exercício excluído com sucesso"
    });

  } catch (error) {
    console.error(error);

    // erro comum: exercício vinculado a ficha
    if (error.code === "P2003") {
      return res.status(400).json({
        error: "Não é possível deletar: exercício já está em uso em fichas."
      });
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
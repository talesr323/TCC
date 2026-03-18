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

// Criar grupo
router.post("/", async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const grupo = await prisma.grupoMuscular.create({
      data: { nome }
    });

    res.status(201).json(formatBigInt(grupo));

  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Grupo já existe" });
    }

    res.status(500).json({ error: error.message });
  }
});

// Listar grupos
router.get("/", async (req, res) => {
  const grupos = await prisma.grupoMuscular.findMany();
  res.json(formatBigInt(grupos));
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({
        error: "Nome é obrigatório"
      });
    }

    const grupoExiste = await prisma.grupoMuscular.findUnique({
      where: { id: BigInt(id) }
    });

    if (!grupoExiste) {
      return res.status(404).json({
        error: "Grupo muscular não encontrado"
      });
    }

    const grupoAtualizado = await prisma.grupoMuscular.update({
      where: { id: BigInt(id) },
      data: {
        nome
      }
    });

    res.json({
      message: "Grupo atualizado com sucesso",
      grupo: formatBigInt(grupoAtualizado)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const grupoExiste = await prisma.grupoMuscular.findUnique({
      where: { id: BigInt(id) }
    });

    if (!grupoExiste) {
      return res.status(404).json({
        error: "Grupo muscular não encontrado"
      });
    }

    await prisma.grupoMuscular.delete({
      where: { id: BigInt(id) }
    });

    res.json({
      message: "Grupo muscular excluído com sucesso"
    });

  } catch (error) {
    console.error(error);

    // 🔥 se estiver vinculado a exercícios
    if (error.code === "P2003") {
      return res.status(400).json({
        error: "Não é possível deletar: grupo está vinculado a exercícios."
      });
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
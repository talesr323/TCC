import express from "express"
import prisma from "../../prisma/client.js"
import auth from "../middlewares/auth.js"

const router = express.Router()

const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  )

// LISTAR EXERCÍCIOS
router.get("/", auth, async (req, res) => {

  try {

    const exercicios = await prisma.exercicio.findMany()

    res.json(exercicios)

  } catch (error) {

    res.status(500).json(error)

  }

})


// CRIAR EXERCÍCIO
router.post("/", auth, async (req, res) => {

  try {

    const professor_id = req.usuario.professor_id

    const {
      nome,
      descricao,
      grupo_muscular
    } = req.body

    const exercicio = await prisma.exercicio.create({
      data: {
        nome,
        descricao,
        grupo_muscular,
        criado_por: professor_id
      }
    })

    res.status(201).json(exercicio)

  } catch (error) {

    res.status(500).json(error)

  }

})

//ALTERAR EXERCÍCIO
router.put("/:id", async (req, res) => {
  try{
    const { id } = req.params;
    const { nome, descricao, grupo_muscular } = req.body;
    const professor_id = req.usuario.professor_id;

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
        grupo_muscular,
        criado_por: professor_id
      }
    });

    res.json({
      message: "Exercicio atualizado com sucesso!",
      exercicio: formatBigInt(exercicioAtualizado)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: error.message });
  } 
});

//DELETAR EXERCÍCIO
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

export default router
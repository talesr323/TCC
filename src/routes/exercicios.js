import express from "express"
import prisma from "../../prisma/client.js"
import auth from "../middlewares/auth.js"

const router = express.Router()

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

    const professor_id = req.usuario.id

    const { nome, descricao, grupo_muscular } = req.body

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

export default router
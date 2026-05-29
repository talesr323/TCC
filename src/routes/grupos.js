import express from "express"
import prisma from "../../prisma/client.js"
import auth from "../middlewares/auth.js"

const router = express.Router()


// LISTAR GRUPOS
router.get("/", auth, async (req, res) => {

  try {

    const grupos = await prisma.grupoTreino.findMany({
      include: {
        professor: true
      }
    })

    res.json(grupos)

  } catch (error) {

    res.status(500).json(error)

  }

})


// CRIAR GRUPO
router.post("/", auth, async (req, res) => {

  try {

    const professor_id = req.usuario.professor_id

    const {
      nome,
      descricao,
      nivel
    } = req.body

    const grupo = await prisma.grupoTreino.create({
      data: {
        nome,
        descricao,
        nivel,
        criado_por: professor_id
      }
    })

    res.status(201).json(grupo)

  } catch (error) {

    res.status(500).json(error)

  }

})

export default router
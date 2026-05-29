import express from "express"
import prisma from "../../prisma/client.js"
import auth from "../middlewares/auth.js"

const router = express.Router()

/*
CRIAR FICHA DE TREINO
*/
router.post("/", auth, async (req, res) => {

  try {

    const professor_id = req.usuario.professor_id

    const {
      nome,
      aluno_id,
      grupo_id,
      data_inicio,
      data_fim,
      exercicios
    } = req.body

    const ficha = await prisma.fichaTreino.create({
      data: {
        nome,
        aluno_id,
        professor_id,
        grupo_id,
        data_inicio,
        data_fim,

        exercicios: {
          create: exercicios.map(ex => ({
            exercicio_id: ex.exercicio_id,
            series: ex.series,
            repeticoes: ex.repeticoes,
            descanso_segundos: ex.descanso_segundos,
            carga_sugerida: ex.carga_sugerida
          }))
        }
      },

      include: {
        exercicios: true
      }
    })

    res.status(201).json(ficha)

  } catch (error) {

    res.status(500).json({
      erro: "Erro ao criar ficha",
      detalhe: error.message
    })

  }

})


// LISTAR FICHAS
router.get("/", auth, async (req, res) => {

  try {

    const professor_id = req.usuario.professor_id

    const fichas = await prisma.fichaTreino.findMany({
      where: {
        professor_id
      },

      include: {
        aluno: true,

        exercicios: {
          include: {
            exercicio: true
          }
        }
      }
    })

    res.json(fichas)

  } catch (error) {

    res.status(500).json(error)

  }

})

export default router
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
          create: exercicios?.map(ex => ({
            exercicio_id: ex.exercicio_id,
            series: ex.series,
            repeticoes: ex.repeticoes,
            descanso_segundos: ex.descanso_segundos,
            carga_sugerida: ex.carga_sugerida
          })) || []
        }
      },

      include: {
        exercicios: {
          include: {
            exercicio: true
          }
        }
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

/*
LISTAR FICHAS
*/
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

    res.status(500).json({
      erro: error.message
    })

  }

})

/*
BUSCAR FICHA POR ID
*/
router.get("/:id", auth, async (req, res) => {

  try {

    const ficha = await prisma.fichaTreino.findUnique({
      where: {
        id: BigInt(req.params.id)
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

    if (!ficha) {
      return res.status(404).json({
        erro: "Ficha não encontrada"
      })
    }

    res.json(ficha)

  } catch (error) {

    res.status(500).json({
      erro: error.message
    })

  }

})

/*
ATUALIZAR FICHA
*/
router.put("/:id", auth, async (req, res) => {

  try {

    const { id } = req.params

    const {
      nome,
      aluno_id,
      grupo_id,
      data_inicio,
      data_fim
    } = req.body

    const ficha = await prisma.fichaTreino.update({
      where: {
        id: BigInt(id)
      },

      data: {
        nome,
        aluno_id,
        grupo_id,
        data_inicio,
        data_fim
      }
    })

    res.json({
      mensagem: "Ficha atualizada com sucesso",
      ficha
    })

  } catch (error) {

    res.status(500).json({
      erro: error.message
    })

  }

})

/*
EXCLUIR FICHA
*/
router.delete("/:id", auth, async (req, res) => {

  try {

    await prisma.fichaTreino.delete({
      where: {
        id: BigInt(req.params.id)
      }
    })

    res.json({
      mensagem: "Ficha excluída com sucesso"
    })

  } catch (error) {

    res.status(500).json({
      erro: error.message
    })

  }

})

/*
ADICIONAR EXERCÍCIO EM UMA FICHA
*/
router.post("/:id/exercicios", auth, async (req, res) => {

  try {

    const { id } = req.params

    const {
      exercicio_id,
      series,
      repeticoes,
      descanso_segundos,
      carga_sugerida
    } = req.body

    const item = await prisma.fichaExercicio.create({
      data: {
        ficha_id: BigInt(id),
        exercicio_id: BigInt(exercicio_id),
        series,
        repeticoes,
        descanso_segundos,
        carga_sugerida
      }
    })

    res.status(201).json({
      mensagem: "Exercício adicionado com sucesso",
      item
    })

  } catch (error) {

    res.status(500).json({
      erro: error.message
    })

  }

})

/*
ATUALIZAR EXERCÍCIO DA FICHA
*/

router.put("/exercicios/:id", auth, async (req, res) => {

  try {

    const { id } = req.params

    const {
      series,
      repeticoes,
      descanso_segundos,
      carga_sugerida
    } = req.body

    const exercicio = await prisma.fichaExercicio.update({
      where: {
        id: BigInt(id)
      },

      data: {
        series,
        repeticoes,
        descanso_segundos,
        carga_sugerida
      }
    })

    res.json(exercicio)

  } catch (error) {

    res.status(500).json({
      erro: error.message
    })

  }

})

/*
REMOVER EXERCÍCIO DA FICHA
*/

router.delete("/exercicios/:id", auth, async (req, res) => {

  try {

    await prisma.fichaExercicio.delete({
      where: {
        id: BigInt(req.params.id)
      }
    })

    res.json({
      mensagem: "Exercício removido com sucesso"
    })

  } catch (error) {

    res.status(500).json({
      erro: error.message
    })

  }

})

router.put("/:id/vincular-aluno", auth, async (req, res) => {
  try {

    const { id } = req.params
    const { aluno_id } = req.body

    const aluno = await prisma.aluno.findUnique({
      where: {
        id: BigInt(aluno_id)
      }
    })

    if (!aluno) {
      return res.status(404).json({
        erro: "Aluno não encontrado"
      })
    }

    const ficha = await prisma.fichaTreino.update({
      where: {
        id: BigInt(id)
      },
      data: {
        aluno_id: BigInt(aluno_id)
      }
    })

    res.json(ficha)

  } catch (error) {

    res.status(500).json({
      erro: error.message
    })

  }
});

export default router
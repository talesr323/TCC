import express from "express"
import prisma from "../../prisma/client.js"
import auth from "../middlewares/auth.js"

const router = express.Router()

router.get("/", auth, async (req, res) => {

  try {

    const ranking = await prisma.aluno.findMany({

      orderBy: {
        experiencia: "desc"
      },

      take: 50,

      include: {
        usuario: true
      }
    })

    res.json(ranking)

  } catch (error) {

    res.status(500).json(error)

  }

})

export default router
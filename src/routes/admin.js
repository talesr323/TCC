import express from "express"
import { PrismaClient } from "@prisma/client"
import crypto from "crypto"

import auth from "../middlewares/auth.js"
import admin from "../middlewares/admin.js"

const prisma = new PrismaClient()
const router = express.Router()

// Criar usuário (aluno/professor)
router.post("/usuarios", auth, admin, async (req, res) => {

  const { email, cpf, nome, tipo, cref } = req.body

  if (!email || !cpf || !nome || !tipo) {
    return res.status(400).json({ error: "Dados obrigatórios" })
  }

  const usuario = await prisma.usuario.create({
    data: {
      email,
      cpf,
      nome,
      ativo: false
    }
  })

  if (tipo === "PROFESSOR") {
    await prisma.professor.create({
      data: {
        usuario_id: usuario.id,
        cref
      }
    })
  }

  if (tipo === "ALUNO") {
    await prisma.aluno.create({
      data: {
        usuario_id: usuario.id
      }
    })
  }

  const token = crypto.randomBytes(32).toString("hex")

  await prisma.tokenAtivacao.create({
    data: {
      usuario_id: usuario.id,
      token,
      expira_em: new Date(Date.now() + 1000 * 60 * 60 * 24)
    }
  })

  const link = `http://localhost:3000/ativar-conta?token=${token}`

  res.json({
    message: "Usuário criado com sucesso",
    link_ativacao: link
  })

})

export default router
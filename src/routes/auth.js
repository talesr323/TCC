import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const router = express.Router()

// 🔧 Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  )

// 🔐 ATIVAR CONTA
router.post("/ativar", async (req, res) => {
  try {
    const { token, senha } = req.body

    if (!token || !senha) {
      return res.status(400).json({
        error: "Token e senha obrigatórios"
      })
    }

    const registro = await prisma.tokenAtivacao.findUnique({
      where: { token }
    })

    if (!registro || registro.usado) {
      return res.status(400).json({ error: "Token inválido" })
    }

    if (registro.expira_em < new Date()) {
      return res.status(400).json({ error: "Token expirado" })
    }

    const senha_hash = await bcrypt.hash(senha, 10)

    await prisma.usuario.update({
      where: { id: registro.usuario_id },
      data: {
        senha_hash,
        ativo: true
      }
    })

    await prisma.tokenAtivacao.update({
      where: { id: registro.id },
      data: { usado: true }
    })

    return res.json({ message: "Conta ativada com sucesso" })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
})


// 🔑 LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body

    if (!email || !senha) {
      return res.status(400).json({
        error: "Email e senha são obrigatórios"
      })
    }

    const user = await prisma.usuario.findUnique({
  where: { email },
  include: {
    admin: true,
    professor: true,
    aluno: true
  }
})

if (!user) {
  return res.status(404).json({ error: "Usuário não encontrado" })
}

if (!user.ativo) {
  return res.status(403).json({ error: "Conta não ativada" })
}

if (!user.senha_hash) {
  return res.status(403).json({ error: "Senha não definida" })
}

if (!user.academia_id) {
  return res.status(400).json({
    error: "Usuário não vinculado a academia"
  })
}

const senhaValida = await bcrypt.compare(senha, user.senha_hash)

if (!senhaValida) {
  return res.status(401).json({ error: "Senha inválida" })
}

let tipo = "USER"

if (user.admin) tipo = "ADMIN"
else if (user.professor) tipo = "PROFESSOR"
else if (user.aluno) tipo = "ALUNO"

const token = jwt.sign(
  {
    id: user.id.toString(),
    email: user.email,
    tipo,
    academia_id: user.academia_id
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
)

return res.json({ token, tipo })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
})

export default router
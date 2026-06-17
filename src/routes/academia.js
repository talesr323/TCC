import express from "express"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()
const router = express.Router()
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  )

router.post("/setup-inicial", async (req, res) => {
  try {
    const {
      // academia
      nomeAcademia,
      cnpj,
      endereco,
      cep,
      cidade,
      estado,

      // admin
      nome,
      sobrenome,
      email,
      cpf,
      telefone,
      senha
    } = req.body

    // 🔎 validação básica
    if (!nomeAcademia || !cnpj || !email || !cpf || !senha || !nome) {
      return res.status(400).json({ error: "Dados obrigatórios" })
    }

    // 🚫 impede rodar duas vezes
    const adminExistente = await prisma.admin.findFirst()

    if (adminExistente) {
      return res.status(400).json({
        error: "Sistema já foi inicializado"
      })
    }

    // 🔐 hash da senha
    const senha_hash = await bcrypt.hash(senha, 10)

    // 🚀 TRANSACTION (se der erro, nada é salvo)
    const result = await prisma.$transaction(async (tx) => {

      const academia = await tx.academia.create({
        data: {
          nome: nomeAcademia,
          cnpj,
          endereco,
          cep,
          cidade,
          estado
        }
      })

      const usuario = await tx.usuario.create({
        data: {
          nome: `${nome} ${sobrenome}`,
          email,
          cpf,
          telefone,
          senha_hash,
          ativo: true,
          academia_id: academia.id
        }
      })

      await tx.admin.create({
        data: {
          usuario_id: usuario.id
        }
      })

      return { usuario, academia }
    })

    return res.status(201).json({
  message: "Sistema inicializado com sucesso",
  usuario: formatBigInt(result.usuario),
  academia: formatBigInt(result.academia)
})

  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: "Erro ao inicializar sistema"
    })
  }
})

export default router
import express from "express"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import auth from "../middlewares/auth.js"
import crypto from "crypto"

const prisma = new PrismaClient()
const router = express.Router()

// 🔧 Corrige BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  )

// 🔥 CRIAR USUÁRIO (SEM SENHA + COM TOKEN)
router.post("/", auth, async (req, res) => {
  try {
    const { email, cpf, nome, telefone, foto_perfil, tipo, cref } = req.body

    if (!email || !cpf || !nome || !tipo) {
      return res.status(400).json({
        error: "Email, CPF, nome e tipo são obrigatórios."
      })
    }

    // 🚫 Bloqueia ADMIN
    if (tipo === "ADMIN") {
      return res.status(403).json({
        error: "Não é permitido criar administrador"
      })
    }

    if (!["ALUNO", "PROFESSOR"].includes(tipo)) {
      return res.status(400).json({
        error: "Tipo deve ser ALUNO ou PROFESSOR"
      })
    }

    // 🔥 CRIA USUÁRIO
    const usuario = await prisma.usuario.create({
      data: {
        email,
        cpf,
        nome,
        telefone,
        foto_perfil,
        ativo: false,
        academia_id: req.usuario.academia_id // ✅ corrigido
      }
    })

    // 🔐 CRIA PERFIL
    let perfil = null

    if (tipo === "PROFESSOR") {
      if (!cref) {
        return res.status(400).json({
          error: "CREF é obrigatório para professor."
        })
      }

      perfil = await prisma.professor.create({
        data: {
          usuario_id: usuario.id,
          cref
        }
      })
    }

    if (tipo === "ALUNO") {
      perfil = await prisma.aluno.create({
        data: {
          usuario_id: usuario.id
        }
      })
    }

    // 🔑 GERA TOKEN
    const tokenAtivacao = crypto.randomBytes(32).toString("hex")

    await prisma.tokenAtivacao.create({
      data: {
        usuario_id: usuario.id,
        token: tokenAtivacao,
        expira_em: new Date(Date.now() + 1000 * 60 * 60 * 24)
      }
    })

    const link = `http://localhost:3000/ativar-conta?token=${tokenAtivacao}`

    return res.status(201).json({
      message: "Usuário criado com sucesso",
      token: tokenAtivacao,
      link_ativacao: link,
      usuario: formatBigInt(usuario),
      perfil: formatBigInt(perfil)
    })

  } catch (error) {
    console.error(error)

    if (error.code === "P2002") {
      let campo = error.meta?.target
      if (Array.isArray(campo)) campo = campo[0]

      if (typeof campo === "string") {
        if (campo.includes("email")) campo = "Email"
        else if (campo.includes("cpf")) campo = "CPF"
        else if (campo.includes("cref")) campo = "CREF"
      }

      return res.status(400).json({
        error: `${campo} já cadastrado.`
      })
    }

    return res.status(500).json({ error: error.message })
  }
})


// 🔍 LISTAR OU BUSCAR
router.get("/", auth, async (req, res) => {
  try {
    const { id } = req.query

    if (id) {
      const usuario = await prisma.usuario.findUnique({
        where: { id: BigInt(id) }
      })

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado." })
      }

      return res.json(formatBigInt(usuario))
    }

    const usuarios = await prisma.usuario.findMany({
      where: {
        academia_id: req.usuario.academia_id // 🔒 isolando por academia
      }
    })

    res.json(formatBigInt(usuarios))

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})


// ✏️ ATUALIZAR
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params
    const { email, cpf, senha, nome, telefone, foto_perfil } = req.body

    const usuarioExiste = await prisma.usuario.findUnique({
      where: { id: BigInt(id) }
    })

    if (!usuarioExiste) {
      return res.status(404).json({ error: "Usuário não encontrado." })
    }

    let senha_hash = usuarioExiste.senha_hash

    if (senha) {
      senha_hash = await bcrypt.hash(senha, 10)
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: BigInt(id) },
      data: {
        email,
        cpf,
        senha_hash,
        nome,
        telefone,
        foto_perfil
      }
    })

    return res.json({
      message: "Usuário atualizado com sucesso",
      usuario: formatBigInt(usuarioAtualizado)
    })

  } catch (error) {
    console.error(error)

    if (error.code === "P2002") {
      return res.status(400).json({
        error: "Email ou CPF já cadastrado."
      })
    }

    return res.status(500).json({ error: error.message })
  }
})


// ❌ DELETAR
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params

    const usuarioExiste = await prisma.usuario.findUnique({
      where: { id: BigInt(id) }
    })

    if (!usuarioExiste) {
      return res.status(404).json({ error: "Usuário não encontrado." })
    }

    await prisma.usuario.delete({
      where: { id: BigInt(id) }
    })

    return res.json({
      message: "Usuário excluído com sucesso"
    })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
})


// 🎓 LISTAR ALUNOS
router.get("/alunos", auth, async (req, res) => {
  try {
    const alunos = await prisma.aluno.findMany({
      include: {
        usuario: true
      }
    })

    res.json(formatBigInt(alunos))

  } catch (error) {
    res.status(500).json(error)
  }
})

export default router
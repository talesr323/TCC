import jwt from 'jsonwebtoken';

function auth(req, res, next) {
  //1. Buscar o cabeçalho "Authorization" dentro dos headers da requisição HTTP
  const authHeader = req.headers.authorization;

  //1.1. Se o cabeçalho "Authorization" não existir, o sistema irá barrar a requisição
  if (!authHeader) {
    return res.status(401).json({
      error: 'Acesso negado. O cabeçalho não foi fornecido',
      message: 'O cabeçalho de autorização (Authorization Header) não foi fornecido.',
      code: 'AUTH_HEADER_MISSING', //Ajuda o front-end a criar telas de erro customizadas
    });
  }

  const partesToken = authHeader.split(' '); //O cabeçalho costuma vir no formato "Bearer Token"

  if (partesToken.length !== 2 || partesToken[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Acesso negado. Token inválido.',
      message: 'Formato do token inválido. O padrão esperado é: "Bearer {{token}}".',
      code: 'AUTH_HEADER_MALFORMED',
    });
  }

  const token = partesToken[1];

  try {
    //2. Verificar o token usando a chave secreta guardada nas variáveis de ambiente (.env)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //3. Injetar os dados do usuário decodificados dentro do objeto da requisição.
    req.usuario = {
      ...decoded, //Copia todas as propriedades originais que vieram dentro do token JWT

      //3.1. Converter as IDs do tipo String/Int para o tipo BigInt.
      usuario_id: decoded.usuario_id ? BigInt(decoded.usuario_id) : null, //Caso a ID não exista no token
      professor_id: decoded.professor_id ? BigInt(decoded.professor_id) : null,
      aluno_id: decoded.aluno_id ? BigInt(decoded.aluno_id) : null,
      admin_id: decoded.admin_id ? BigInt(decoded.admin_id) : null,
      academia_id: decoded.academia_id ? BigInt(decoded.academia_id) : null,
    };

    //4. Caso o token seja validado, chamar a função "next()" para liberar o acesso a rota.
    next();
  } catch (error) {
    //Se o token estiver expirado.
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Sessão expirada',
        message: 'O token fornecido expirou. Por favor, faça o login novamente',
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt,
      });
    }

    //Se o token for adulterado ou a chave secreta foi alterada
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Acesso negado',
        message: 'Token de autenticação inválido ou corrompido.',
        code: 'TOKEN_INVALID',
      });
    }

    //Qualquer outro erro inesperado na verificação
    return res.status(401).json({
      error: 'Acesso negado',
      message: 'Falha ao autenticar o token de acesso.',
      code: 'AUTH_FAILURE',
    });
  }
}

export default auth;

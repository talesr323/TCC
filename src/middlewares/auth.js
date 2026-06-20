import jwt from 'jsonwebtoken';

function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Token não informado',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = {
      ...decoded,

      usuario_id: decoded.usuario_id ? BigInt(decoded.usuario_id) : null,

      professor_id: decoded.professor_id ? BigInt(decoded.professor_id) : null,

      aluno_id: decoded.aluno_id ? BigInt(decoded.aluno_id) : null,

      admin_id: decoded.admin_id ? BigInt(decoded.admin_id) : null,

      academia_id: decoded.academia_id ? BigInt(decoded.academia_id) : null,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido',
    });
  }
}

export default auth;

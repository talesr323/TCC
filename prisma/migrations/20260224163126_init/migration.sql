-- CreateTable
CREATE TABLE `usuarios` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(150) NOT NULL,
    `cpf` CHAR(11) NOT NULL,
    `senha_hash` VARCHAR(255) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `telefone` VARCHAR(20) NULL,
    `foto_perfil` VARCHAR(255) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    UNIQUE INDEX `usuarios_cpf_key`(`cpf`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admins` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT NOT NULL,

    UNIQUE INDEX `admins_usuario_id_key`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professores` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT NOT NULL,
    `cref` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `professores_usuario_id_key`(`usuario_id`),
    UNIQUE INDEX `professores_cref_key`(`cref`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alunos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT NOT NULL,
    `nivel` ENUM('INICIANTE', 'INTERMEDIARIO', 'AVANCADO') NOT NULL DEFAULT 'INICIANTE',
    `pontuacao` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',

    UNIQUE INDEX `alunos_usuario_id_key`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grupos_treino` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `descricao` TEXT NULL,
    `nivel` ENUM('INICIANTE', 'INTERMEDIARIO', 'AVANCADO') NULL,
    `criado_por` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fichas_treino` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `aluno_id` BIGINT NOT NULL,
    `professor_id` BIGINT NOT NULL,
    `grupo_id` BIGINT NULL,
    `data_inicio` DATETIME(3) NULL,
    `data_fim` DATETIME(3) NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercicios` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `descricao` TEXT NULL,
    `grupo_muscular` VARCHAR(100) NULL,
    `criado_por` BIGINT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ficha_exercicios` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `ficha_id` BIGINT NOT NULL,
    `exercicio_id` BIGINT NOT NULL,
    `series` INTEGER NOT NULL,
    `repeticoes` INTEGER NOT NULL,
    `descanso_segundos` INTEGER NULL,
    `carga_sugerida` DECIMAL(6, 2) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registro_treino` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `aluno_id` BIGINT NOT NULL,
    `ficha_exercicio_id` BIGINT NOT NULL,
    `carga_real` DECIMAL(6, 2) NULL,
    `repeticoes_real` INTEGER NULL,
    `data_execucao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gamificacao` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `descricao` TEXT NULL,
    `pontos` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aluno_gamificacao` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `aluno_id` BIGINT NOT NULL,
    `gamificacao_id` BIGINT NOT NULL,
    `data_conquista` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ranking` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `aluno_id` BIGINT NOT NULL,
    `pontos_total` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ranking_aluno_id_key`(`aluno_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `relatorios` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tipo` VARCHAR(100) NOT NULL,
    `referencia_id` BIGINT NULL,
    `gerado_por` BIGINT NOT NULL,
    `data_geracao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admins` ADD CONSTRAINT `admins_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professores` ADD CONSTRAINT `professores_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alunos` ADD CONSTRAINT `alunos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grupos_treino` ADD CONSTRAINT `grupos_treino_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `professores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fichas_treino` ADD CONSTRAINT `fichas_treino_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fichas_treino` ADD CONSTRAINT `fichas_treino_professor_id_fkey` FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fichas_treino` ADD CONSTRAINT `fichas_treino_grupo_id_fkey` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_treino`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercicios` ADD CONSTRAINT `exercicios_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `professores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ficha_exercicios` ADD CONSTRAINT `ficha_exercicios_ficha_id_fkey` FOREIGN KEY (`ficha_id`) REFERENCES `fichas_treino`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ficha_exercicios` ADD CONSTRAINT `ficha_exercicios_exercicio_id_fkey` FOREIGN KEY (`exercicio_id`) REFERENCES `exercicios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registro_treino` ADD CONSTRAINT `registro_treino_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registro_treino` ADD CONSTRAINT `registro_treino_ficha_exercicio_id_fkey` FOREIGN KEY (`ficha_exercicio_id`) REFERENCES `ficha_exercicios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aluno_gamificacao` ADD CONSTRAINT `aluno_gamificacao_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aluno_gamificacao` ADD CONSTRAINT `aluno_gamificacao_gamificacao_id_fkey` FOREIGN KEY (`gamificacao_id`) REFERENCES `gamificacao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ranking` ADD CONSTRAINT `ranking_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relatorios` ADD CONSTRAINT `relatorios_gerado_por_fkey` FOREIGN KEY (`gerado_por`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

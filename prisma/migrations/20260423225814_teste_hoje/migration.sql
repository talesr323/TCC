/*
  Warnings:

  - Added the required column `academia_id` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `academia_id` BIGINT NOT NULL,
    MODIFY `senha_hash` VARCHAR(255) NULL,
    MODIFY `ativo` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `tokens_ativacao` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expira_em` DATETIME(3) NOT NULL,
    `usado` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `tokens_ativacao_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academias` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `cnpj` VARCHAR(14) NOT NULL,
    `endereco` VARCHAR(255) NOT NULL,
    `cep` VARCHAR(10) NOT NULL,
    `cidade` VARCHAR(100) NOT NULL,
    `estado` VARCHAR(2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `academias_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_academia_id_fkey` FOREIGN KEY (`academia_id`) REFERENCES `academias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tokens_ativacao` ADD CONSTRAINT `tokens_ativacao_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

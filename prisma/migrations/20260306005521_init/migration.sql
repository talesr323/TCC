-- AlterTable
ALTER TABLE `usuarios` MODIFY `senha_hash` VARCHAR(255) NULL,
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

-- AddForeignKey
ALTER TABLE `tokens_ativacao` ADD CONSTRAINT `tokens_ativacao_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

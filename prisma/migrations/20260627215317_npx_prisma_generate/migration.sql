-- CreateTable
CREATE TABLE `execucao_treino` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `treino_id` BIGINT NOT NULL,
    `aluno_id` BIGINT NOT NULL,
    `iniciado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finalizado_em` DATETIME(3) NULL,
    `status` ENUM('NAO_INICIADA', 'EM_ANDAMENTO', 'INCOMPLETA', 'FINALIZADA', 'CANCELADA') NOT NULL DEFAULT 'NAO_INICIADA',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `execucao_treino` ADD CONSTRAINT `execucao_treino_treino_id_fkey` FOREIGN KEY (`treino_id`) REFERENCES `treinos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `execucao_treino` ADD CONSTRAINT `execucao_treino_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

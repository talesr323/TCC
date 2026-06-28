-- AlterTable
ALTER TABLE `execucao_ficha` ADD COLUMN `execucao_treino_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `execucao_ficha` ADD CONSTRAINT `execucao_ficha_execucao_treino_id_fkey` FOREIGN KEY (`execucao_treino_id`) REFERENCES `execucao_treino`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

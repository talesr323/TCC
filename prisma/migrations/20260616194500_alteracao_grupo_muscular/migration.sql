-- AlterTable
ALTER TABLE `exercicios` ADD COLUMN `grupo_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `exercicios` ADD CONSTRAINT `exercicios_grupo_id_fkey` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_treino`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE `fichas_treino` DROP FOREIGN KEY `fichas_treino_aluno_id_fkey`;

-- DropIndex
DROP INDEX `fichas_treino_aluno_id_fkey` ON `fichas_treino`;

-- AlterTable
ALTER TABLE `fichas_treino` MODIFY `aluno_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `fichas_treino` ADD CONSTRAINT `fichas_treino_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

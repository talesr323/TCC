-- DropForeignKey
ALTER TABLE `aluno_conquistas` DROP FOREIGN KEY `aluno_conquistas_conquista_id_fkey`;

-- DropIndex
DROP INDEX `aluno_conquistas_conquista_id_fkey` ON `aluno_conquistas`;

-- AddForeignKey
ALTER TABLE `aluno_conquistas` ADD CONSTRAINT `aluno_conquistas_conquista_id_fkey` FOREIGN KEY (`conquista_id`) REFERENCES `conquistas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

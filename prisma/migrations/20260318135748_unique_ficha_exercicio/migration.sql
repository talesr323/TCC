/*
  Warnings:

  - A unique constraint covering the columns `[ficha_id,exercicio_id]` on the table `ficha_exercicios` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `ficha_exercicios_ficha_id_exercicio_id_key` ON `ficha_exercicios`(`ficha_id`, `exercicio_id`);

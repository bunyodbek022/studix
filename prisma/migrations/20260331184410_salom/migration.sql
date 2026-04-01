/*
  Warnings:

  - The values [ADMINSTRATOR] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[lessonId,studentId]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `StudentGroup` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TeacherHistoryType" AS ENUM ('ARCHIVED', 'DELETED', 'CREATED', 'UPDATED', 'RESTORED');

-- CreateEnum
CREATE TYPE "StudentHistoryType" AS ENUM ('CREATED', 'UPDATED', 'ARCHIVED', 'RESTORED', 'DELETED');

-- CreateEnum
CREATE TYPE "GroupHistoryType" AS ENUM ('CREATED', 'UPDATED', 'ARCHIVED', 'RESTORED', 'DELETED');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPERADMIN', 'ADMIN', 'STUDENT', 'TEACHER', 'MANAGEMENT', 'ADMINISTRATOR');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Status" ADD VALUE 'FREEZE';
ALTER TYPE "Status" ADD VALUE 'DELETED';

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "StudentGroup" ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "addedBy" TEXT,
ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "TeacherHistory" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "TeacherHistoryType" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentHistory" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "userId" INTEGER,
    "type" "StudentHistoryType" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupHistory" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "userId" INTEGER,
    "type" "GroupHistoryType" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_lessonId_studentId_key" ON "Attendance"("lessonId", "studentId");

-- AddForeignKey
ALTER TABLE "TeacherHistory" ADD CONSTRAINT "TeacherHistory_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherHistory" ADD CONSTRAINT "TeacherHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHistory" ADD CONSTRAINT "StudentHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHistory" ADD CONSTRAINT "StudentHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupHistory" ADD CONSTRAINT "GroupHistory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupHistory" ADD CONSTRAINT "GroupHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

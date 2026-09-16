-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "client_id" INTEGER,
ADD COLUMN     "file_name" VARCHAR(255),
ADD COLUMN     "project_id" INTEGER,
ADD COLUMN     "status_after" VARCHAR(50),
ADD COLUMN     "status_before" VARCHAR(50);

-- AlterTable
ALTER TABLE "consultations_projects" ADD COLUMN     "progress_percent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" VARCHAR(500),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reset_token" VARCHAR(255),
ADD COLUMN     "reset_token_expires" TIMESTAMP(6);

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "consultations_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- First migration. Add feature tables from 002 onward, each in a new numbered file.
-- On an empty volume, Docker initialization runs the files in this folder first, and then db:migrate applies the same files again and records them.
-- So write every migration to be safe to run again (IF NOT EXISTS, ON CONFLICT, and so on).
SET TIME ZONE 'Asia/Seoul';

-- Make the uploads bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'uploads';
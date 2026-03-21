ALTER TABLE users
MODIFY COLUMN role ENUM('super_user','admin','organisateur','participant')
DEFAULT 'participant';

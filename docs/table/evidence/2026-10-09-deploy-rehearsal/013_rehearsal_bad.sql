-- REHEARSAL ONLY (scratch directory, never in the repository): does real work, then fails.
CREATE TABLE rehearsal_half_done(id int);
ALTER TABLE recipe_bookmarks ADD COLUMN rehearsal_col text;
UPDATE recipe_bookmarks SET title = 'changed by the bad migration';
SELECT * FROM no_such_table;

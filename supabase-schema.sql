-- Run this SQL in your Supabase project's SQL Editor (supabase.com → your project → SQL Editor)

-- 1. Sprints table
CREATE TABLE sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  goal TEXT DEFAULT '',
  velocity_target INTEGER DEFAULT 0,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sprints" ON sprints
  FOR ALL USING (auth.uid() = owner_id);

-- 2. Tasks table
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  epic TEXT DEFAULT '',
  description TEXT NOT NULL,
  assignee TEXT DEFAULT '',
  status TEXT DEFAULT 'To Do',
  priority TEXT DEFAULT 'Medium',
  sp INTEGER DEFAULT 0,
  blockers TEXT DEFAULT '',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tasks" ON tasks
  FOR ALL USING (auth.uid() = owner_id);

-- 3. Developers table
CREATE TABLE developers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE developers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own developers" ON developers
  FOR ALL USING (auth.uid() = owner_id);

-- 4. Comments table
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT DEFAULT '',
  author_photo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read comments on their tasks" ON comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = comments.task_id AND tasks.owner_id = auth.uid())
  );
CREATE POLICY "Users can insert comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (auth.uid() = author_id);

-- 5. Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE sprints;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE developers;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

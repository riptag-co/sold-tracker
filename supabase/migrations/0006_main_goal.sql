-- The "main goal" is one specific goal the user has starred. Its
-- progress is drawn as a ring around the period-picker on Overview.
-- Storing the reference on the singleton control row keeps the model
-- tiny and easy to update.

alter table public.control
  add column if not exists main_goal_id uuid
  references public.goals(id) on delete set null;

create policy history_delete on public.listening_history
for delete to authenticated using (user_id = auth.uid());

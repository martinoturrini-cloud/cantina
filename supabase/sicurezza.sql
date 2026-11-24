-- Protegge la tabella "bottiglie": solo gli utenti che hanno fatto login possono leggere e scrivere.
-- Da eseguire in Supabase → SQL Editor DOPO aver creato il tuo utente
-- (Authentication → Users → Add user) e aver verificato che il login nell'app funzioni.
--
-- ATTENZIONE: dopo questo script la vecchia versione web (cantina.jsx), che non fa login,
-- non potrà più leggere né salvare i dati.

alter table public.bottiglie enable row level security;

-- Rimuove le policy esistenti (quelle aperte a tutti usate finora)
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'bottiglie' loop
    execute format('drop policy %I on public.bottiglie', p.policyname);
  end loop;
end $$;

create policy "cantina: lettura utenti autenticati"
  on public.bottiglie for select to authenticated using (true);

create policy "cantina: inserimento utenti autenticati"
  on public.bottiglie for insert to authenticated with check (true);

create policy "cantina: modifica utenti autenticati"
  on public.bottiglie for update to authenticated using (true) with check (true);

-- Prevenção real de conflito de horário (seção 12 do plano).
-- Rodar DEPOIS da primeira `prisma migrate dev`, direto no banco (Supabase SQL editor
-- ou `psql`). O Prisma não representa EXCLUDE CONSTRAINT no schema.prisma, por isso
-- este SQL fica fora do fluxo normal de migration e precisa ser reaplicado manualmente
-- se o schema do Appointment for recriado do zero.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (
    "professionalId" WITH =,
    tsrange("startAt", "endAt") WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS'));

-- Com isso, o próprio Postgres rejeita (erro 23P01) qualquer INSERT/UPDATE que
-- sobreponha o intervalo de outro agendamento ativo do mesmo profissional, mesmo com
-- duas requisições simultâneas. O código da aplicação deve tratar esse erro e devolver
-- "horário não está mais disponível" pro cliente.

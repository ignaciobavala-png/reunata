-- Nueva etapa "deposito", entre "puerto" (nacionalizado) y "cerrado".
--
-- Devolución del tester (22/09/2026): aduana liberada (nacionalizado) no es lo
-- mismo que mercadería físicamente en el depósito. Nacionalizado sigue
-- figurando en el panel de preventa —ver ETAPAS_VISIBLES en
-- src/lib/containers.ts— y recién "deposito" es la etapa que marca entrega
-- inmediata real, el día que Elena carga la unidad en la cuenta principal.
alter table public.containers
  drop constraint containers_etapa_check;

alter table public.containers
  add constraint containers_etapa_check
  check (etapa in ('borrador','china','oceano','puerto','deposito','cerrado','cancelado'));

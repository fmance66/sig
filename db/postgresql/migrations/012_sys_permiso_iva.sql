-- El módulo 'iva' no tenía fila de permisos para el grupo admin (1) en
-- producción (Neon) porque el módulo no existía cuando se armó ese grupo —
-- causaba "error de permisos" al entrar a I.V.A. recién sincronizado. En
-- local ya estaba (agregado a mano en algún momento del desarrollo, nunca
-- quedó versionado). Ver memoria project_deploy_neon_sync.

BEGIN;

INSERT INTO sys_permiso (grupo, modulo, ver, crear, editar, eliminar)
VALUES (1, 'iva', true, true, true, true)
ON CONFLICT (grupo, modulo) DO NOTHING;

COMMIT;

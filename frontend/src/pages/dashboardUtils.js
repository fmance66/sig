export const formatMonto = v => '$' + Number(v || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });

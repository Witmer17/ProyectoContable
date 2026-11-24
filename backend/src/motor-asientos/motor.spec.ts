import {
  aCentimos as c, calcularMontos, compraActivo, compraMercaderia, convertirASoles, pagoServicio, ventaMercaderia,
  aporteCapital, totales, retencionHonorarios, honorarios, planilla, depreciacionMes, liquidacionIgv, ventaActivo,
  entradaKardex, salidaKardex, SaldoKardex, Linea, PLANTILLAS,
} from './index';

const m = (x: ReturnType<typeof calcularMontos>) => [x.base, x.igv, x.total];
const suma = (ls: Linea[], cuenta: string, lado: 'debe' | 'haber', etapa?: string) =>
  ls.filter((l) => l.cuenta === cuenta && (!etapa || l.etapa === etapa)).reduce((s, l) => s + l[lado], 0);

describe('calcularMontos', () => {
  it('incluye IGV', () => expect(m(calcularMontos('INCLUYE', c(1180)))).toEqual([c(1000), c(180), c(1180)]));
  it('más IGV', () => expect(m(calcularMontos('MAS', c(1000)))).toEqual([c(1000), c(180), c(1180)]));
  it('sin IGV', () => expect(m(calcularMontos('SIN', c(500)))).toEqual([c(500), 0, c(500)]));
  it('base + IGV = total siempre', () => {
    for (let t = 1; t < 5000; t += 7) {
      const x = calcularMontos('INCLUYE', t);
      expect(x.base + x.igv).toBe(x.total);
    }
  });
});

describe('Operación de prueba simple (sección 9): comprar 10 u. del Producto B a 100 + IGV al contado', () => {
  const ls = compraMercaderia({ montos: calcularMontos('MAS', c(1000)), condicion: 'CONTADO_EFECTIVO' });
  it('provisión, destino y cancelación; total 1,180', () => {
    expect(ls.map((l) => [l.etapa, l.cuenta, l.debe, l.haber])).toEqual([
      ['PROVISION', '6011', c(1000), 0], ['PROVISION', '40111', c(180), 0], ['PROVISION', '4212', 0, c(1180)],
      ['DESTINO', '20111', c(1000), 0], ['DESTINO', '6111', 0, c(1000)],
      ['CANCELACION', '4212', c(1180), 0], ['CANCELACION', '101', 0, c(1180)],
    ]);
    expect(totales(ls).cuadra).toBe(true);
  });
});

describe('12 operaciones de regresión (LOS SISTEMÁTICOS EIRL)', () => {
  let cpu: SaldoKardex = { cantidad: 0, costo: 0 };
  let audifonos: SaldoKardex = { cantidad: 0, costo: 0 };

  it('1. aporte inicial 15,000', () => {
    const ls = aporteCapital({ tipo: 'DINERO', monto: c(15000), medio: 'EFECTIVO' });
    expect(ls).toEqual([
      { cuenta: '101', debe: c(15000), haber: 0, etapa: 'OTRO', terceroId: undefined },
      { cuenta: '501', debe: 0, haber: c(15000), etapa: 'OTRO', terceroId: undefined },
    ]);
  });

  it('2. 20 parlantes a crédito, 780 + IGV', () => {
    const mt = calcularMontos('MAS', c(20 * 780));
    expect(m(mt)).toEqual([c(15600), c(2808), c(18408)]);
    const ls = compraMercaderia({ montos: mt, condicion: 'CREDITO' });
    expect(suma(ls, '20111', 'debe', 'DESTINO')).toBe(c(15600));
    expect(ls.some((l) => l.etapa === 'CANCELACION')).toBe(false);
    expect(totales(ls).cuadra).toBe(true);
  });

  it('3. 25 CPU al contado, 1,750 c/u incluido IGV', () => {
    const mt = calcularMontos('INCLUYE', c(25 * 1750));
    expect(m(mt)).toEqual([c(37076.27), c(6673.73), c(43750)]);
    const ls = compraMercaderia({ montos: mt, condicion: 'CONTADO_EFECTIVO' });
    expect(suma(ls, '101', 'haber', 'CANCELACION')).toBe(c(43750));
    cpu = entradaKardex(cpu, 25, mt.base);
  });

  it('4. publicidad 1,150 incluido IGV, pagada', () => {
    const mt = calcularMontos('INCLUYE', c(1150));
    expect(m(mt)).toEqual([c(974.58), c(175.42), c(1150)]);
    const ls = pagoServicio({ montos: mt, condicion: 'CONTADO_EFECTIVO', cuenta: '6371', area: 'VENTAS' });
    expect(suma(ls, '95', 'debe', 'DESTINO')).toBe(c(974.58));
    expect(suma(ls, '4212', 'debe', 'CANCELACION')).toBe(c(1150));
  });

  it('5. laptop en dólares 1,320 incluido IGV, TC 3.446', () => {
    const soles = convertirASoles(c(1320), 3.446);
    const mt = calcularMontos('INCLUYE', soles);
    expect(m(mt)).toEqual([c(3854.85), c(693.87), c(4548.72)]);
    expect(totales(compraActivo({ montos: mt, condicion: 'CREDITO', cuenta: '3351' })).cuadra).toBe(true);
  });

  it('6. camioneta 37,350 más IGV, TC 3.436', () => {
    const base = convertirASoles(c(37350), 3.436);
    const mt = calcularMontos('MAS', base);
    expect(m(mt)).toEqual([c(128334.6), c(23100.23), c(151434.83)]);
    const ls = compraActivo({ montos: mt, condicion: 'CREDITO', cuenta: '3341' });
    expect(ls.some((l) => l.etapa === 'DESTINO')).toBe(false);
  });

  it('7. 3 estantes al contado, 1,825 c/u incluido IGV', () => {
    const mt = calcularMontos('INCLUYE', c(3 * 1825));
    expect(m(mt)).toEqual([c(4639.83), c(835.17), c(5475)]);
    expect(compraActivo({ montos: mt, condicion: 'CONTADO_EFECTIVO', cuenta: '3351' }).some((l) => l.cuenta === '3351')).toBe(true);
  });

  it('8. 10 CPU a crédito 90 días, 2,395 c/u incluido IGV', () => {
    const mt = calcularMontos('INCLUYE', c(10 * 2395));
    expect(m(mt)).toEqual([c(20296.61), c(3653.39), c(23950)]);
    const s = salidaKardex(cpu, 10);
    cpu = s.saldo;
    expect(s.costoSalida).toBe(c(14830.51));
    const ls = ventaMercaderia({ montos: mt, condicion: 'CREDITO', costo: s.costoSalida });
    expect(suma(ls, '6911', 'debe')).toBe(c(14830.51));
    expect(totales(ls).cuadra).toBe(true);
  });

  it('9. agua 2,987 incluido IGV, pagada', () => {
    const mt = calcularMontos('INCLUYE', c(2987));
    expect(m(mt)).toEqual([c(2531.36), c(455.64), c(2987)]);
    expect(suma(pagoServicio({ montos: mt, condicion: 'CONTADO_EFECTIVO', cuenta: '6363', area: 'ADMINISTRACION' }), '94', 'debe')).toBe(c(2531.36));
  });

  it('10. 400 audífonos al contado, 176 c/u incluido IGV', () => {
    const mt = calcularMontos('INCLUYE', c(400 * 176));
    expect(m(mt)).toEqual([c(59661.02), c(10738.98), c(70400)]);
    const ls = compraMercaderia({ montos: mt, condicion: 'CONTADO_EFECTIVO' });
    expect(suma(ls, '20111', 'debe', 'DESTINO')).toBe(c(59661.02));
    audifonos = entradaKardex(audifonos, 400, mt.base);
  });

  it('11. 100 audífonos a Logitec al contado, 220 c/u incluido IGV', () => {
    const mt = calcularMontos('INCLUYE', c(100 * 220));
    expect(m(mt)).toEqual([c(18644.07), c(3355.93), c(22000)]);
    const s = salidaKardex(audifonos, 100);
    expect(s.costoSalida).toBe(c(14915.25));
    const ls = ventaMercaderia({ montos: mt, condicion: 'CONTADO_EFECTIVO', costo: s.costoSalida });
    expect(suma(ls, '101', 'debe', 'CANCELACION')).toBe(c(22000));
    expect(totales(ls).cuadra).toBe(true);
  });

  it('12. aumento de capital 150,000', () => {
    const ls = aporteCapital({ tipo: 'DINERO', monto: c(150000), medio: 'EFECTIVO', aumento: true });
    expect(ls.map((l) => [l.cuenta, l.debe, l.haber])).toEqual([['101', c(150000), 0], ['5221', 0, c(150000)]]);
  });
});

describe('Kárdex', () => {
  it('rechaza vender más stock del que hay', () => expect(() => salidaKardex({ cantidad: 5, costo: 500 }, 6)).toThrow(/Stock insuficiente/));
  it('vaciar el stock salda el costo', () => expect(salidaKardex({ cantidad: 3, costo: 1000 }, 3).saldo).toEqual({ cantidad: 0, costo: 0 }));
});

describe('Honorarios, planilla, depreciación, IGV y venta de activos', () => {
  it('retención 8% solo sobre S/ 1,500', () => {
    expect(retencionHonorarios(c(1500))).toBe(0);
    expect(retencionHonorarios(c(2000))).toBe(c(160));
  });
  it('honorarios con retención cuadran', () => {
    const ls = honorarios({ bruto: c(2000), retencion: c(160), area: 'ADMINISTRACION', pagado: true });
    expect(suma(ls, '4241', 'haber')).toBe(c(1840));
    expect(totales(ls).cuadra).toBe(true);
  });
  it('planilla ONP/AFP cuadra y el destino incluye ESSALUD', () => {
    const ls = planilla([{ sueldo: c(2000), pension: 'ONP' }, { sueldo: c(3000), pension: 'AFP' }], 'ADMINISTRACION');
    expect(totales(ls).cuadra).toBe(true);
    expect(suma(ls, '94', 'debe')).toBe(c(5000) + c(450));
    expect(suma(ls, '40321', 'haber')).toBe(c(260));
  });
  it('depreciación mensual no excede el valor', () => {
    const ls = depreciacionMes([{ cuenta: '3341', valor: c(12000), depreciado: 0, tasaAnual: 0.2 }], 'ADMINISTRACION');
    expect(suma(ls, '6814', 'debe')).toBe(c(200));
    expect(suma(ls, '3913', 'haber')).toBe(c(200));
    expect(depreciacionMes([{ cuenta: '3341', valor: c(100), depreciado: c(100), tasaAnual: 0.2 }], 'ADMINISTRACION')).toEqual([]);
  });
  it('liquidación de IGV: a pagar y a favor', () => {
    const pagar = liquidacionIgv(c(500), c(200));
    expect(totales(pagar).cuadra).toBe(true);
    expect(suma(pagar, '4011', 'haber')).toBe(c(300));
    const favor = liquidacionIgv(c(100), c(250));
    expect(totales(favor).cuadra).toBe(true);
    expect(suma(favor, '4011', 'debe')).toBe(c(150));
  });
  it('venta de activo: baja con depreciación acumulada y valor en libros', () => {
    const mt = calcularMontos('INCLUYE', c(5900));
    const ls = ventaActivo({ montos: mt, condicion: 'CONTADO_EFECTIVO', cuentaActivo: '3341', costoHistorico: c(10000), depreciacionAcumulada: c(4000) });
    expect(suma(ls, '655', 'debe')).toBe(c(6000));
    expect(totales(ls).cuadra).toBe(true);
  });
  it('plantillas especiales cuadran', () => {
    const mt = calcularMontos('INCLUYE', c(1180));
    for (const ls of [
      PLANTILLAS.notaCreditoEmitida(mt), PLANTILLAS.rebajaConcedida(mt), PLANTILLAS.devolucionCompra(mt), PLANTILLAS.anticipoCliente(mt, 'BANCO'),
      PLANTILLAS.anticipoProveedor(c(500), 'BANCO'), PLANTILLAS.prestamoRecibido(c(10000)), PLANTILLAS.pagoCuotaPrestamo(c(800), c(200)),
      PLANTILLAS.dividendos(c(3000)), PLANTILLAS.pagoDividendos(c(3000)),
    ]) expect(totales(ls).cuadra).toBe(true);
  });
});

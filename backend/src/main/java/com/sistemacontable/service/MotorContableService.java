package com.sistemacontable.service;

import com.sistemacontable.dto.PrevisualizarResponseDto;
import com.sistemacontable.entity.Cuenta;
import com.sistemacontable.repository.CuentaRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MotorContableService {

    private final CuentaRepository cuentaRepository;

    public MotorContableService(CuentaRepository cuentaRepository) {
        this.cuentaRepository = cuentaRepository;
    }

    public PrevisualizarResponseDto previsualizar(String tipoOperacion, Map<String, Object> datos) {
        List<PrevisualizarResponseDto.LineaVistaDto> lineas = new ArrayList<>();

        BigDecimal base = parseBigDecimal(datos.get("base"));
        BigDecimal igv = parseBigDecimal(datos.get("igv"));
        BigDecimal total = parseBigDecimal(datos.get("total"));
        if (total.compareTo(BigDecimal.ZERO) == 0 && base.compareTo(BigDecimal.ZERO) > 0) {
            if (igv.compareTo(BigDecimal.ZERO) == 0) {
                igv = base.multiply(new BigDecimal("0.18")).setScale(2, RoundingMode.HALF_UP);
            }
            total = base.add(igv);
        }

        String glosa = datos.get("glosa") != null ? datos.get("glosa").toString() : "Operación contable";
        String terceroNombre = datos.get("nombreTercero") != null ? datos.get("nombreTercero").toString() : "";
        String condicion = datos.get("condicion") != null ? datos.get("condicion").toString() : "CREDITO";

        if ("COMPRA_MERCADERIA".equalsIgnoreCase(tipoOperacion)) {
            String cuentaGasto = datos.get("cuentaGasto") != null ? datos.get("cuentaGasto").toString() : "6011";
            // Provisión
            lineas.add(crearLinea(cuentaGasto, base, BigDecimal.ZERO, "PROVISION", terceroNombre, glosa));
            if (igv.compareTo(BigDecimal.ZERO) > 0) {
                lineas.add(crearLinea("40111", igv, BigDecimal.ZERO, "PROVISION", terceroNombre, glosa));
            }
            lineas.add(crearLinea("4212", BigDecimal.ZERO, total, "PROVISION", terceroNombre, glosa));

            // Destino
            lineas.add(crearLinea("20111", base, BigDecimal.ZERO, "DESTINO", null, "Destino mercaderías"));
            lineas.add(crearLinea("6111", BigDecimal.ZERO, base, "DESTINO", null, "Variación de inventarios"));

            // Cancelación si contado
            if (condicion.startsWith("CONTADO")) {
                String ctaCaja = "CONTADO_EFECTIVO".equals(condicion) ? "101" : "1041";
                lineas.add(crearLinea("4212", total, BigDecimal.ZERO, "CANCELACION", terceroNombre, "Cancelación compra"));
                lineas.add(crearLinea(ctaCaja, BigDecimal.ZERO, total, "CANCELACION", null, "Pago compra"));
            }
        } else if ("VENTA_MERCADERIA".equalsIgnoreCase(tipoOperacion)) {
            String cuentaIngreso = datos.get("cuentaIngreso") != null ? datos.get("cuentaIngreso").toString() : "70121";
            // Provisión
            lineas.add(crearLinea("1212", total, BigDecimal.ZERO, "PROVISION", terceroNombre, glosa));
            if (igv.compareTo(BigDecimal.ZERO) > 0) {
                lineas.add(crearLinea("40111", BigDecimal.ZERO, igv, "PROVISION", null, glosa));
            }
            lineas.add(crearLinea(cuentaIngreso, BigDecimal.ZERO, base, "PROVISION", null, glosa));

            // Cancelación si contado
            if (condicion.startsWith("CONTADO")) {
                String ctaCaja = "CONTADO_EFECTIVO".equals(condicion) ? "101" : "1041";
                lineas.add(crearLinea(ctaCaja, total, BigDecimal.ZERO, "CANCELACION", null, "Cobro venta"));
                lineas.add(crearLinea("1212", BigDecimal.ZERO, total, "CANCELACION", terceroNombre, "Cancelación cobro"));
            }
        } else if ("COBRO_CLIENTE".equalsIgnoreCase(tipoOperacion)) {
            BigDecimal monto = parseBigDecimal(datos.get("monto"));
            String ctaCaja = "EFECTIVO".equalsIgnoreCase(String.valueOf(datos.get("medio"))) ? "101" : "1041";
            lineas.add(crearLinea(ctaCaja, monto, BigDecimal.ZERO, "CANCELACION", null, glosa));
            lineas.add(crearLinea("1212", BigDecimal.ZERO, monto, "CANCELACION", terceroNombre, glosa));
        } else if ("PAGO_PROVEEDOR".equalsIgnoreCase(tipoOperacion)) {
            BigDecimal monto = parseBigDecimal(datos.get("monto"));
            String ctaCaja = "EFECTIVO".equalsIgnoreCase(String.valueOf(datos.get("medio"))) ? "101" : "1041";
            lineas.add(crearLinea("4212", monto, BigDecimal.ZERO, "CANCELACION", terceroNombre, glosa));
            lineas.add(crearLinea(ctaCaja, BigDecimal.ZERO, monto, "CANCELACION", null, glosa));
        } else {
            // Operación genérica o manual
            lineas.add(crearLinea("101", total, BigDecimal.ZERO, "PROVISION", terceroNombre, glosa));
            lineas.add(crearLinea("5011", BigDecimal.ZERO, total, "PROVISION", null, glosa));
        }

        BigDecimal totDebe = BigDecimal.ZERO;
        BigDecimal totHaber = BigDecimal.ZERO;
        for (PrevisualizarResponseDto.LineaVistaDto l : lineas) {
            totDebe = totDebe.add(l.getDebe());
            totHaber = totHaber.add(l.getHaber());
        }

        boolean cuadra = totDebe.compareTo(totHaber) == 0;
        PrevisualizarResponseDto.TotalesDto totales = new PrevisualizarResponseDto.TotalesDto(totDebe, totHaber, cuadra);

        return new PrevisualizarResponseDto(lineas, totales);
    }

    private PrevisualizarResponseDto.LineaVistaDto crearLinea(String cuentaCodigo, BigDecimal debe, BigDecimal haber, String etapa, String terceroNombre, String glosa) {
        String nombre = cuentaRepository.findById(cuentaCodigo).map(Cuenta::getNombre).orElse("Cuenta " + cuentaCodigo);
        return new PrevisualizarResponseDto.LineaVistaDto(cuentaCodigo, nombre, debe, haber, etapa, terceroNombre, glosa);
    }

    private BigDecimal parseBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        try {
            return new BigDecimal(val.toString());
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}
